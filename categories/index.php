<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

$pdo = get_db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $stmt = $pdo->query(
        "SELECT dm.ma_danh_muc, dm.slug, dm.ten_danh_muc, dm.mo_ta, dm.bieu_tuong, dm.hinh_anh,
                COUNT(CASE WHEN sp.trang_thai = 'active' THEN 1 END) AS so_san_pham
         FROM DanhMuc dm
         LEFT JOIN SanPham sp ON sp.ma_danh_muc = dm.ma_danh_muc
         GROUP BY dm.ma_danh_muc
         ORDER BY dm.ma_danh_muc ASC"
    );
    json_response(['categories' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    require_role(['admin', 'nhan_vien'], $pdo);
    $in = get_json_input();
    $ten = trim((string)($in['ten_danh_muc'] ?? ''));
    $moTa = trim((string)($in['mo_ta'] ?? ''));
    $bieuTuong = trim((string)($in['bieu_tuong'] ?? '🐾')) ?: '🐾';
    $slug = trim((string)($in['slug'] ?? ''));

    if ($ten === '') {
        json_error('Tên danh mục không được để trống.');
    }

    if ($slug === '') {
        $slug = preg_replace('/[^a-z0-9]+/', '-', normalize_vi($ten));
        $slug = trim((string)$slug, '-') ?: ('cat-' . time());
    }

    $dup = $pdo->prepare('SELECT ma_danh_muc FROM DanhMuc WHERE slug = ? LIMIT 1');
    $dup->execute([$slug]);
    if ($dup->fetch()) {
        $slug .= '-' . random_int(10, 99);
    }

    $stmt = $pdo->prepare('INSERT INTO DanhMuc (slug, ten_danh_muc, mo_ta, bieu_tuong) VALUES (?, ?, ?, ?)');
    $stmt->execute([$slug, $ten, $moTa, $bieuTuong]);

    json_response([
        'message' => 'Đã thêm danh mục mới.',
        'ma_danh_muc' => (int)$pdo->lastInsertId(),
    ], 201);
}

if ($method === 'PUT') {
    require_role(['admin', 'nhan_vien'], $pdo);
    $in = get_json_input();
    $id = (int)($in['ma_danh_muc'] ?? 0);
    $ten = trim((string)($in['ten_danh_muc'] ?? ''));
    $moTa = trim((string)($in['mo_ta'] ?? ''));
    $bieuTuong = trim((string)($in['bieu_tuong'] ?? '🐾')) ?: '🐾';

    if ($id <= 0 || $ten === '') {
        json_error('Thiếu mã danh mục hoặc tên danh mục.');
    }

    $stmt = $pdo->prepare('UPDATE DanhMuc SET ten_danh_muc = ?, mo_ta = ?, bieu_tuong = ? WHERE ma_danh_muc = ?');
    $stmt->execute([$ten, $moTa, $bieuTuong, $id]);

    json_response(['message' => 'Đã cập nhật danh mục.']);
}

if ($method === 'DELETE') {
    require_role(['admin'], $pdo);
    $id = (int)($_GET['id'] ?? (get_json_input()['ma_danh_muc'] ?? 0));
    if ($id <= 0) {
        json_error('Thiếu mã danh mục.');
    }

    $cnt = $pdo->prepare('SELECT COUNT(*) FROM SanPham WHERE ma_danh_muc = ?');
    $cnt->execute([$id]);
    if ((int)$cnt->fetchColumn() > 0) {
        json_error('Không thể xóa danh mục đang có sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước.', 409);
    }

    $pdo->prepare('DELETE FROM DanhMuc WHERE ma_danh_muc = ?')->execute([$id]);
    json_response(['message' => 'Đã xóa danh mục.']);
}

json_error('Phương thức không được hỗ trợ.', 405);
