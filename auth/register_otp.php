<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/sms.php';
init_api();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_error('Phương thức không hợp lệ.', 405);
}

check_rate_limit('register_otp', 8, 60);

$in = get_json_input();
$hoTen = trim((string)($in['ho_ten'] ?? ''));
$email = strtolower(trim((string)($in['email'] ?? '')));
$phone = trim((string)($in['so_dien_thoai'] ?? ''));
$matKhau = (string)($in['mat_khau'] ?? '');

if ($hoTen === '' || mb_strlen($hoTen) < 2) {
    json_error('Vui lòng nhập họ và tên hợp lệ.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('Địa chỉ email không hợp lệ.');
}
$digits = clean_phone($phone);
if (strlen($digits) < 9 || strlen($digits) > 15) {
    json_error('Số điện thoại phải gồm 9–15 chữ số.');
}
if (strlen($matKhau) < 6) {
    json_error('Mật khẩu cần tối thiểu 6 ký tự.');
}

$pdo = get_db();

// Kiểm tra trùng Email (không làm lộ thông tin tài khoản cũ)
$dupEmail = $pdo->prepare('SELECT ma_tai_khoan FROM TaiKhoan WHERE email = ? OR ten_dang_nhap = ? LIMIT 1');
$dupEmail->execute([$email, $email]);
if ($dupEmail->fetch()) {
    json_error('Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.', 409);
}

// Kiểm tra trùng Số điện thoại đã có tài khoản (bảo mật: không tiết lộ tên hay email chủ SĐT)
$dupPhone = $pdo->prepare(
    "SELECT ma_khach_hang FROM KhachHang
     WHERE ma_tai_khoan IS NOT NULL
       AND REPLACE(REPLACE(REPLACE(so_dien_thoai, ' ', ''), '-', ''), '.', '') = ?
     LIMIT 1"
);
$dupPhone->execute([$digits]);
if ($dupPhone->fetch()) {
    json_error('Số điện thoại này đã được đăng ký tài khoản. Vui lòng đăng nhập hoặc dùng số khác.', 409);
}

$cooldown = 30;
$prev = $_SESSION['reg_phone_otp'] ?? null;
if (is_array($prev) && ($prev['phone_digits'] ?? '') === $digits) {
    $elapsed = time() - (int)($prev['sent_at'] ?? 0);
    if ($elapsed < $cooldown) {
        $wait = $cooldown - $elapsed;
        json_error("Vui lòng đợi {$wait} giây trước khi gửi lại mã OTP.", 429);
    }
}

$otp = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$delivery = send_sms_otp($pdo, $digits, $otp);

if ($delivery['status'] === 'failed') {
    json_error('Không thể gửi tin nhắn SMS OTP lúc này: ' . $delivery['note'], 502);
}

$_SESSION['reg_phone_otp'] = [
    'phone_digits' => $digits,
    'email' => $email,
    'code_hash' => password_hash($otp, PASSWORD_DEFAULT),
    'expires_at' => time() + 300,
    'sent_at' => time(),
    'attempts' => 0,
];

$payload = [
    'message' => "Đã gửi mã OTP 6 chữ số tới số điện thoại {$delivery['masked_phone']}.",
    'masked_phone' => $delivery['masked_phone'],
    'delivery_status' => $delivery['status'],
    'provider' => $delivery['provider'],
    'expires_in' => 300,
    'resend_after' => $cooldown,
];

// Chỉ trả thẻ mô phỏng tin nhắn SMS khi đang bật chế độ Demo đồ án
if ($delivery['status'] === 'demo_logged') {
    $payload['demo_sms'] = [
        'sender' => $delivery['sender'],
        'masked_phone' => $delivery['masked_phone'],
        'text' => $delivery['message_text'],
        'otp' => $otp,
    ];
}

json_response($payload);
