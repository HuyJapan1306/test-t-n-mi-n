<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/sms.php';
init_api();

$pdo = get_db();
require_role(['admin'], $pdo);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_error('Phương thức không hợp lệ.', 405);
}

$in = get_json_input();
$phone = trim((string)($in['to_phone'] ?? ''));
$digits = clean_phone($phone);
if (strlen($digits) < 9 || strlen($digits) > 15) {
    json_error('Vui lòng nhập số điện thoại hợp lệ (9–15 chữ số).');
}

$testOtp = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$res = send_sms_otp($pdo, $digits, $testOtp);

if ($res['status'] === 'failed') {
    json_error($res['note'], 502);
}

json_response([
    'message' => $res['status'] === 'sent'
        ? $res['note']
        : "Đã chạy kiểm tra ở Chế độ Demo (mã thử: {$testOtp}). Chọn Android SMSGate / SpeedSMS / eSMS để gửi tin nhắn thật.",
    'status' => $res['status'],
    'provider' => $res['provider'],
]);
