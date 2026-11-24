<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/product_options.php';
init_api();

$pdo = get_db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id > 0) {
        $stmt = $pdo->prepare(
            "SELECT sp.*, dm.slug AS danh_muc_slug, dm.ten_danh_muc,
                    (SELECT ha.duong_dan FROM HinhAnhSanPham ha
                     WHERE ha.ma_san_pham = sp.ma_san_pham
                     ORDER BY ha.la_anh_chinh DESC, ha.ma_hinh_anh DESC LIMIT 1) AS anh_chinh,
                    COALESCE((SELECT AVG(dg.so_sao) FROM DanhGia dg WHERE dg.ma_san_pham = sp.ma_san_pham), 0) AS diem_trung_binh,
                    (SELECT COUNT(*) FROM DanhGia dg WHERE dg.ma_san_pham = sp.ma_san_pham) AS so_danh_gia
             FROM SanPham sp
             JOIN DanhMuc dm ON dm.ma_danh_muc = sp.ma_danh_muc
             WHERE sp.ma_san_pham = ?
             LIMIT 1"
        );
        $stmt->execute([$id]);
        $product = $stmt->fetch();
        if (!$product) {
            json_error('Không tìm thấy sản phẩm.', 404);
        }

        $imgStmt = $pdo->prepare('SELECT ma_hinh_anh, duong_dan, la_anh_chinh FROM HinhAnhSanPham WHERE ma_san_pham = ? ORDER BY la_anh_chinh DESC, ma_hinh_anh DESC');
        $imgStmt->execute([$id]);
        $product['hinh_anh'] = $imgStmt->fetchAll();

        $revStmt = $pdo->prepare(
            "SELECT dg.ma_danh_gia, dg.so_sao, dg.noi_dung, dg.hinh_anh, dg.ngay_tao, kh.ho_ten
             FROM DanhGia dg
             JOIN KhachHang kh ON kh.ma_khach_hang = dg.ma_khach_hang
             WHERE dg.ma_san_pham = ?
             ORDER BY dg.ngay_tao DESC"
        );
        $revStmt->execute([$id]);
        $product['danh_gia'] = $revStmt->fetchAll();
        $product['tuy_chon'] = get_product_options_schema($product);

        json_response(['product' => $product]);
    }

    $where = [];
    $params = [];

    $includeInactive = ($_GET['include_inactive'] ?? '0') === '1';
    $user = current_user($pdo);
    if (!$includeInactive || !$user || !in_array($user['role'], ['admin', 'nhan_vien'], true)) {
        $where[] = "sp.trang_thai = 'active'";
    }

    if (!empty($_GET['category']) && $_GET['category'] !== 'all') {
        $cat = trim((string)$_GET['category']);
        if (ctype_digit($cat)) {
            $where[] = 'sp.ma_danh_muc = ?';
            $params[] = (int)$cat;
        } else {
            $where[] = 'dm.slug = ?';
            $params[] = $cat;
        }
    }

    if (!empty($_GET['pet_type']) && $_GET['pet_type'] !== 'all') {
        $petType = trim((string)$_GET['pet_type']);
        if (in_array($petType, ['cho', 'meo'], true)) {
            $where[] = "(sp.loai_thu_cung = ? OR sp.loai_thu_cung = 'ca_hai')";
            $params[] = $petType;
        } else {
            $where[] = 'sp.loai_thu_cung = ?';
            $params[] = $petType;
        }
    }

    if (isset($_GET['min_price']) && $_GET['min_price'] !== '') {
        $where[] = 'sp.gia >= ?';
        $params[] = (float)$_GET['min_price'];
    }
    if (isset($_GET['max_price']) && $_GET['max_price'] !== '') {
        $where[] = 'sp.gia <= ?';
        $params[] = (float)$_GET['max_price'];
    }

    if (!empty($_GET['search'])) {
        $kw = '%' . trim((string)$_GET['search']) . '%';
        $where[] = '(sp.ten_san_pham LIKE ? OR sp.mo_ta LIKE ? OR dm.ten_danh_muc LIKE ?)';
        $params[] = $kw;
        $params[] = $kw;
        $params[] = $kw;
    }

    $sql = "SELECT sp.ma_san_pham, sp.ma_danh_muc, sp.ten_san_pham, sp.mo_ta, sp.loai_thu_cung,
                   sp.gia, sp.ton_kho, sp.bieu_tuong, sp.trang_thai, sp.created_at,
                   dm.slug AS danh_muc_slug, dm.ten_danh_muc,
                   (SELECT ha.duong_dan FROM HinhAnhSanPham ha
                    WHERE ha.ma_san_pham = sp.ma_san_pham
                    ORDER BY ha.la_anh_chinh DESC, ha.ma_hinh_anh DESC LIMIT 1) AS anh_chinh,
                   COALESCE((SELECT AVG(dg.so_sao) FROM DanhGia dg WHERE dg.ma_san_pham = sp.ma_san_pham), 0) AS diem_trung_binh,
                   (SELECT COUNT(*) FROM DanhGia dg WHERE dg.ma_san_pham = sp.ma_san_pham) AS so_danh_gia
            FROM SanPham sp
            JOIN DanhMuc dm ON dm.ma_danh_muc = sp.ma_danh_muc";

    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= $includeInactive
        ? ' ORDER BY sp.ma_san_pham DESC'
        : ' ORDER BY (CASE WHEN sp.ton_kho > 0 THEN 0 ELSE 1 END) ASC, sp.ma_san_pham DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll();
    foreach ($products as &$p) {
        $p['tuy_chon'] = get_product_options_schema($p);
    }
    unset($p);
    json_response(['products' => $products]);
}

if ($method === 'POST') {
    require_role(['admin', 'nhan_vien'], $pdo);
    $in = get_json_input();

    $ten = trim((string)($in['ten_san_pham'] ?? ''));
    $maDanhMuc = (int)($in['ma_danh_muc'] ?? 0);
    $categorySlug = trim((string)($in['danh_muc_slug'] ?? ''));
    $moTa = trim((string)($in['mo_ta'] ?? ''));
    $loaiThuCung = (string)($in['loai_thu_cung'] ?? 'ca_hai');
    $gia = (float)($in['gia'] ?? 0);
    $tonKho = (int)($in['ton_kho'] ?? 0);
    $bieuTuong = trim((string)($in['bieu_tuong'] ?? '🦴')) ?: '🦴';
    $anhChinh = trim((string)($in['anh_chinh'] ?? ''));

    if ($maDanhMuc <= 0 && $categorySlug !== '') {
        $cStmt = $pdo->prepare('SELECT ma_danh_muc FROM DanhMuc WHERE slug = ? LIMIT 1');
        $cStmt->execute([$categorySlug]);
        $maDanhMuc = (int)$cStmt->fetchColumn();
    }

    if ($ten === '' || $maDanhMuc <= 0) {
        json_error('Vui lòng nhập tên sản phẩm và chọn danh mục.');
    }
    if ($gia < 1000 || $tonKho < 0) {
        json_error('Giá bán phải từ 1.000 ₫ trở lên và tồn kho không âm.');
    }
    if (!in_array($loaiThuCung, ['cho', 'meo', 'ca_hai', 'khac'], true)) {
        $loaiThuCung = 'ca_hai';
    }

    $stmt = $pdo->prepare(
        "INSERT INTO SanPham (ma_danh_muc, ten_san_pham, mo_ta, loai_thu_cung, gia, ton_kho, bieu_tuong, trang_thai)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')"
    );
    $stmt->execute([$maDanhMuc, $ten, $moTa, $loaiThuCung, $gia, $tonKho, $bieuTuong]);
    $newId = (int)$pdo->lastInsertId();

    if ($anhChinh !== '') {
        $pdo->prepare('INSERT INTO HinhAnhSanPham (ma_san_pham, duong_dan, la_anh_chinh) VALUES (?, ?, 1)')
            ->execute([$newId, $anhChinh]);
    }

    json_response([
        'message' => 'Đã thêm sản phẩm mới thành công!',
        'ma_san_pham' => $newId,
    ], 201);
}

if ($method === 'PUT') {
    require_role(['admin', 'nhan_vien'], $pdo);
    $in = get_json_input();
    $id = (int)($in['ma_san_pham'] ?? 0);
    if ($id <= 0) {
        json_error('Thiếu mã sản phẩm cần cập nhật.');
    }

    $curStmt = $pdo->prepare('SELECT * FROM SanPham WHERE ma_san_pham = ?');
    $curStmt->execute([$id]);
    $cur = $curStmt->fetch();
    if (!$cur) {
        json_error('Không tìm thấy sản phẩm.', 404);
    }

    $ten = trim((string)($in['ten_san_pham'] ?? $cur['ten_san_pham']));
    $maDanhMuc = isset($in['ma_danh_muc']) ? (int)$in['ma_danh_muc'] : (int)$cur['ma_danh_muc'];
    $moTa = array_key_exists('mo_ta', $in) ? trim((string)$in['mo_ta']) : (string)$cur['mo_ta'];
    $loaiThuCung = (string)($in['loai_thu_cung'] ?? $cur['loai_thu_cung']);
    $gia = isset($in['gia']) ? (float)$in['gia'] : (float)$cur['gia'];
    $tonKho = isset($in['ton_kho']) ? (int)$in['ton_kho'] : (int)$cur['ton_kho'];
    $bieuTuong = trim((string)($in['bieu_tuong'] ?? $cur['bieu_tuong'])) ?: $cur['bieu_tuong'];
    $trangThai = (string)($in['trang_thai'] ?? $cur['trang_thai']);

    if ($ten === '' || $gia < 1000 || $tonKho < 0) {
        json_error('Dữ liệu sản phẩm không hợp lệ.');
    }
    if (!in_array($loaiThuCung, ['cho', 'meo', 'ca_hai', 'khac'], true)) {
        $loaiThuCung = 'ca_hai';
    }
    if (!in_array($trangThai, ['active', 'inactive'], true)) {
        $trangThai = 'active';
    }

    $stmt = $pdo->prepare(
        "UPDATE SanPham
         SET ma_danh_muc = ?, ten_san_pham = ?, mo_ta = ?, loai_thu_cung = ?, gia = ?, ton_kho = ?, bieu_tuong = ?, trang_thai = ?
         WHERE ma_san_pham = ?"
    );
    $stmt->execute([$maDanhMuc, $ten, $moTa, $loaiThuCung, $gia, $tonKho, $bieuTuong, $trangThai, $id]);

    if (!empty($in['anh_chinh'])) {
        $pdo->prepare('UPDATE HinhAnhSanPham SET la_anh_chinh = 0 WHERE ma_san_pham = ?')->execute([$id]);
        $pdo->prepare('INSERT INTO HinhAnhSanPham (ma_san_pham, duong_dan, la_anh_chinh) VALUES (?, ?, 1)')
            ->execute([$id, trim((string)$in['anh_chinh'])]);
    } elseif (!empty($in['xoa_anh_chinh'])) {
        $pdo->prepare('DELETE FROM HinhAnhSanPham WHERE ma_san_pham = ?')->execute([$id]);
    }

    json_response(['message' => 'Đã cập nhật thông tin sản phẩm.']);
}

if ($method === 'DELETE') {
    require_role(['admin', 'nhan_vien'], $pdo);
    $id = (int)($_GET['id'] ?? (get_json_input()['ma_san_pham'] ?? 0));
    if ($id <= 0) {
        json_error('Thiếu mã sản phẩm cần xóa.');
    }

    // Nếu sản phẩm đã có trong đơn hàng, ẩn (ngưng bán) để giữ toàn vẹn lịch sử đơn hàng
    $used = $pdo->prepare('SELECT COUNT(*) FROM ChiTietDonHang WHERE ma_san_pham = ?');
    $used->execute([$id]);
    if ((int)$used->fetchColumn() > 0) {
        $pdo->prepare("UPDATE SanPham SET trang_thai = 'inactive' WHERE ma_san_pham = ?")->execute([$id]);
        json_response(['message' => 'Sản phẩm đã phát sinh đơn hàng nên được chuyển sang trạng thái Ngưng bán để bảo toàn lịch sử.']);
    }

    $pdo->prepare('DELETE FROM SanPham WHERE ma_san_pham = ?')->execute([$id]);
    json_response(['message' => 'Đã xóa sản phẩm khỏi kho hàng.']);
}

json_error('Phương thức không được hỗ trợ.', 405);
