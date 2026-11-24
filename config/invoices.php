<?php
declare(strict_types=1);

/**
 * Quản lý lập & lưu trữ Hóa đơn (HoaDon) — Góc nhỏ có em
 * Liên kết 1-1 với DonHang, tự động xuất hóa đơn cho cả kênh Tại quầy (POS) và Online.
 */

function detect_order_channel(array $order): string
{
    $addr = mb_strtolower((string)($order['dia_chi_nhan'] ?? ''), 'UTF-8');
    $phone = mb_strtolower(trim((string)($order['so_dien_thoai'] ?? '')), 'UTF-8');
    if (str_contains($addr, 'tại quầy') || $phone === 'tại quầy') {
        return 'tai_quay';
    }
    return 'online';
}

function generate_invoice_code(PDO $pdo, ?string $dateStr = null): string
{
    $ts = $dateStr ? strtotime($dateStr) : false;
    $ymd = $ts ? date('Ymd', $ts) : date('Ymd');
    $prefix = "HD-{$ymd}-";

    $stmt = $pdo->prepare('SELECT ma_hoa_don_code FROM HoaDon WHERE ma_hoa_don_code LIKE ? ORDER BY ma_hoa_don DESC LIMIT 1');
    $stmt->execute([$prefix . '%']);
    $last = (string)($stmt->fetchColumn() ?: '');
    $seq = 1;
    if ($last !== '' && preg_match('/(\d+)$/', $last, $m)) {
        $seq = (int)$m[1] + 1;
    }

    $code = $prefix . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
    $chk = $pdo->prepare('SELECT COUNT(*) FROM HoaDon WHERE ma_hoa_don_code = ?');
    $chk->execute([$code]);
    while ((int)$chk->fetchColumn() > 0) {
        $seq++;
        $code = $prefix . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
        $chk->execute([$code]);
    }
    return $code;
}

function ensure_invoice_for_order(PDO $pdo, int $orderId, array $opts = []): ?array
{
    if ($orderId <= 0) {
        return null;
    }

    $existStmt = $pdo->prepare('SELECT * FROM HoaDon WHERE ma_don_hang = ? LIMIT 1');
    $existStmt->execute([$orderId]);
    $existing = $existStmt->fetch();
    if ($existing) {
        $updates = [];
        $params = [];
        if (array_key_exists('tien_khach_dua', $opts) && $opts['tien_khach_dua'] !== null && $existing['tien_khach_dua'] === null) {
            $given = (float)$opts['tien_khach_dua'];
            $change = max(0.0, $given - (float)$existing['tong_tien']);
            $updates[] = 'tien_khach_dua = ?, tien_thua = ?';
            $params[] = $given;
            $params[] = $change;
            $existing['tien_khach_dua'] = $given;
            $existing['tien_thua'] = $change;
        }
        $incomingName = trim((string)($opts['ten_nguoi_lap'] ?? ''));
        $isGenericCur = in_array((string)$existing['ten_nguoi_lap'], ['Hệ thống', 'Hệ thống Online', 'Thu ngân', ''], true);
        if ($incomingName !== '' && !in_array($incomingName, ['Hệ thống', 'Hệ thống Online', 'Thu ngân'], true) && $isGenericCur) {
            $updates[] = 'ma_nhan_vien_lap = ?, ten_nguoi_lap = ?';
            $params[] = !empty($opts['ma_nhan_vien_lap']) ? (int)$opts['ma_nhan_vien_lap'] : null;
            $params[] = $incomingName;
            $existing['ma_nhan_vien_lap'] = !empty($opts['ma_nhan_vien_lap']) ? (int)$opts['ma_nhan_vien_lap'] : null;
            $existing['ten_nguoi_lap'] = $incomingName;
        }
        if ($updates) {
            $params[] = (int)$existing['ma_hoa_don'];
            $pdo->prepare('UPDATE HoaDon SET ' . implode(', ', $updates) . ' WHERE ma_hoa_don = ?')->execute($params);
        }
        return $existing;
    }

    $oStmt = $pdo->prepare(
        "SELECT dh.*,
                COALESCE(tt.phuong_thuc, 'cod') AS phuong_thuc,
                nv.ho_ten AS nv_xu_ly_ten
         FROM DonHang dh
         LEFT JOIN ThanhToan tt ON tt.ma_don_hang = dh.ma_don_hang
         LEFT JOIN NhanVien nv ON nv.ma_nhan_vien = dh.ma_nhan_vien_xu_ly
         WHERE dh.ma_don_hang = ?
         LIMIT 1"
    );
    $oStmt->execute([$orderId]);
    $order = $oStmt->fetch();
    if (!$order) {
        return null;
    }

    $kenhBan = (string)($opts['kenh_ban'] ?? detect_order_channel($order));
    if (!in_array($kenhBan, ['tai_quay', 'online'], true)) {
        $kenhBan = 'online';
    }

    $phiShip = (float)($order['phi_van_chuyen'] ?? 0);
    $tongTien = (float)($order['tong_tien'] ?? 0);
    $tamTinh = max(0.0, $tongTien - $phiShip);

    $given = isset($opts['tien_khach_dua']) && $opts['tien_khach_dua'] !== null && $opts['tien_khach_dua'] !== ''
        ? (float)$opts['tien_khach_dua']
        : null;
    $change = $given !== null ? max(0.0, $given - $tongTien) : null;

    $maNv = !empty($opts['ma_nhan_vien_lap'])
        ? (int)$opts['ma_nhan_vien_lap']
        : (!empty($order['ma_nhan_vien_xu_ly']) ? (int)$order['ma_nhan_vien_xu_ly'] : null);
    $tenNguoiLap = trim((string)($opts['ten_nguoi_lap'] ?? ''));
    if ($tenNguoiLap === '' || in_array($tenNguoiLap, ['Hệ thống', 'Hệ thống Online', 'Thu ngân'], true)) {
        if (!empty($order['nv_xu_ly_ten'])) {
            $tenNguoiLap = (string)$order['nv_xu_ly_ten'];
        } elseif ($tenNguoiLap === '') {
            $tenNguoiLap = $kenhBan === 'tai_quay' ? 'Thu ngân' : 'Hệ thống Online';
        }
    }
    $ngayXuat = !empty($opts['ngay_xuat']) ? (string)$opts['ngay_xuat'] : date('Y-m-d H:i:s');
    $code = generate_invoice_code($pdo, $ngayXuat);

    $phuongThuc = ($order['phuong_thuc'] ?? 'cod') === 'bank_transfer' ? 'bank_transfer' : 'cod';

    $pdo->prepare(
        "INSERT INTO HoaDon (
            ma_hoa_don_code, ma_don_hang, kenh_ban, ma_nhan_vien_lap, ten_nguoi_lap,
            ten_khach_hang, so_dien_thoai, phuong_thuc,
            tam_tinh, phi_van_chuyen, tong_tien, tien_khach_dua, tien_thua, ghi_chu, ngay_xuat
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )->execute([
        $code,
        $orderId,
        $kenhBan,
        $maNv,
        $tenNguoiLap,
        (string)($order['ten_nguoi_nhan'] ?: 'Khách lẻ'),
        (string)($order['so_dien_thoai'] ?? ''),
        $phuongThuc,
        $tamTinh,
        $phiShip,
        $tongTien,
        $given,
        $change,
        (string)($order['ghi_chu'] ?? ''),
        $ngayXuat,
    ]);

    $invId = (int)$pdo->lastInsertId();
    $resStmt = $pdo->prepare('SELECT * FROM HoaDon WHERE ma_hoa_don = ? LIMIT 1');
    $resStmt->execute([$invId]);
    return $resStmt->fetch() ?: null;
}
