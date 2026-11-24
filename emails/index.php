<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/mailer.php';
init_api();

$pdo = get_db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$user = require_auth($pdo);

if ($method === 'GET') {
    $scope = trim((string)($_GET['scope'] ?? ''));
    if ($scope === 'admin') {
        require_role(['admin', 'nhan_vien'], $pdo);
        $stmt = $pdo->query(
            "SELECT e.ma_email, e.ma_don_hang, e.email_nhan, e.tieu_de, e.noi_dung_html, e.loai,
                    e.trang_thai_gui, e.ghi_chu_gui, e.da_doc, e.ngay_gui, dh.ma_don_code
             FROM EmailThongBao e
             LEFT JOIN DonHang dh ON dh.ma_don_hang = e.ma_don_hang
             ORDER BY e.ma_email DESC
             LIMIT 60"
        );
        json_response(['emails' => $stmt->fetchAll()]);
    }

    // Hộp thư Email của khách hàng đang đăng nhập
    $cusId = (int)($user['ma_khach_hang'] ?? 0);
    $email = trim((string)($user['email'] ?? ''));
    if ($cusId <= 0 && $email === '') {
        json_response(['emails' => [], 'unread_count' => 0]);
    }

    $stmt = $pdo->prepare(
        "SELECT e.ma_email, e.ma_don_hang, e.email_nhan, e.tieu_de, e.noi_dung_html, e.loai,
                e.trang_thai_gui, e.ghi_chu_gui, e.da_doc, e.ngay_gui, dh.ma_don_code
         FROM EmailThongBao e
         LEFT JOIN DonHang dh ON dh.ma_don_hang = e.ma_don_hang
         WHERE (e.ma_khach_hang = ? AND ? > 0) OR (LOWER(e.email_nhan) = LOWER(?) AND ? <> '')
         ORDER BY e.ma_email DESC
         LIMIT 50"
    );
    $stmt->execute([$cusId, $cusId, $email, $email]);
    $emails = $stmt->fetchAll();
    $unread = count(array_filter($emails, static fn($e) => (int)$e['da_doc'] === 0));
    json_response(['emails' => $emails, 'unread_count' => $unread]);
}

if ($method === 'PUT') {
    $in = get_json_input();
    $emailId = (int)($in['ma_email'] ?? 0);
    $cusId = (int)($user['ma_khach_hang'] ?? 0);
    $email = trim((string)($user['email'] ?? ''));

    if ($emailId > 0) {
        $pdo->prepare(
            "UPDATE EmailThongBao SET da_doc = 1
             WHERE ma_email = ? AND ((ma_khach_hang = ? AND ? > 0) OR LOWER(email_nhan) = LOWER(?))"
        )->execute([$emailId, $cusId, $cusId, $email]);
    } else {
        $pdo->prepare(
            "UPDATE EmailThongBao SET da_doc = 1
             WHERE (ma_khach_hang = ? AND ? > 0) OR LOWER(email_nhan) = LOWER(?)"
        )->execute([$cusId, $cusId, $email]);
    }
    json_response(['message' => 'Đã đánh dấu đã đọc email.']);
}

if ($method === 'POST') {
    // Gửi email kiểm tra SMTP từ trang Cài đặt Admin
    require_role(['admin'], $pdo);
    $in = get_json_input();
    $to = trim((string)($in['to_email'] ?? $user['email'] ?? ''));
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        json_error('Vui lòng nhập địa chỉ email nhận kiểm tra hợp lệ.');
    }

    $cfg = get_smtp_config($pdo);
    $subject = "[{$cfg['store_name']}] Kiểm tra kết nối Email SMTP thành công";
    $html = '<div style="font-family:Segoe UI,Arial,sans-serif;padding:20px;background:#fff7fa;border-radius:14px;border:1px solid #f6dce7">'
        . '<h2 style="color:#df5889;margin:0 0 8px">🐾 Kết nối Email thành công!</h2>'
        . '<p style="color:#5b4c5e;font-size:14px;line-height:1.6">Hệ thống <strong>' . email_escape($cfg['store_name']) . '</strong> đã sẵn sàng gửi thông báo duyệt / không duyệt đơn hàng tự động tới email khách hàng.</p>'
        . '</div>';

    $res = smtp_send_html($cfg, $to, (string)$user['ho_ten'], $subject, $html);
    $pdo->prepare(
        "INSERT INTO EmailThongBao (ma_don_hang, ma_khach_hang, email_nhan, tieu_de, noi_dung_html, loai, trang_thai_gui, ghi_chu_gui, da_doc)
         VALUES (NULL, NULL, ?, ?, ?, 'general', ?, ?, 1)"
    )->execute([$to, $subject, $html, $res['status'], $res['note']]);

    if ($res['status'] === 'failed') {
        json_error($res['note'], 502);
    }
    json_response(['message' => $res['note'], 'status' => $res['status']]);
}

json_error('Phương thức không được hỗ trợ.', 405);
