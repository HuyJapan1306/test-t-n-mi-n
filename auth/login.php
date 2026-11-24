<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_error('Phương thức không hợp lệ.', 405);
}

check_rate_limit('login', 15, 60);

$in = get_json_input();
$identifier = trim((string)($in['identifier'] ?? $in['email'] ?? ''));
$password = (string)($in['mat_khau'] ?? $in['password'] ?? '');

if ($identifier === '' || $password === '') {
    json_error('Vui lòng nhập đầy đủ thông tin đăng nhập và mật khẩu.');
}

$pdo = get_db();
$digits = clean_phone($identifier);

$sql = "SELECT tk.ma_tai_khoan, tk.mat_khau, tk.trang_thai, q.ten_quyen
        FROM TaiKhoan tk
        JOIN Quyen q ON q.ma_quyen = tk.ma_quyen
        LEFT JOIN KhachHang kh ON kh.ma_tai_khoan = tk.ma_tai_khoan
        LEFT JOIN NhanVien nv ON nv.ma_tai_khoan = tk.ma_tai_khoan
        WHERE LOWER(tk.email) = LOWER(?)
           OR LOWER(tk.ten_dang_nhap) = LOWER(?)
           OR (? <> '' AND (REPLACE(REPLACE(REPLACE(kh.so_dien_thoai, ' ', ''), '-', ''), '.', '') = ?
                         OR REPLACE(REPLACE(REPLACE(nv.so_dien_thoai, ' ', ''), '-', ''), '.', '') = ?))
        LIMIT 1";

$stmt = $pdo->prepare($sql);
$stmt->execute([$identifier, $identifier, $digits, $digits, $digits]);
$acc = $stmt->fetch();

if (!$acc || !password_verify($password, (string)$acc['mat_khau'])) {
    json_error('Email/số điện thoại hoặc mật khẩu không chính xác.', 401);
}

if ($acc['trang_thai'] !== 'active') {
    json_error('Tài khoản của bạn hiện đang bị khóa. Vui lòng liên hệ quản trị viên.', 403);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int)$acc['ma_tai_khoan'];
$user = current_user($pdo);

json_response([
    'message' => 'Đăng nhập thành công!',
    'user' => $user,
    'redirect' => in_array($user['role'], ['admin', 'nhan_vien'], true) ? 'index.html' : 'customer.html',
]);
