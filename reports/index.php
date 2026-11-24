<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
date_default_timezone_set('Asia/Ho_Chi_Minh');
init_api();

$pdo = get_db();
require_role(['admin', 'nhan_vien'], $pdo);

$days = (int)($_GET['days'] ?? 7);
if (!in_array($days, [7, 30], true)) {
    $days = 7;
}

// 1. KPI tổng quan (gồm cả số liệu lũy kế cho Báo cáo & số liệu riêng TRONG NGÀY hôm nay tự động reset sau 00:00)
$kpi = [
    'today_date' => date('Y-m-d'),
    'today_label' => date('d/m/Y'),
    'revenue_today' => (float)$pdo->query("SELECT COALESCE(SUM(tong_tien), 0) FROM DonHang WHERE trang_thai = 'done' AND DATE(COALESCE(ngay_giao, ngay_dat)) = CURDATE()")->fetchColumn(),
    'orders_done_today' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang WHERE trang_thai = 'done' AND DATE(COALESCE(ngay_giao, ngay_dat)) = CURDATE()")->fetchColumn(),
    'orders_today' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang WHERE DATE(ngay_dat) = CURDATE()")->fetchColumn(),
    'orders_pending_today' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang WHERE trang_thai = 'pending' AND DATE(ngay_dat) = CURDATE()")->fetchColumn(),
    'products_sold_today' => (int)$pdo->query("SELECT COALESCE(SUM(ct.so_luong), 0) FROM ChiTietDonHang ct JOIN DonHang dh ON dh.ma_don_hang = ct.ma_don_hang WHERE dh.trang_thai NOT IN ('cancelled', 'returned') AND DATE(dh.ngay_dat) = CURDATE()")->fetchColumn(),
    'appointments_today' => (int)$pdo->query("SELECT COUNT(*) FROM LichHen WHERE DATE(ngay_gio) = CURDATE() AND trang_thai <> 'cancelled'")->fetchColumn(),
    'appointments_pending_today' => (int)$pdo->query("SELECT COUNT(*) FROM LichHen WHERE DATE(ngay_gio) = CURDATE() AND trang_thai IN ('pending', 'confirmed')")->fetchColumn(),
    'revenue_done' => (float)$pdo->query("SELECT COALESCE(SUM(tong_tien), 0) FROM DonHang WHERE trang_thai = 'done'")->fetchColumn(),
    'revenue_month' => (float)$pdo->query("SELECT COALESCE(SUM(tong_tien), 0) FROM DonHang WHERE trang_thai = 'done' AND YEAR(ngay_dat) = YEAR(NOW()) AND MONTH(ngay_dat) = MONTH(NOW())")->fetchColumn(),
    'orders_total' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang")->fetchColumn(),
    'orders_pending' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang WHERE trang_thai = 'pending'")->fetchColumn(),
    'orders_confirmed' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang WHERE trang_thai = 'confirmed'")->fetchColumn(),
    'orders_shipping' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang WHERE trang_thai = 'shipping'")->fetchColumn(),
    'orders_done' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang WHERE trang_thai = 'done'")->fetchColumn(),
    'orders_returned' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang WHERE trang_thai = 'returned'")->fetchColumn(),
    'orders_cancelled' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang WHERE trang_thai = 'cancelled'")->fetchColumn(),
    'products_active' => (int)$pdo->query("SELECT COUNT(*) FROM SanPham WHERE trang_thai = 'active'")->fetchColumn(),
    'products_low_stock' => (int)$pdo->query("SELECT COUNT(*) FROM SanPham WHERE trang_thai = 'active' AND ton_kho <= 10")->fetchColumn(),
    'customers_total' => (int)$pdo->query("SELECT COUNT(*) FROM KhachHang")->fetchColumn(),
    'appointments_total' => (int)$pdo->query("SELECT COUNT(*) FROM LichHen")->fetchColumn(),
    'appointments_upcoming' => (int)$pdo->query("SELECT COUNT(*) FROM LichHen WHERE ngay_gio >= NOW() AND trang_thai IN ('pending','confirmed')")->fetchColumn(),
];

// 2. Doanh thu theo ngày (7 hoặc 30 ngày gần nhất)
$stmtSeries = $pdo->prepare(
    "SELECT DATE(ngay_dat) AS ngay, COALESCE(SUM(tong_tien), 0) AS doanh_thu, COUNT(*) AS so_don
     FROM DonHang
     WHERE trang_thai NOT IN ('cancelled', 'returned') AND ngay_dat >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(ngay_dat)
     ORDER BY ngay ASC"
);
$stmtSeries->execute([$days - 1]);
$rawMap = [];
foreach ($stmtSeries->fetchAll() as $r) {
    $rawMap[$r['ngay']] = ['doanh_thu' => (float)$r['doanh_thu'], 'so_don' => (int)$r['so_don']];
}

$series = [];
$seriesTotal = 0.0;
for ($i = $days - 1; $i >= 0; $i--) {
    $d = date('Y-m-d', strtotime("-{$i} days"));
    $label = date('d/m', strtotime($d));
    $rev = $rawMap[$d]['doanh_thu'] ?? 0.0;
    $cnt = $rawMap[$d]['so_don'] ?? 0;
    $seriesTotal += $rev;
    $series[] = ['date' => $d, 'label' => $label, 'revenue' => $rev, 'orders' => $cnt];
}

// 3. Sản phẩm bán chạy nhất
$topProducts = $pdo->query(
    "SELECT sp.ma_san_pham, sp.ten_san_pham, sp.bieu_tuong, sp.gia, sp.ton_kho,
            SUM(ct.so_luong) AS da_ban,
            SUM(ct.so_luong * ct.don_gia) AS doanh_thu
     FROM ChiTietDonHang ct
     JOIN DonHang dh ON dh.ma_don_hang = ct.ma_don_hang AND dh.trang_thai NOT IN ('cancelled', 'returned')
     JOIN SanPham sp ON sp.ma_san_pham = ct.ma_san_pham
     GROUP BY sp.ma_san_pham
     ORDER BY da_ban DESC
     LIMIT 6"
)->fetchAll();

// 4. Sản phẩm sắp hết hàng
$lowStock = $pdo->query(
    "SELECT ma_san_pham, ten_san_pham, ton_kho, gia, bieu_tuong
     FROM SanPham
     WHERE trang_thai = 'active' AND ton_kho <= 10
     ORDER BY ton_kho ASC
     LIMIT 8"
)->fetchAll();

// 5. Phân bổ danh mục
$categoryStats = $pdo->query(
    "SELECT dm.ma_danh_muc, dm.slug, dm.ten_danh_muc, dm.bieu_tuong,
            COUNT(sp.ma_san_pham) AS so_san_pham,
            COALESCE(SUM(sp.ton_kho), 0) AS tong_ton_kho
     FROM DanhMuc dm
     LEFT JOIN SanPham sp ON sp.ma_danh_muc = dm.ma_danh_muc AND sp.trang_thai = 'active'
     GROUP BY dm.ma_danh_muc
     ORDER BY so_san_pham DESC"
)->fetchAll();

json_response([
    'kpi' => $kpi,
    'series' => $series,
    'series_total' => $seriesTotal,
    'top_products' => $topProducts,
    'low_stock' => $lowStock,
    'category_stats' => $categoryStats,
]);
