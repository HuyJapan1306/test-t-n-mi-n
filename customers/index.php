<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

$pdo = get_db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    require_role(['admin', 'nhan_vien'], $pdo);

    if (!empty($_GET['id'])) {
        $cid = (int)$_GET['id'];
        $stmt = $pdo->prepare(
            "SELECT kh.*, tk.trang_thai AS trang_thai_tai_khoan
             FROM KhachHang kh
             LEFT JOIN TaiKhoan tk ON tk.ma_tai_khoan = kh.ma_tai_khoan
             WHERE kh.ma_khach_hang = ?"
        );
        $stmt->execute([$cid]);
        $customer = $stmt->fetch();
        if (!$customer) {
            json_error('Không tìm thấy khách hàng.', 404);
        }

        $oStmt = $pdo->prepare('SELECT ma_don_hang, ma_don_code, ngay_dat, tong_tien, trang_thai FROM DonHang WHERE ma_khach_hang = ? ORDER BY ngay_dat DESC');
        $oStmt->execute([$cid]);
        $customer['don_hang'] = $oStmt->fetchAll();

        $pStmt = $pdo->prepare('SELECT * FROM ThuCung WHERE ma_khach_hang = ? ORDER BY ma_thu_cung DESC');
        $pStmt->execute([$cid]);
        $customer['thu_cung'] = $pStmt->fetchAll();

        json_response(['customer' => $customer]);
    }

    $where = [];
    $params = [];
    if (!empty($_GET['search'])) {
        $kw = '%' . trim((string)$_GET['search']) . '%';
        $where[] = '(kh.ho_ten LIKE ? OR kh.so_dien_thoai LIKE ? OR kh.email LIKE ?)';
        $params[] = $kw;
        $params[] = $kw;
        $params[] = $kw;
    }

    $sql = "SELECT kh.ma_khach_hang, kh.ma_tai_khoan, kh.ho_ten, kh.so_dien_thoai, kh.email, kh.dia_chi, kh.created_at,
                   COALESCE(tk.trang_thai, 'guest') AS trang_thai_tai_khoan,
                   (SELECT GROUP_CONCAT(CONCAT(tc.bieu_tuong, ' ', tc.ten_thu_cung) SEPARATOR ', ') FROM ThuCung tc WHERE tc.ma_khach_hang = kh.ma_khach_hang) AS danh_sach_thu_cung,
                   (SELECT COUNT(*) FROM DonHang dh WHERE dh.ma_khach_hang = kh.ma_khach_hang) AS so_don_hang,
                   COALESCE((SELECT SUM(dh.tong_tien) FROM DonHang dh WHERE dh.ma_khach_hang = kh.ma_khach_hang AND dh.trang_thai <> 'cancelled'), 0) AS tong_chi_tieu
            FROM KhachHang kh
            LEFT JOIN TaiKhoan tk ON tk.ma_tai_khoan = kh.ma_tai_khoan";
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY kh.ma_khach_hang DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    json_response(['customers' => $stmt->fetchAll()]);
}

if ($method === 'PUT') {
    $in = get_json_input();

    // Trường hợp 1: Chỉnh sửa thông tin chi tiết khách hàng (Admin & Nhân viên)
    if (!empty($in['ma_khach_hang'])) {
        require_role(['admin', 'nhan_vien'], $pdo);
        $cid = (int)$in['ma_khach_hang'];

        $curStmt = $pdo->prepare('SELECT * FROM KhachHang WHERE ma_khach_hang = ? LIMIT 1');
        $curStmt->execute([$cid]);
        $cur = $curStmt->fetch();
        if (!$cur) {
            json_error('Không tìm thấy khách hàng.', 404);
        }

        $hoTen = trim((string)($in['ho_ten'] ?? $cur['ho_ten']));
        $phone = trim((string)($in['so_dien_thoai'] ?? $cur['so_dien_thoai']));
        $email = strtolower(trim((string)($in['email'] ?? ($cur['email'] ?? ''))));
        $diaChi = trim((string)($in['dia_chi'] ?? ($cur['dia_chi'] ?? '')));

        if ($hoTen === '' || mb_strlen($hoTen) < 2) {
            json_error('Họ tên khách hàng phải có ít nhất 2 ký tự.');
        }
        $digits = clean_phone($phone);
        if (strlen($digits) < 9 || strlen($digits) > 15) {
            json_error('Số điện thoại phải gồm 9–15 chữ số.');
        }
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_error('Địa chỉ email không hợp lệ.');
        }

        try {
            $pdo->beginTransaction();

            // Nếu khách hàng có tài khoản và đổi email -> kiểm tra trùng và đồng bộ bảng TaiKhoan
            if (!empty($cur['ma_tai_khoan']) && $email !== '') {
                $dup = $pdo->prepare('SELECT ma_tai_khoan FROM TaiKhoan WHERE email = ? AND ma_tai_khoan <> ? LIMIT 1');
                $dup->execute([$email, (int)$cur['ma_tai_khoan']]);
                if ($dup->fetch()) {
                    $pdo->rollBack();
                    json_error('Email này đã được sử dụng bởi tài khoản khác.', 409);
                }
                $pdo->prepare('UPDATE TaiKhoan SET email = ? WHERE ma_tai_khoan = ?')
                    ->execute([$email, (int)$cur['ma_tai_khoan']]);
            }

            $pdo->prepare(
                "UPDATE KhachHang
                 SET ho_ten = ?, so_dien_thoai = ?, email = ?, dia_chi = ?
                 WHERE ma_khach_hang = ?"
            )->execute([$hoTen, $phone, $email !== '' ? $email : null, $diaChi, $cid]);

            $pdo->commit();
            json_response(['message' => 'Đã cập nhật thông tin khách hàng thành công!']);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            json_error('Không thể cập nhật thông tin khách hàng: ' . $e->getMessage(), 500);
        }
    }

    // Trường hợp 2: Khóa / mở khóa tài khoản khách hàng (Chỉ Admin)
    require_role(['admin'], $pdo);
    $accountId = (int)($in['ma_tai_khoan'] ?? 0);
    $status = (string)($in['trang_thai'] ?? '');

    if ($accountId <= 0 || !in_array($status, ['active', 'locked'], true)) {
        json_error('Thông tin cập nhật trạng thái tài khoản khách hàng không hợp lệ.');
    }

    $pdo->prepare('UPDATE TaiKhoan SET trang_thai = ? WHERE ma_tai_khoan = ?')->execute([$status, $accountId]);
    json_response(['message' => $status === 'locked' ? 'Đã khóa tài khoản khách hàng.' : 'Đã mở khóa tài khoản khách hàng.']);
}

json_error('Phương thức không được hỗ trợ.', 405);
