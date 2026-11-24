<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/invoices.php';
init_api();

$pdo = get_db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'GET') {
    json_error('Phương thức không được hỗ trợ.', 405);
}

require_role(['admin', 'nhan_vien'], $pdo);

// Tự động đồng bộ các đơn đã hoàn thành hoặc đã thanh toán nhưng chưa có bản ghi HoaDon (an toàn idempotent)
try {
    $missing = $pdo->query(
        "SELECT dh.ma_don_hang, dh.ngay_giao, dh.ngay_dat
         FROM DonHang dh
         LEFT JOIN ThanhToan tt ON tt.ma_don_hang = dh.ma_don_hang
         LEFT JOIN HoaDon hd ON hd.ma_don_hang = dh.ma_don_hang
         WHERE hd.ma_hoa_don IS NULL
           AND dh.trang_thai <> 'cancelled'
           AND (dh.trang_thai = 'done' OR tt.trang_thai = 'paid')
         ORDER BY dh.ma_don_hang ASC"
    )->fetchAll();
    foreach ($missing as $m) {
        ensure_invoice_for_order($pdo, (int)$m['ma_don_hang'], [
            'ngay_xuat' => $m['ngay_giao'] ?: $m['ngay_dat'],
        ]);
    }
} catch (Throwable $e) {
    // Không làm gián đoạn truy vấn nếu đồng bộ nền gặp lỗi nhỏ
}

$invoiceId = (int)($_GET['id'] ?? 0);

$baseSql = "SELECT hd.*,
                   dh.ma_don_code, dh.dia_chi_nhan, dh.trang_thai AS trang_thai_don,
                   dh.phuong_thuc_van_chuyen,
                   COALESCE(tt.trang_thai, 'paid') AS trang_thai_thanh_toan
            FROM HoaDon hd
            JOIN DonHang dh ON dh.ma_don_hang = hd.ma_don_hang
            LEFT JOIN ThanhToan tt ON tt.ma_don_hang = hd.ma_don_hang";

if ($invoiceId > 0) {
    $stmt = $pdo->prepare($baseSql . ' WHERE hd.ma_hoa_don = ? LIMIT 1');
    $stmt->execute([$invoiceId]);
    $inv = $stmt->fetch();
    if (!$inv) {
        json_error('Không tìm thấy hóa đơn.', 404);
    }
    $itStmt = $pdo->prepare(
        "SELECT ct.ma_san_pham, ct.phan_loai, ct.so_luong, ct.don_gia, sp.ten_san_pham
         FROM ChiTietDonHang ct
         JOIN SanPham sp ON sp.ma_san_pham = ct.ma_san_pham
         WHERE ct.ma_don_hang = ?"
    );
    $itStmt->execute([(int)$inv['ma_don_hang']]);
    $inv['items'] = $itStmt->fetchAll();
    json_response(['invoice' => $inv]);
}

$invoices = $pdo->query($baseSql . ' ORDER BY hd.ngay_xuat DESC, hd.ma_hoa_don DESC')->fetchAll();

// Nạp chi tiết sản phẩm theo lô để bấm Xem & In mở tức thì
$itemsByOrder = [];
if ($invoices) {
    $orderIds = array_values(array_unique(array_map(static fn($r) => (int)$r['ma_don_hang'], $invoices)));
    $ph = implode(',', array_fill(0, count($orderIds), '?'));
    $itStmt = $pdo->prepare(
        "SELECT ct.ma_don_hang, ct.ma_san_pham, ct.phan_loai, ct.so_luong, ct.don_gia, sp.ten_san_pham
         FROM ChiTietDonHang ct
         JOIN SanPham sp ON sp.ma_san_pham = ct.ma_san_pham
         WHERE ct.ma_don_hang IN ({$ph})"
    );
    $itStmt->execute($orderIds);
    foreach ($itStmt->fetchAll() as $it) {
        $oid = (int)$it['ma_don_hang'];
        $itemsByOrder[$oid][] = $it;
    }
}

$summary = [
    'total_count' => 0,
    'total_amount' => 0.0,
    'pos_count' => 0,
    'pos_amount' => 0.0,
    'online_count' => 0,
    'online_amount' => 0.0,
];

foreach ($invoices as &$inv) {
    $oid = (int)$inv['ma_don_hang'];
    $inv['items'] = $itemsByOrder[$oid] ?? [];
    $inv['so_mon'] = array_reduce($inv['items'], static fn($s, $i) => $s + (int)$i['so_luong'], 0);
    $amt = (float)$inv['tong_tien'];
    $summary['total_count']++;
    $summary['total_amount'] += $amt;
    if ($inv['kenh_ban'] === 'tai_quay') {
        $summary['pos_count']++;
        $summary['pos_amount'] += $amt;
    } else {
        $summary['online_count']++;
        $summary['online_amount'] += $amt;
    }
}
unset($inv);

json_response([
    'invoices' => $invoices,
    'summary' => $summary,
]);
