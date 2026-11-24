<?php
declare(strict_types=1);

/**
 * Hệ thống gửi Email thông báo đơn hàng cho "Góc nhỏ có em"
 * - Hỗ trợ gửi Email thật qua SMTP TLS/SSL (Gmail App Password hoặc máy chủ SMTP bất kỳ)
 *   không cần thư viện ngoài (thuần PHP sockets).
 * - Luôn lưu bản sao HTML vào bảng MySQL `EmailThongBao` để khách hàng xem trực tiếp
 *   trong Hộp thư Email trên web và quản trị viên theo dõi lịch sử gửi.
 */

function get_smtp_config(PDO $pdo): array
{
    $rows = $pdo->query("SELECT khoa, gia_tri FROM CaiDat WHERE khoa LIKE 'smtp_%' OR khoa LIKE 'store_%'")->fetchAll();
    $cfg = [];
    foreach ($rows as $r) {
        $cfg[$r['khoa']] = (string)($r['gia_tri'] ?? '');
    }

    return [
        'host' => trim((string)(getenv('SMTP_HOST') ?: ($cfg['smtp_host'] ?? 'smtp.gmail.com'))),
        'port' => (int)(getenv('SMTP_PORT') ?: ($cfg['smtp_port'] ?? 587)),
        'secure' => strtolower(trim((string)(getenv('SMTP_SECURE') ?: ($cfg['smtp_secure'] ?? 'tls')))),
        'user' => trim((string)(getenv('SMTP_USER') ?: ($cfg['smtp_user'] ?? ''))),
        'pass' => preg_replace('/\s+/', '', trim((string)(getenv('SMTP_PASS') ?: ($cfg['smtp_pass'] ?? '')))),
        'from_name' => trim((string)($cfg['smtp_from_name'] ?? ($cfg['store_name'] ?? 'Góc nhỏ có em Pet Shop'))),
        'store_name' => trim((string)($cfg['store_name'] ?? 'Góc nhỏ có em')),
        'store_hotline' => trim((string)($cfg['store_hotline'] ?? '0901 234 567')),
        'store_address' => trim((string)($cfg['store_address'] ?? '128 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh')),
    ];
}

function smtp_read_response($fp): string
{
    $resp = '';
    while (($line = fgets($fp, 515)) !== false) {
        $resp .= $line;
        if (strlen($line) < 4 || $line[3] === ' ') {
            break;
        }
    }
    return trim($resp);
}

function smtp_cmd($fp, string $cmd, array $expectCodes): array
{
    fwrite($fp, $cmd . "\r\n");
    $resp = smtp_read_response($fp);
    $code = (int)substr($resp, 0, 3);
    if (!in_array($code, $expectCodes, true)) {
        return ['ok' => false, 'error' => "SMTP lỗi ({$code}): {$resp}"];
    }
    return ['ok' => true, 'response' => $resp];
}

/**
 * Gửi email HTML qua SMTP thuần PHP (hỗ trợ STARTTLS cổng 587 & SSL cổng 465)
 */
function smtp_send_html(array $smtp, string $toEmail, string $toName, string $subject, string $htmlBody): array
{
    if ($smtp['user'] === '' || $smtp['pass'] === '' || $smtp['host'] === '') {
        return [
            'status' => 'logged_local',
            'note' => 'Chưa cấu hình SMTP Gmail — đã lưu thư vào Hộp thư Email trên hệ thống.',
        ];
    }

    $host = $smtp['host'];
    $port = $smtp['port'] > 0 ? $smtp['port'] : 587;
    $secure = $smtp['secure'];
    $remote = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;

    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true,
        ],
    ]);

    $errno = 0;
    $errstr = '';
    $fp = @stream_socket_client($remote, $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $context);
    if (!$fp) {
        return ['status' => 'failed', 'note' => "Không kết nối được SMTP ({$errno}): {$errstr}"];
    }
    stream_set_timeout($fp, 12);

    try {
        $greet = smtp_read_response($fp);
        if ((int)substr($greet, 0, 3) !== 220) {
            fclose($fp);
            return ['status' => 'failed', 'note' => "SMTP không phản hồi 220: {$greet}"];
        }

        $ehlo = smtp_cmd($fp, 'EHLO gocnhocoem.local', [250]);
        if (!$ehlo['ok']) {
            fclose($fp);
            return ['status' => 'failed', 'note' => $ehlo['error']];
        }

        if ($secure === 'tls') {
            $st = smtp_cmd($fp, 'STARTTLS', [220]);
            if (!$st['ok']) {
                fclose($fp);
                return ['status' => 'failed', 'note' => $st['error']];
            }
            if (!@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) {
                fclose($fp);
                return ['status' => 'failed', 'note' => 'Không thể bật mã hóa TLS cho kết nối SMTP.'];
            }
            $ehlo2 = smtp_cmd($fp, 'EHLO gocnhocoem.local', [250]);
            if (!$ehlo2['ok']) {
                fclose($fp);
                return ['status' => 'failed', 'note' => $ehlo2['error']];
            }
        }

        foreach ([
            ['AUTH LOGIN', [334]],
            [base64_encode($smtp['user']), [334]],
            [base64_encode($smtp['pass']), [235]],
            ['MAIL FROM:<' . $smtp['user'] . '>', [250]],
            ['RCPT TO:<' . $toEmail . '>', [250, 251]],
            ['DATA', [354]],
        ] as [$cmd, $codes]) {
            $r = smtp_cmd($fp, $cmd, $codes);
            if (!$r['ok']) {
                fclose($fp);
                $err = $r['error'];
                if (str_contains($err, '(535)')) {
                    $err = 'Sai Email gửi hoặc Mật khẩu ứng dụng Gmail (535). Hãy tạo App Password 16 ký tự trong Google Account, không dùng mật khẩu đăng nhập thường.';
                }
                return ['status' => 'failed', 'note' => $err];
            }
        }

        $encodedFromName = '=?UTF-8?B?' . base64_encode($smtp['from_name']) . '?=';
        $encodedToName = $toName !== '' ? '=?UTF-8?B?' . base64_encode($toName) . '?=' : '';
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $dateHeader = date('r');

        $headers = [
            "Date: {$dateHeader}",
            "From: {$encodedFromName} <{$smtp['user']}>",
            'To: ' . ($encodedToName !== '' ? "{$encodedToName} <{$toEmail}>" : "<{$toEmail}>"),
            "Subject: {$encodedSubject}",
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
        ];

        $payload = implode("\r\n", $headers) . "\r\n\r\n" . chunk_split(base64_encode($htmlBody)) . "\r\n.";
        $sent = smtp_cmd($fp, $payload, [250]);
        @fwrite($fp, "QUIT\r\n");
        fclose($fp);

        if (!$sent['ok']) {
            return ['status' => 'failed', 'note' => $sent['error']];
        }
        return ['status' => 'sent_smtp', 'note' => "Đã gửi email thành công tới {$toEmail} qua SMTP."];
    } catch (Throwable $e) {
        @fclose($fp);
        return ['status' => 'failed', 'note' => 'Lỗi gửi SMTP: ' . $e->getMessage()];
    }
}

function email_escape(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function build_order_email_html(array $order, array $items, array $cfg, string $type, string $reason = ''): array
{
    $code = (string)$order['ma_don_code'];
    $customerName = (string)($order['ten_nguoi_nhan'] ?: 'Quý khách');
    $storeName = $cfg['store_name'];
    $hotline = $cfg['store_hotline'];
    $address = $cfg['store_address'];

    $isApproved = $type === 'order_approved';
    $subject = $isApproved
        ? "[{$storeName}] Đơn hàng #{$code} đã được duyệt & đang vận chuyển"
        : "[{$storeName}] Thông báo đơn hàng #{$code} không được duyệt";

    $badgeBg = $isApproved ? '#e8f8f0' : '#ffecee';
    $badgeColor = $isApproved ? '#1d845f' : '#c63b5a';
    $badgeText = $isApproved ? 'ĐƠN HÀNG ĐÃ ĐƯỢC DUYỆT' : 'ĐƠN HÀNG KHÔNG ĐƯỢC DUYỆT';
    $headline = $isApproved
        ? "Đơn hàng #{$code} của bạn đã được duyệt và đang vận chuyển!"
        : "Rất tiếc, đơn hàng #{$code} của bạn chưa được duyệt";

    $shipLabel = (($order['phuong_thuc_van_chuyen'] ?? 'standard') === 'express')
        ? 'Giao hàng nhanh (2–4 giờ / trong ngày)'
        : 'Giao hàng thường (2–4 ngày làm việc)';
    $payLabel = (($order['phuong_thuc'] ?? 'cod') === 'bank_transfer')
        ? 'Thanh toán trước qua thẻ / mã QR'
        : 'Thanh toán khi nhận hàng (COD)';
    $shipFee = (float)($order['phi_van_chuyen'] ?? 0);
    $total = (float)($order['tong_tien'] ?? 0);

    $rowsHtml = '';
    foreach ($items as $it) {
        $vTag = !empty($it['phan_loai'])
            ? '<div style="font-size:12px;color:#a8486e;margin-top:2px">' . email_escape((string)$it['phan_loai']) . '</div>'
            : '';
        $lineTotal = format_vnd((float)$it['don_gia'] * (int)$it['so_luong']);
        $rowsHtml .= '<tr>'
            . '<td style="padding:10px 8px;border-bottom:1px solid #f4e4ec;font-size:13px;color:#423444">'
            . '<strong>' . email_escape((string)$it['ten_san_pham']) . '</strong>' . $vTag
            . '</td>'
            . '<td style="padding:10px 8px;border-bottom:1px solid #f4e4ec;text-align:center;font-size:13px;color:#6e5f70">×' . (int)$it['so_luong'] . '</td>'
            . '<td style="padding:10px 8px;border-bottom:1px solid #f4e4ec;text-align:right;font-size:13px;font-weight:700;color:#df5889">' . $lineTotal . '</td>'
            . '</tr>';
    }

    $introBlock = $isApproved
        ? '<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#574859">'
          . 'Xin chào <strong>' . email_escape($customerName) . '</strong>,<br>'
          . 'Nhân viên <strong>' . email_escape($storeName) . '</strong> đã xác nhận và bàn giao đơn hàng <strong>#' . email_escape($code) . '</strong> cho đơn vị vận chuyển. '
          . 'Khi nhận được hàng, bạn hãy vào mục <strong>Đơn hàng → Chờ vận chuyển</strong> và bấm nút <strong>Đã nhận</strong> nhé!'
          . '</p>'
        : '<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#574859">'
          . 'Xin chào <strong>' . email_escape($customerName) . '</strong>,<br>'
          . 'Chúng tôi rất tiếc phải thông báo đơn hàng <strong>#' . email_escape($code) . '</strong> của bạn hiện không được duyệt và đã chuyển sang trạng thái hủy.'
          . '</p>'
          . '<div style="background:#fff2f5;border:1px solid #f5bfd0;border-radius:12px;padding:12px 14px;margin:0 0 14px;font-size:13px;color:#a83254">'
          . '<strong>Lý do:</strong> ' . email_escape($reason !== '' ? $reason : 'Sản phẩm tạm hết hàng hoặc thông tin xác nhận đơn chưa đầy đủ.')
          . (((($order['phuong_thuc'] ?? '') === 'bank_transfer') && (($order['trang_thai_thanh_toan'] ?? '') === 'paid' || ($order['trang_thai_thanh_toan'] ?? '') === 'refunded'))
              ? '<br><span style="color:#6d4a58">Nếu bạn đã chuyển khoản trước qua mã QR, cửa hàng sẽ hoàn tiền lại trong vòng 24 giờ làm việc.</span>'
              : '')
          . '</div>';

    $html = '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"></head>'
        . '<body style="margin:0;padding:18px;background:#fff7fa;font-family:Segoe UI,Arial,sans-serif">'
        . '<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #f6dce7;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(223,88,137,.10)">'
        . '<div style="background:linear-gradient(120deg,#f69ab9,#df5889);padding:22px 24px;color:#ffffff">'
        . '<div style="font-size:12px;letter-spacing:1.5px;font-weight:700;opacity:.92">GÓC NHỎ CÓ EM · PET SHOP &amp; AI CARE</div>'
        . '<h2 style="margin:6px 0 0;font-size:20px;line-height:1.35">' . email_escape($headline) . '</h2>'
        . '</div>'
        . '<div style="padding:22px 24px">'
        . '<div style="display:inline-block;background:' . $badgeBg . ';color:' . $badgeColor . ';font-size:11px;font-weight:800;padding:5px 12px;border-radius:99px;margin-bottom:14px">' . $badgeText . '</div>'
        . $introBlock
        . '<table style="width:100%;border-collapse:collapse;margin:10px 0 14px">'
        . '<thead><tr style="background:#fff5f9">'
        . '<th style="padding:9px 8px;text-align:left;font-size:12px;color:#8c7486">Sản phẩm</th>'
        . '<th style="padding:9px 8px;text-align:center;font-size:12px;color:#8c7486">SL</th>'
        . '<th style="padding:9px 8px;text-align:right;font-size:12px;color:#8c7486">Thành tiền</th>'
        . '</tr></thead><tbody>' . $rowsHtml . '</tbody></table>'
        . '<div style="background:#fff9fb;border:1px solid #f5e2ec;border-radius:12px;padding:12px 14px;font-size:13px;color:#5b4c5e;line-height:1.75">'
        . '<div><strong>Người nhận:</strong> ' . email_escape($customerName) . ' (' . email_escape((string)$order['so_dien_thoai']) . ')</div>'
        . '<div><strong>Địa chỉ:</strong> ' . email_escape((string)$order['dia_chi_nhan']) . '</div>'
        . '<div><strong>Vận chuyển:</strong> ' . email_escape($shipLabel) . ($shipFee > 0 ? ' · Phí: ' . format_vnd($shipFee) : ' · Miễn phí') . '</div>'
        . '<div><strong>Thanh toán:</strong> ' . email_escape($payLabel) . '</div>'
        . '<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #efcad9;font-size:15px"><strong>Tổng cộng:</strong> <strong style="color:#df5889">' . format_vnd($total) . '</strong></div>'
        . '</div>'
        . '<p style="margin:16px 0 0;font-size:12px;color:#938196;line-height:1.6">'
        . 'Cần hỗ trợ thêm? Liên hệ Hotline <strong>' . email_escape($hotline) . '</strong> · ' . email_escape($address) . '<br>'
        . 'Trân trọng,<br><strong>Đội ngũ ' . email_escape($storeName) . ' 🐾</strong>'
        . '</p>'
        . '</div></div></body></html>';

    return ['subject' => $subject, 'html' => $html];
}

/**
 * Gửi & lưu email thông báo duyệt / không duyệt đơn hàng cho khách hàng
 */
function send_order_status_email(PDO $pdo, int $orderId, string $type, string $reason = ''): array
{
    $stmt = $pdo->prepare(
        "SELECT dh.*, tt.phuong_thuc, tt.trang_thai AS trang_thai_thanh_toan,
                COALESCE(NULLIF(kh.email, ''), tk.email) AS customer_email
         FROM DonHang dh
         LEFT JOIN ThanhToan tt ON tt.ma_don_hang = dh.ma_don_hang
         LEFT JOIN KhachHang kh ON kh.ma_khach_hang = dh.ma_khach_hang
         LEFT JOIN TaiKhoan tk ON tk.ma_tai_khoan = kh.ma_tai_khoan
         WHERE dh.ma_don_hang = ?
         LIMIT 1"
    );
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (!$order) {
        return ['sent' => false, 'status' => 'failed', 'email' => '', 'note' => 'Không tìm thấy đơn hàng.'];
    }

    $toEmail = trim((string)($order['customer_email'] ?? ''));
    if ($toEmail === '' || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
        return ['sent' => false, 'status' => 'skipped', 'email' => '', 'note' => 'Khách hàng chưa có địa chỉ email hợp lệ.'];
    }

    $itStmt = $pdo->prepare(
        "SELECT ct.ma_san_pham, ct.phan_loai, ct.so_luong, ct.don_gia, sp.ten_san_pham
         FROM ChiTietDonHang ct
         JOIN SanPham sp ON sp.ma_san_pham = ct.ma_san_pham
         WHERE ct.ma_don_hang = ?"
    );
    $itStmt->execute([$orderId]);
    $items = $itStmt->fetchAll();

    $cfg = get_smtp_config($pdo);
    $built = build_order_email_html($order, $items, $cfg, $type, $reason);
    $delivery = smtp_send_html($cfg, $toEmail, (string)$order['ten_nguoi_nhan'], $built['subject'], $built['html']);

    $pdo->prepare(
        "INSERT INTO EmailThongBao (ma_don_hang, ma_khach_hang, email_nhan, tieu_de, noi_dung_html, loai, trang_thai_gui, ghi_chu_gui, da_doc)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)"
    )->execute([
        $orderId,
        $order['ma_khach_hang'] ? (int)$order['ma_khach_hang'] : null,
        $toEmail,
        $built['subject'],
        $built['html'],
        $type,
        $delivery['status'],
        mb_substr((string)$delivery['note'], 0, 250, 'UTF-8'),
    ]);

    return [
        'sent' => $delivery['status'] === 'sent_smtp',
        'status' => $delivery['status'],
        'email' => $toEmail,
        'subject' => $built['subject'],
        'note' => $delivery['note'],
        'ma_email' => (int)$pdo->lastInsertId(),
    ];
}
