<?php
declare(strict_types=1);

/**
 * Cổng gửi SMS OTP xác nhận số điện thoại — Góc nhỏ có em
 * - Hỗ trợ gửi SMS thật qua SpeedSMS.vn hoặc eSMS.vn (khi Admin nhập API Key trong Cài đặt).
 * - Hỗ trợ chế độ Demo đồ án (mô phỏng SMS + lưu nhật ký MySQL SmsOtpLog) khi chưa đăng ký API trả phí.
 */

function mask_phone_vi(string $phoneDigits): string
{
    $d = preg_replace('/\D+/', '', $phoneDigits) ?? '';
    $len = strlen($d);
    if ($len <= 6) {
        return $d;
    }
    return substr($d, 0, 3) . str_repeat('*', max(3, $len - 6)) . substr($d, -3);
}

function to_e164_vn(string $phoneDigits): string
{
    $d = preg_replace('/\D+/', '', $phoneDigits) ?? '';
    if ($d === '') {
        return '';
    }
    if (str_starts_with($d, '84')) {
        return '+' . $d;
    }
    if (str_starts_with($d, '0')) {
        return '+84' . substr($d, 1);
    }
    return '+' . $d;
}

function get_sms_config(PDO $pdo): array
{
    $rows = $pdo->query("SELECT khoa, gia_tri FROM CaiDat WHERE khoa LIKE 'sms_%' OR khoa IN ('reg_otp_enabled', 'store_name')")->fetchAll();
    $cfg = [];
    foreach ($rows as $r) {
        $cfg[$r['khoa']] = (string)($r['gia_tri'] ?? '');
    }

    $provider = strtolower(trim((string)($cfg['sms_provider'] ?? 'demo')));
    if (!in_array($provider, ['demo', 'smsgate', 'speedsms', 'esms'], true)) {
        $provider = 'demo';
    }

    return [
        'reg_otp_enabled' => ($cfg['reg_otp_enabled'] ?? '1') !== '0',
        'provider' => $provider,
        'gateway_url' => trim((string)($cfg['sms_gateway_url'] ?? '')),
        'api_key' => trim((string)($cfg['sms_api_key'] ?? '')),
        'secret_key' => trim((string)($cfg['sms_secret_key'] ?? '')),
        'brandname' => trim((string)($cfg['sms_brandname'] ?? '')),
        'store_name' => trim((string)($cfg['store_name'] ?? 'Góc nhỏ có em')) ?: 'Góc nhỏ có em',
    ];
}

function http_post_json(string $url, array $payload, array $headers = [], ?string $basicAuth = null): array
{
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $hdrs = array_merge(['Content-Type: application/json', 'Accept: application/json'], $headers);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_HTTPHEADER => $hdrs,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        if ($basicAuth !== null) {
            curl_setopt($ch, CURLOPT_USERPWD, $basicAuth);
        }
        $resp = curl_exec($ch);
        $err = curl_error($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($resp === false) {
            return ['ok' => false, 'code' => 0, 'error' => $err ?: 'Lỗi kết nối cURL'];
        }
        return ['ok' => $code >= 200 && $code < 300, 'code' => $code, 'body' => (string)$resp];
    }

    $hdrLines = ['Content-Type: application/json', 'Accept: application/json'];
    if ($basicAuth !== null) {
        $hdrLines[] = 'Authorization: Basic ' . base64_encode($basicAuth);
    }
    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", array_merge($hdrLines, $headers)),
            'content' => $body,
            'timeout' => 12,
            'ignore_errors' => true,
        ],
    ]);
    $resp = @file_get_contents($url, false, $ctx);
    if ($resp === false) {
        return ['ok' => false, 'code' => 0, 'error' => 'Không kết nối được tới máy chủ SMS Gateway.'];
    }
    return ['ok' => true, 'code' => 200, 'body' => (string)$resp];
}

function send_sms_otp(PDO $pdo, string $phoneDigits, string $otp): array
{
    $cfg = get_sms_config($pdo);
    $masked = mask_phone_vi($phoneDigits);
    $senderLabel = $cfg['brandname'] !== '' ? $cfg['brandname'] : 'GocNhoCoEm';
    $messageText = "[{$senderLabel}] Ma xac nhan dang ky cua ban la {$otp}. Hieu luc 5 phut. Khong chia se ma nay.";

    $provider = $cfg['provider'];
    $status = 'demo_logged';
    $note = 'Chế độ Demo đồ án — đã tạo tin nhắn SMS mô phỏng và lưu nhật ký SmsOtpLog.';
    $usedProvider = 'demo';

    if ($provider === 'smsgate' && $cfg['gateway_url'] !== '' && $cfg['api_key'] !== '' && $cfg['secret_key'] !== '') {
        $usedProvider = 'smsgate';
        $url = rtrim($cfg['gateway_url'], '/');
        if (!preg_match('#/(message|messages)$#i', $url)) {
            $url .= '/message';
        }
        $payload = [
            'textMessage' => ['text' => $messageText],
            'phoneNumbers' => [to_e164_vn($phoneDigits)],
        ];
        $res = http_post_json($url, $payload, [], $cfg['api_key'] . ':' . $cfg['secret_key']);
        if ($res['ok']) {
            $status = 'sent';
            $note = "Đã gửi SMS thật qua Android SMSGate tới {$masked}.";
        } else {
            $json = json_decode((string)($res['body'] ?? ''), true);
            $errMsg = is_array($json) ? (string)($json['message'] ?? $json['error'] ?? '') : '';
            $status = 'failed';
            $note = 'SMSGate lỗi' . ($res['code'] ? " ({$res['code']})" : '') . ': ' . ($errMsg !== '' ? $errMsg : (string)($res['error'] ?? 'Không kết nối được điện thoại Android.'));
        }
    } elseif ($provider === 'speedsms' && $cfg['api_key'] !== '') {
        $usedProvider = 'speedsms';
        $payload = [
            'to' => [$phoneDigits],
            'content' => $messageText,
            'sms_type' => $cfg['brandname'] !== '' ? 3 : 2,
        ];
        if ($cfg['brandname'] !== '') {
            $payload['sender'] = $cfg['brandname'];
        }
        $res = http_post_json('https://api.speedsms.vn/index.php/sms/send', $payload, [], $cfg['api_key'] . ':x');
        $json = json_decode((string)($res['body'] ?? ''), true);
        if ($res['ok'] && is_array($json) && ($json['status'] ?? '') === 'success') {
            $status = 'sent';
            $note = "Đã gửi SMS thật qua SpeedSMS.vn tới {$masked}.";
        } else {
            $status = 'failed';
            $note = 'SpeedSMS trả lỗi: ' . (string)($json['message'] ?? $res['error'] ?? 'Không rõ lỗi');
        }
    } elseif ($provider === 'esms' && $cfg['api_key'] !== '' && $cfg['secret_key'] !== '') {
        $usedProvider = 'esms';
        $payload = [
            'ApiKey' => $cfg['api_key'],
            'SecretKey' => $cfg['secret_key'],
            'Phone' => $phoneDigits,
            'Content' => $messageText,
            'SmsType' => $cfg['brandname'] !== '' ? '2' : '8',
        ];
        if ($cfg['brandname'] !== '') {
            $payload['Brandname'] = $cfg['brandname'];
        }
        $res = http_post_json('https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/', $payload);
        $json = json_decode((string)($res['body'] ?? ''), true);
        if ($res['ok'] && is_array($json) && (string)($json['CodeResult'] ?? '') === '100') {
            $status = 'sent';
            $note = "Đã gửi SMS thật qua eSMS.vn tới {$masked}.";
        } else {
            $status = 'failed';
            $note = 'eSMS trả lỗi: ' . (string)($json['ErrorMessage'] ?? $res['error'] ?? 'Không rõ lỗi');
        }
    }

    try {
        $pdo->prepare(
            "INSERT INTO SmsOtpLog (so_dien_thoai, so_che_an, noi_dung, nha_cung_cap, trang_thai, ghi_chu)
             VALUES (?, ?, ?, ?, ?, ?)"
        )->execute([
            $phoneDigits,
            $masked,
            $messageText,
            $usedProvider,
            $status,
            mb_substr($note, 0, 250, 'UTF-8'),
        ]);
    } catch (Throwable $e) {
        // Không chặn luồng OTP nếu bảng log gặp lỗi phụ
    }

    return [
        'status' => $status,
        'provider' => $usedProvider,
        'masked_phone' => $masked,
        'sender' => $senderLabel,
        'message_text' => $messageText,
        'note' => $note,
    ];
}
