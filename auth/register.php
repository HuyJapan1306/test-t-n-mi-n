<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/sms.php';
init_api();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_error('Phương thức không hợp lệ.', 405);
}

check_rate_limit('register', 10, 60);

$in = get_json_input();
$hoTen = trim((string)($in['ho_ten'] ?? ''));
$email = strtolower(trim((string)($in['email'] ?? '')));
$phone = trim((string)($in['so_dien_thoai'] ?? ''));
$diaChi = trim((string)($in['dia_chi'] ?? ''));
$matKhau = (string)($in['mat_khau'] ?? '');
$otpCode = trim((string)($in['ma_xac_nhan'] ?? ''));

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

$dup = $pdo->prepare('SELECT ma_tai_khoan FROM TaiKhoan WHERE email = ? OR ten_dang_nhap = ? LIMIT 1');
$dup->execute([$email, $email]);
if ($dup->fetch()) {
    json_error('Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.', 409);
}

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

$smsCfg = get_sms_config($pdo);
if ($smsCfg['reg_otp_enabled']) {
    $otpData = $_SESSION['reg_phone_otp'] ?? null;
    if (
        !is_array($otpData)
        || ($otpData['phone_digits'] ?? '') !== $digits
        || ($otpData['email'] ?? '') !== $email
    ) {
        json_error('Vui lòng yêu cầu gửi mã OTP xác nhận số điện thoại trước khi đăng ký.', 400);
    }
    if (time() > (int)($otpData['expires_at'] ?? 0)) {
        unset($_SESSION['reg_phone_otp']);
        json_error('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.', 400);
    }
    $attempts = (int)($otpData['attempts'] ?? 0);
    if ($attempts >= 5) {
        unset($_SESSION['reg_phone_otp']);
        json_error('Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng yêu cầu mã mới.', 400);
    }
    if ($otpCode === '' || !password_verify($otpCode, (string)($otpData['code_hash'] ?? ''))) {
        $_SESSION['reg_phone_otp']['attempts'] = $attempts + 1;
        $left = max(0, 5 - ($attempts + 1));
        json_error(
            $left > 0
                ? "Mã OTP không đúng (còn {$left} lần thử)."
                : 'Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng yêu cầu mã mới.',
            400
        );
    }
}

$roleStmt = $pdo->prepare("SELECT ma_quyen FROM Quyen WHERE ten_quyen = 'khach_hang' LIMIT 1");
$roleStmt->execute();
$roleId = $roleStmt->fetchColumn();
if (!$roleId) {
    json_error('Thiếu cấu hình quyền khach_hang trong cơ sở dữ liệu.', 500);
}

$hash = password_hash($matKhau, PASSWORD_DEFAULT);

try {
    $pdo->beginTransaction();

    $stmtAcc = $pdo->prepare(
        "INSERT INTO TaiKhoan (ten_dang_nhap, email, mat_khau, ma_quyen, trang_thai)
         VALUES (?, ?, ?, ?, 'active')"
    );
    $stmtAcc->execute([$email, $email, $hash, (int)$roleId]);
    $accountId = (int)$pdo->lastInsertId();

    $stmtCus = $pdo->prepare(
        "INSERT INTO KhachHang (ma_tai_khoan, ho_ten, so_dien_thoai, email, dia_chi)
         VALUES (?, ?, ?, ?, ?)"
    );
    $stmtCus->execute([$accountId, $hoTen, $phone, $email, $diaChi]);

    create_notification(
        $pdo,
        'Khách hàng mới đăng ký',
        "{$hoTen} ({$email}) vừa tạo tài khoản tại Góc nhỏ có em.",
        'customer',
        null
    );

    $pdo->commit();
    unset($_SESSION['reg_phone_otp']);

    session_regenerate_id(true);
    $_SESSION['user_id'] = $accountId;
    $user = current_user($pdo);

    json_response([
        'message' => 'Đăng ký tài khoản thành công! Chào mừng bạn đến với Góc nhỏ có em.',
        'user' => $user,
    ], 201);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Không thể tạo tài khoản lúc này: ' . $e->getMessage(), 500);
}
