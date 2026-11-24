<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/mailer.php';
init_api();

$pdo = get_db();
$user = require_auth($pdo);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_error('Phương thức không hợp lệ.', 405);
}

$in = get_json_input();
$oldPass = (string)($in['mat_khau_cu'] ?? '');
$newPass = (string)($in['mat_khau_moi'] ?? '');

if ($oldPass === '' || strlen($newPass) < 6) {
    json_error('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới (tối thiểu 6 ký tự).');
}

$curStmt = $pdo->prepare('SELECT mat_khau, email FROM TaiKhoan WHERE ma_tai_khoan = ? LIMIT 1');
$curStmt->execute([$user['ma_tai_khoan']]);
$acc = $curStmt->fetch();

if (!$acc || !password_verify($oldPass, (string)$acc['mat_khau'])) {
    json_error('Mật khẩu hiện tại không đúng.', 400);
}

$toEmail = trim((string)($acc['email'] ?? $user['email'] ?? ''));
if ($toEmail === '' || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
    json_error('Tài khoản chưa có địa chỉ email hợp lệ để nhận mã xác nhận.', 400);
}

$prev = $_SESSION['pw_change_otp'] ?? null;
$cooldown = 30;
if (is_array($prev) && (int)($prev['account_id'] ?? 0) === (int)$user['ma_tai_khoan']) {
    $elapsed = time() - (int)($prev['sent_at'] ?? 0);
    if ($elapsed < $cooldown) {
        $wait = $cooldown - $elapsed;
        json_error("Vui lòng đợi {$wait} giây trước khi gửi lại mã xác nhận.", 429);
    }
}

$otp = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$_SESSION['pw_change_otp'] = [
    'account_id' => (int)$user['ma_tai_khoan'],
    'code_hash' => password_hash($otp, PASSWORD_DEFAULT),
    'expires_at' => time() + 300,
    'sent_at' => time(),
    'attempts' => 0,
    'email' => $toEmail,
];

$cfg = get_smtp_config($pdo);
$storeName = $cfg['store_name'] ?: 'Góc nhỏ có em';
$subject = "[{$storeName}] Mã xác nhận đổi mật khẩu: {$otp}";
$html = '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"></head>'
    . '<body style="margin:0;padding:18px;background:#fff7fa;font-family:Segoe UI,Arial,sans-serif">'
    . '<div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #f6dce7;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(223,88,137,.10)">'
    . '<div style="background:linear-gradient(120deg,#f69ab9,#df5889);padding:20px 24px;color:#ffffff">'
    . '<div style="font-size:11px;letter-spacing:1.4px;font-weight:700;opacity:.92">' . email_escape(mb_strtoupper($storeName, 'UTF-8')) . ' · BẢO MẬT TÀI KHOẢN</div>'
    . '<h2 style="margin:6px 0 0;font-size:19px;line-height:1.35">Mã xác nhận đổi mật khẩu</h2>'
    . '</div>'
    . '<div style="padding:22px 24px;color:#4a3d4e;font-size:14px;line-height:1.65">'
    . '<p style="margin:0 0 12px">Xin chào <strong>' . email_escape((string)$user['ho_ten']) . '</strong>,</p>'
    . '<p style="margin:0 0 16px">Bạn vừa yêu cầu đổi mật khẩu tài khoản trên hệ thống <strong>' . email_escape($storeName) . '</strong>. Vui lòng nhập mã xác nhận 6 chữ số bên dưới để hoàn tất:</p>'
    . '<div style="text-align:center;margin:18px 0;padding:16px;border-radius:14px;background:#fff4f8;border:1.5px dashed #f0a9c4">'
    . '<div style="font-size:32px;font-weight:900;letter-spacing:8px;color:#df5889;font-family:Consolas,monospace">' . email_escape($otp) . '</div>'
    . '<div style="font-size:12px;color:#8e798f;margin-top:6px">Mã có hiệu lực trong <strong>5 phút</strong></div>'
    . '</div>'
    . '<p style="margin:14px 0 0;font-size:12px;color:#8d7b8f">Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này và giữ nguyên mật khẩu hiện tại.</p>'
    . '</div></div></body></html>';

$delivery = smtp_send_html($cfg, $toEmail, (string)$user['ho_ten'], $subject, $html);

try {
    $pdo->prepare(
        "INSERT INTO EmailThongBao (ma_don_hang, ma_khach_hang, email_nhan, tieu_de, noi_dung_html, loai, trang_thai_gui, ghi_chu_gui, da_doc)
         VALUES (NULL, ?, ?, ?, ?, 'general', ?, ?, 0)"
    )->execute([
        $user['ma_khach_hang'] ? (int)$user['ma_khach_hang'] : null,
        $toEmail,
        $subject,
        $html,
        $delivery['status'],
        mb_substr((string)$delivery['note'], 0, 250, 'UTF-8'),
    ]);
} catch (Throwable $e) {
    // Không chặn luồng OTP nếu bảng log gặp lỗi phụ
}

json_response([
    'message' => $delivery['status'] === 'sent_smtp'
        ? "Đã gửi mã xác nhận 6 số tới {$toEmail}. Vui lòng kiểm tra email để xác nhận."
        : "Đã gửi mã xác nhận tới {$toEmail}. (Chưa bật SMTP Gmail — bạn có thể mở Thông báo → Lịch sử Email đã gửi để xem mã.)",
    'email' => $toEmail,
    'delivery_status' => $delivery['status'],
    'expires_in' => 300,
    'resend_after' => $cooldown,
]);
