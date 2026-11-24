-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 24, 2026 at 05:24 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pawly_petshop`
--

-- --------------------------------------------------------

--
-- Table structure for table `caidat`
--

CREATE TABLE `caidat` (
  `khoa` varchar(80) NOT NULL,
  `gia_tri` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `caidat`
--

INSERT INTO `caidat` (`khoa`, `gia_tri`, `updated_at`) VALUES
('bank_account_name', 'NGUYEN NGOC YEN VY', '2026-11-23 14:30:55'),
('bank_account_no', '0969620300', '2026-11-23 14:30:55'),
('bank_name', 'MB Bank', '2026-11-23 14:30:55'),
('bank_qr_image', 'uploads/store/qr_20261124_145835_987b5e54.jpg', '2026-11-24 07:58:35'),
('bank_transfer_note', 'GOC NHO CO EM chuyen khoan mua do', '2026-11-23 14:30:02'),
('insights', '1', '2026-11-21 05:53:47'),
('notifications', '1', '2026-11-21 05:53:47'),
('reg_otp_enabled', '1', '2026-11-23 15:26:29'),
('sms_api_key', '', '2026-11-23 15:26:29'),
('sms_brandname', '', '2026-11-23 15:26:29'),
('sms_gateway_url', '', '2026-11-23 15:36:30'),
('sms_provider', 'demo', '2026-11-23 15:26:29'),
('sms_secret_key', '', '2026-11-23 15:26:29'),
('smtp_from_name', 'Góc nhỏ có em', '2026-11-22 10:47:26'),
('smtp_host', 'smtp.gmail.com', '2026-11-21 14:19:07'),
('smtp_pass', 'exotjurimghtwmbx', '2026-11-21 15:04:28'),
('smtp_port', '587', '2026-11-21 14:19:07'),
('smtp_secure', 'tls', '2026-11-21 14:19:07'),
('smtp_user', 'gocnhocoem@gmail.com', '2026-11-21 15:04:28'),
('store_address', '113/1C, Đường 8/3, Khóm 4, Phường Thanh Đức, Thành Phố Vĩnh Long, Vĩnh Long', '2026-11-22 10:55:47'),
('store_hotline', '0969620300', '2026-11-22 10:55:47'),
('store_logo', 'assets/images/logo.png', '2026-11-23 14:16:20'),
('store_name', 'Góc nhỏ có em', '2026-11-21 05:53:47'),
('store_slogan', 'Nâng niu từng khoảnh khắc bên bé cưng', '2026-11-21 05:53:47');

-- --------------------------------------------------------

--
-- Table structure for table `chitietdonhang`
--

CREATE TABLE `chitietdonhang` (
  `ma_chi_tiet` int(10) UNSIGNED NOT NULL,
  `ma_don_hang` int(10) UNSIGNED NOT NULL,
  `ma_san_pham` int(10) UNSIGNED NOT NULL,
  `phan_loai` varchar(255) NOT NULL DEFAULT '',
  `so_luong` int(11) NOT NULL,
  `don_gia` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chitietdonhang`
--

INSERT INTO `chitietdonhang` (`ma_chi_tiet`, `ma_don_hang`, `ma_san_pham`, `phan_loai`, `so_luong`, `don_gia`) VALUES
(1, 1, 1, '', 1, 285000.00),
(2, 1, 2, '', 2, 29000.00),
(3, 2, 8, '', 1, 165000.00),
(4, 2, 12, '', 1, 320000.00),
(5, 3, 3, '', 1, 245000.00),
(6, 3, 6, '', 1, 89000.00),
(7, 4, 8, '', 1, 165000.00),
(8, 4, 11, '', 1, 79000.00),
(9, 5, 12, 'Kích cỡ: Size L (70cm · 9–18kg) · Màu sắc: Hồng phấn', 2, 320000.00),
(10, 6, 11, 'Kích cỡ: M (4–8kg · cổ 26–36cm) · Màu sắc: Kem sữa', 1, 79000.00),
(12, 8, 11, 'Kích cỡ: S (1–4kg · cổ 18–26cm) · Màu sắc: Hồng phấn', 1, 79000.00),
(18, 14, 9, 'Kích cỡ đầu lược: Size S (Mèo & cún nhỏ) · Màu sắc: Xanh bạc hà', 1, 95000.00),
(19, 15, 10, 'Dung tích: Chai 60ml · Phù hợp cho bé: Dành cho Mèo', 1, 115000.00),
(20, 16, 12, 'Kích cỡ: Size M (55cm · 4–9kg) · Màu sắc: Xám tro', 4, 320000.00),
(24, 19, 11, 'Kích cỡ: M (4–8kg · cổ 26–36cm) · Màu sắc: Kem sữa', 1, 79000.00),
(25, 20, 10, 'Dung tích: Chai 60ml · Phù hợp cho bé: Dành cho Chó', 1, 115000.00),
(26, 21, 11, 'Kích cỡ: M (4–8kg · cổ 26–36cm) · Màu sắc: Kem sữa', 1, 79000.00),
(27, 22, 11, 'Kích cỡ: M (4–8kg · cổ 26–36cm) · Màu sắc: Kem sữa', 1, 79000.00),
(28, 23, 11, 'Kích cỡ: S (1–4kg · cổ 18–26cm) · Màu sắc: Tím lavender', 1, 79000.00);

-- --------------------------------------------------------

--
-- Table structure for table `chitietgiohang`
--

CREATE TABLE `chitietgiohang` (
  `ma_chi_tiet` int(10) UNSIGNED NOT NULL,
  `ma_gio_hang` int(10) UNSIGNED NOT NULL,
  `ma_san_pham` int(10) UNSIGNED NOT NULL,
  `phan_loai` varchar(255) NOT NULL DEFAULT '',
  `so_luong` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chitietphieunhap`
--

CREATE TABLE `chitietphieunhap` (
  `ma_chi_tiet` int(10) UNSIGNED NOT NULL,
  `ma_phieu_nhap` int(10) UNSIGNED NOT NULL,
  `ma_san_pham` int(10) UNSIGNED NOT NULL,
  `so_luong` int(11) NOT NULL,
  `gia_nhap` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chitietphieunhap`
--

INSERT INTO `chitietphieunhap` (`ma_chi_tiet`, `ma_phieu_nhap`, `ma_san_pham`, `so_luong`, `gia_nhap`) VALUES
(1, 1, 1, 15, 200000.00),
(2, 1, 2, 40, 18000.00),
(3, 1, 3, 4, 175000.00);

-- --------------------------------------------------------

--
-- Table structure for table `cuochoithoaiai`
--

CREATE TABLE `cuochoithoaiai` (
  `ma_cuoc_hoi_thoai` int(10) UNSIGNED NOT NULL,
  `ma_khach_hang` int(10) UNSIGNED DEFAULT NULL,
  `ma_tai_khoan` int(10) UNSIGNED DEFAULT NULL,
  `loai_tro_ly` enum('customer','admin') NOT NULL DEFAULT 'customer',
  `thoi_gian_bat_dau` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cuochoithoaiai`
--

INSERT INTO `cuochoithoaiai` (`ma_cuoc_hoi_thoai`, `ma_khach_hang`, `ma_tai_khoan`, `loai_tro_ly`, `thoi_gian_bat_dau`) VALUES
(1, 4, 2, 'admin', '2026-11-21 06:00:39'),
(2, 5, 4, 'customer', '2026-11-21 15:29:57');

-- --------------------------------------------------------

--
-- Table structure for table `danhgia`
--

CREATE TABLE `danhgia` (
  `ma_danh_gia` int(10) UNSIGNED NOT NULL,
  `ma_khach_hang` int(10) UNSIGNED NOT NULL,
  `ma_san_pham` int(10) UNSIGNED DEFAULT NULL,
  `ma_dich_vu` int(10) UNSIGNED DEFAULT NULL,
  `so_sao` tinyint(3) UNSIGNED NOT NULL,
  `noi_dung` text DEFAULT NULL,
  `hinh_anh` varchar(255) DEFAULT NULL,
  `ngay_tao` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `danhgia`
--

INSERT INTO `danhgia` (`ma_danh_gia`, `ma_khach_hang`, `ma_san_pham`, `ma_dich_vu`, `so_sao`, `noi_dung`, `hinh_anh`, `ngay_tao`) VALUES
(1, 1, 1, NULL, 5, 'Mèo nhà mình rất thích hạt này, ăn ngon miệng và ít rụng lông hơn hẳn!', NULL, '2026-11-21 05:53:47'),
(2, 2, 8, NULL, 5, 'Sữa tắm mùi thơm dịu nhẹ, tắm xong lông bé mềm mượt lắm.', NULL, '2026-11-21 05:53:47'),
(3, 1, NULL, 2, 5, 'Nhân viên spa ở Góc nhỏ có em cực kỳ nhẹ nhàng, bé Bông đi về vui vẻ thơm tho.', NULL, '2026-11-21 05:53:47'),
(5, 5, 11, NULL, 4, 'Đóng gói cẩn thận, giao nhanh.', NULL, '2026-11-21 11:24:36');

-- --------------------------------------------------------

--
-- Table structure for table `danhmuc`
--

CREATE TABLE `danhmuc` (
  `ma_danh_muc` int(10) UNSIGNED NOT NULL,
  `slug` varchar(60) NOT NULL,
  `ten_danh_muc` varchar(100) NOT NULL,
  `mo_ta` varchar(255) DEFAULT NULL,
  `bieu_tuong` varchar(16) NOT NULL DEFAULT '?',
  `hinh_anh` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `danhmuc`
--

INSERT INTO `danhmuc` (`ma_danh_muc`, `slug`, `ten_danh_muc`, `mo_ta`, `bieu_tuong`, `hinh_anh`) VALUES
(1, 'food', 'Thức ăn', 'Hạt khô, pate, snack dinh dưỡng mỗi ngày cho chó mèo', '🥣', 'assets/images/categories/cat_food.jpg'),
(2, 'toy', 'Đồ chơi', 'Đồ chơi vận động, trí tuệ và xả stress cho thú cưng', '🧸', 'assets/images/categories/cat_toy.jpg'),
(3, 'care', 'Chăm sóc', 'Sữa tắm thảo mộc, vệ sinh tai mắt, lược chải lông', '🧴', 'assets/images/categories/cat_care.jpg'),
(4, 'accessory', 'Phụ kiện', 'Vòng cổ, dây dắt, nệm ngủ, bát ăn đáng yêu', '🎀', 'assets/images/categories/cat_accessory.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `dichvu`
--

CREATE TABLE `dichvu` (
  `ma_dich_vu` int(10) UNSIGNED NOT NULL,
  `ten_dich_vu` varchar(120) NOT NULL,
  `mo_ta` text DEFAULT NULL,
  `gia` decimal(12,2) NOT NULL DEFAULT 0.00,
  `thoi_luong` int(11) NOT NULL DEFAULT 45 COMMENT 'Phút',
  `bieu_tuong` varchar(16) NOT NULL DEFAULT '?',
  `hinh_anh` varchar(255) DEFAULT NULL,
  `trang_thai` enum('active','inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `dichvu`
--

INSERT INTO `dichvu` (`ma_dich_vu`, `ten_dich_vu`, `mo_ta`, `gia`, `thoi_luong`, `bieu_tuong`, `hinh_anh`, `trang_thai`) VALUES
(1, 'Tắm & Vệ sinh cơ bản', 'Tắm sữa tắm thảo mộc, sấy khô bông xù, vệ sinh tai, cắt mài móng và cạo lông bàn chân.', 120000.00, 45, '🛁', 'assets/images/services/svc1_bath.jpg', 'active'),
(2, 'Gói Spa thư giãn toàn diện', 'Tắm dưỡng lông tinh dầu, massage thư giãn, ủ mềm mượt lông, vệ sinh tai mắt và xịt dưỡng thơm.', 219000.00, 75, '🎀', 'assets/images/services/svc2_spa.jpg', 'active'),
(3, 'Cắt tỉa tạo kiểu lông', 'Tắm sạch và cắt tỉa tạo kiểu gọn gàng, đáng yêu theo giống loài và yêu cầu của chủ nuôi.', 200000.00, 90, '✂️', 'assets/images/services/svc3_grooming.jpg', 'active'),
(4, 'Chăm sóc móng & vệ sinh tai', 'Cắt mài móng an toàn, vệ sinh lỗ tai sạch sẽ và chải gỡ lông rối nhanh gọn.', 50000.00, 25, '🛁', 'assets/images/services/svc4_nail_ear.jpg', 'active'),
(5, 'Tiêm phòng vắc-xin định kỳ', 'Khám sàng lọc sức khỏe trước tiêm, tư vấn phác đồ vắc-xin phù hợp cho chó mèo (5 bệnh, 7 bệnh, phòng dại, giảm bạch cầu...) và cấp sổ theo dõi tiêm chủng.', 0.00, 30, '💉', 'assets/images/services/svc5_vaccine.jpg', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `donhang`
--

CREATE TABLE `donhang` (
  `ma_don_hang` int(10) UNSIGNED NOT NULL,
  `ma_don_code` varchar(30) NOT NULL,
  `ma_khach_hang` int(10) UNSIGNED DEFAULT NULL,
  `ma_nhan_vien_xu_ly` int(10) UNSIGNED DEFAULT NULL,
  `ten_nguoi_nhan` varchar(120) NOT NULL,
  `so_dien_thoai` varchar(20) NOT NULL,
  `dia_chi_nhan` varchar(255) NOT NULL,
  `ghi_chu` varchar(255) DEFAULT NULL,
  `phuong_thuc_van_chuyen` enum('standard','express') NOT NULL DEFAULT 'standard',
  `phi_van_chuyen` decimal(12,2) NOT NULL DEFAULT 0.00,
  `ngay_dat` timestamp NOT NULL DEFAULT current_timestamp(),
  `tong_tien` decimal(12,2) NOT NULL DEFAULT 0.00,
  `trang_thai` enum('pending','confirmed','shipping','done','returned','cancelled') NOT NULL DEFAULT 'pending',
  `ngay_giao` datetime DEFAULT NULL,
  `khong_tra_hang` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `donhang`
--

INSERT INTO `donhang` (`ma_don_hang`, `ma_don_code`, `ma_khach_hang`, `ma_nhan_vien_xu_ly`, `ten_nguoi_nhan`, `so_dien_thoai`, `dia_chi_nhan`, `ghi_chu`, `phuong_thuc_van_chuyen`, `phi_van_chuyen`, `ngay_dat`, `tong_tien`, `trang_thai`, `ngay_giao`, `khong_tra_hang`, `updated_at`) VALUES
(1, 'GN-1001', 1, 1, 'Nguyễn Minh Anh', '0987654321', '128 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh', 'Giao giờ hành chính giúp mình', 'standard', 0.00, '2026-11-16 05:53:47', 343000.00, 'done', '2026-11-21 12:53:47', 0, '2026-11-24 08:44:32'),
(2, 'GN-1002', 2, 1, 'Lê Bảo Châu', '0938112233', '45 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh', '', 'standard', 0.00, '2026-11-18 05:53:47', 485000.00, 'done', '2026-11-21 12:53:47', 0, '2026-11-24 08:44:32'),
(3, 'GN-1003', 3, NULL, 'Phạm Gia Huy', '0977445566', '19 Lê Lợi, Quận 1, TP. Hồ Chí Minh', 'Gọi trước khi giao 15 phút', 'standard', 0.00, '2026-11-20 05:53:47', 334000.00, 'shipping', NULL, 0, '2026-11-21 05:53:47'),
(4, 'GN-1004', 1, NULL, 'Nguyễn Minh Anh', '0987654321', '128 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh', 'Chọn nơ màu hồng pastel nhé', 'standard', 0.00, '2026-11-21 05:53:47', 244000.00, 'pending', NULL, 0, '2026-11-21 05:53:47'),
(5, 'GN-1005', 5, NULL, 'Nguyễn Ngọc Yến Vy', '0969620300', 'Bình Dương', '', 'standard', 0.00, '2026-11-21 10:38:34', 640000.00, 'cancelled', NULL, 0, '2026-11-21 10:57:20'),
(6, 'GN-1006', 5, NULL, 'Nguyễn Ngọc Yến Vy', '0969620300', 'Bình Dương', '', 'express', 35000.00, '2026-11-21 10:57:13', 114000.00, 'cancelled', NULL, 0, '2026-11-21 10:57:24'),
(8, 'GN-1007', 5, 1, 'Nguyễn Ngọc Yến Vy', '0969620300', 'Bình Dương', '', 'standard', 20000.00, '2026-11-21 11:23:25', 99000.00, 'done', '2026-11-21 18:24:18', 0, '2026-11-24 08:44:32'),
(14, 'GN-1009', 5, 1, 'Nguyễn Ngọc Yến Vy', '0969620300', 'Bình Dương', '', 'standard', 20000.00, '2026-11-21 14:26:12', 115000.00, 'done', '2026-11-21 21:28:59', 0, '2026-11-24 08:44:32'),
(15, 'GN-1015', 5, NULL, 'Nguyễn Ngọc Yến Vy', '0969620300', 'Bình Dương', '', 'standard', 20000.00, '2026-11-21 14:34:10', 135000.00, 'cancelled', NULL, 0, '2026-11-21 14:34:33'),
(16, 'GN-1016', 5, NULL, 'Nguyễn Ngọc Yến Vy', '0969620300', 'Vĩnh Long', '', 'standard', 0.00, '2026-11-22 06:40:24', 1280000.00, 'cancelled', NULL, 0, '2026-11-22 06:45:59'),
(19, 'GN-1017', NULL, 2, 'Khách lẻ', 'Tại quầy', 'Mua trực tiếp tại quầy — Góc nhỏ có em', '', 'standard', 0.00, '2026-11-22 15:13:42', 79000.00, 'done', '2026-11-22 22:13:42', 0, '2026-11-24 08:44:32'),
(20, 'GN-1020', 5, 2, 'Nguyễn Ngọc Yến Vy', '0969620300', 'Mua trực tiếp tại quầy — Góc nhỏ có em', '', 'standard', 0.00, '2026-11-23 15:06:42', 115000.00, 'done', '2026-11-23 22:06:42', 0, '2026-11-24 08:44:32'),
(21, 'GN-1021', NULL, 1, 'Khách lẻ', 'Tại quầy', 'Mua trực tiếp tại quầy — Góc nhỏ có em', '', 'standard', 0.00, '2026-11-24 08:24:26', 79000.00, 'done', '2026-11-24 15:24:26', 0, '2026-11-24 08:44:32'),
(22, 'GN-1022', NULL, 2, 'Khách lẻ', 'Tại quầy', 'Mua trực tiếp tại quầy — Góc nhỏ có em', '', 'standard', 0.00, '2026-11-24 08:47:07', 79000.00, 'done', '2026-11-24 15:47:07', 0, '2026-11-24 08:47:07'),
(23, 'GN-1023', NULL, 2, 'Khách lẻ', 'Tại quầy', 'Mua trực tiếp tại quầy — Góc nhỏ có em', '', 'standard', 0.00, '2026-11-24 08:48:25', 79000.00, 'done', '2026-11-24 15:48:25', 0, '2026-11-24 08:48:25');

-- --------------------------------------------------------

--
-- Table structure for table `emailthongbao`
--

CREATE TABLE `emailthongbao` (
  `ma_email` int(10) UNSIGNED NOT NULL,
  `ma_don_hang` int(10) UNSIGNED DEFAULT NULL,
  `ma_khach_hang` int(10) UNSIGNED DEFAULT NULL,
  `email_nhan` varchar(150) NOT NULL,
  `tieu_de` varchar(255) NOT NULL,
  `noi_dung_html` mediumtext NOT NULL,
  `loai` enum('order_approved','order_rejected','general') NOT NULL DEFAULT 'general',
  `trang_thai_gui` enum('sent_smtp','logged_local','failed') NOT NULL DEFAULT 'logged_local',
  `ghi_chu_gui` varchar(255) DEFAULT NULL,
  `da_doc` tinyint(1) NOT NULL DEFAULT 0,
  `ngay_gui` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `emailthongbao`
--

INSERT INTO `emailthongbao` (`ma_email`, `ma_don_hang`, `ma_khach_hang`, `email_nhan`, `tieu_de`, `noi_dung_html`, `loai`, `trang_thai_gui`, `ghi_chu_gui`, `da_doc`, `ngay_gui`) VALUES
(3, 14, 5, 'nguyengocyenvyy@gmail.com', '[Góc nhỏ có em] Đơn hàng #GN-1009 đã được duyệt & đang vận chuyển', '<!DOCTYPE html><html lang=\"vi\"><head><meta charset=\"UTF-8\"></head><body style=\"margin:0;padding:18px;background:#fff7fa;font-family:Segoe UI,Arial,sans-serif\"><div style=\"max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #f6dce7;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(223,88,137,.10)\"><div style=\"background:linear-gradient(120deg,#f69ab9,#df5889);padding:22px 24px;color:#ffffff\"><div style=\"font-size:12px;letter-spacing:1.5px;font-weight:700;opacity:.92\">GÓC NHỎ CÓ EM · PET SHOP &amp; AI CARE</div><h2 style=\"margin:6px 0 0;font-size:20px;line-height:1.35\">Đơn hàng #GN-1009 của bạn đã được duyệt và đang vận chuyển!</h2></div><div style=\"padding:22px 24px\"><div style=\"display:inline-block;background:#e8f8f0;color:#1d845f;font-size:11px;font-weight:800;padding:5px 12px;border-radius:99px;margin-bottom:14px\">ĐƠN HÀNG ĐÃ ĐƯỢC DUYỆT</div><p style=\"margin:0 0 14px;font-size:14px;line-height:1.65;color:#574859\">Xin chào <strong>Nguyễn Ngọc Yến Vy</strong>,<br>Nhân viên <strong>Góc nhỏ có em</strong> đã xác nhận và bàn giao đơn hàng <strong>#GN-1009</strong> cho đơn vị vận chuyển. Khi nhận được hàng, bạn hãy vào mục <strong>Đơn hàng → Chờ vận chuyển</strong> và bấm nút <strong>Đã nhận</strong> nhé!</p><table style=\"width:100%;border-collapse:collapse;margin:10px 0 14px\"><thead><tr style=\"background:#fff5f9\"><th style=\"padding:9px 8px;text-align:left;font-size:12px;color:#8c7486\">Sản phẩm</th><th style=\"padding:9px 8px;text-align:center;font-size:12px;color:#8c7486\">SL</th><th style=\"padding:9px 8px;text-align:right;font-size:12px;color:#8c7486\">Thành tiền</th></tr></thead><tbody><tr><td style=\"padding:10px 8px;border-bottom:1px solid #f4e4ec;font-size:13px;color:#423444\"><strong>Lược chải lông gỡ rối có nút đẩy lông thông minh</strong><div style=\"font-size:12px;color:#a8486e;margin-top:2px\">Kích cỡ đầu lược: Size S (Mèo &amp; cún nhỏ) · Màu sắc: Xanh bạc hà</div></td><td style=\"padding:10px 8px;border-bottom:1px solid #f4e4ec;text-align:center;font-size:13px;color:#6e5f70\">×1</td><td style=\"padding:10px 8px;border-bottom:1px solid #f4e4ec;text-align:right;font-size:13px;font-weight:700;color:#df5889\">95.000 ₫</td></tr></tbody></table><div style=\"background:#fff9fb;border:1px solid #f5e2ec;border-radius:12px;padding:12px 14px;font-size:13px;color:#5b4c5e;line-height:1.75\"><div><strong>Người nhận:</strong> Nguyễn Ngọc Yến Vy (0969620300)</div><div><strong>Địa chỉ:</strong> Bình Dương</div><div><strong>Vận chuyển:</strong> Giao hàng thường (2–4 ngày làm việc) · Phí: 20.000 ₫</div><div><strong>Thanh toán:</strong> Thanh toán khi nhận hàng (COD)</div><div style=\"margin-top:6px;padding-top:6px;border-top:1px dashed #efcad9;font-size:15px\"><strong>Tổng cộng:</strong> <strong style=\"color:#df5889\">115.000 ₫</strong></div></div><p style=\"margin:16px 0 0;font-size:12px;color:#938196;line-height:1.6\">Cần hỗ trợ thêm? Liên hệ Hotline <strong>0901 234 567</strong> · 128 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh<br>Trân trọng,<br><strong>Đội ngũ Góc nhỏ có em 🐾</strong></p></div></div></body></html>', 'order_approved', 'logged_local', 'Chưa cấu hình SMTP Gmail — đã lưu thư vào Hộp thư Email trên hệ thống.', 1, '2026-11-21 14:26:44'),
(4, 15, 5, 'nguyengocyenvyy@gmail.com', '[Góc nhỏ có em] Thông báo đơn hàng #GN-1015 không được duyệt', '<!DOCTYPE html><html lang=\"vi\"><head><meta charset=\"UTF-8\"></head><body style=\"margin:0;padding:18px;background:#fff7fa;font-family:Segoe UI,Arial,sans-serif\"><div style=\"max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #f6dce7;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(223,88,137,.10)\"><div style=\"background:linear-gradient(120deg,#f69ab9,#df5889);padding:22px 24px;color:#ffffff\"><div style=\"font-size:12px;letter-spacing:1.5px;font-weight:700;opacity:.92\">GÓC NHỎ CÓ EM · PET SHOP &amp; AI CARE</div><h2 style=\"margin:6px 0 0;font-size:20px;line-height:1.35\">Rất tiếc, đơn hàng #GN-1015 của bạn chưa được duyệt</h2></div><div style=\"padding:22px 24px\"><div style=\"display:inline-block;background:#ffecee;color:#c63b5a;font-size:11px;font-weight:800;padding:5px 12px;border-radius:99px;margin-bottom:14px\">ĐƠN HÀNG KHÔNG ĐƯỢC DUYỆT</div><p style=\"margin:0 0 12px;font-size:14px;line-height:1.65;color:#574859\">Xin chào <strong>Nguyễn Ngọc Yến Vy</strong>,<br>Chúng tôi rất tiếc phải thông báo đơn hàng <strong>#GN-1015</strong> của bạn hiện không được duyệt và đã chuyển sang trạng thái hủy.</p><div style=\"background:#fff2f5;border:1px solid #f5bfd0;border-radius:12px;padding:12px 14px;margin:0 0 14px;font-size:13px;color:#a83254\"><strong>Lý do:</strong> Sản phẩm tạm hết hàng hoặc thông tin xác nhận đơn chưa hợp lệ.</div><table style=\"width:100%;border-collapse:collapse;margin:10px 0 14px\"><thead><tr style=\"background:#fff5f9\"><th style=\"padding:9px 8px;text-align:left;font-size:12px;color:#8c7486\">Sản phẩm</th><th style=\"padding:9px 8px;text-align:center;font-size:12px;color:#8c7486\">SL</th><th style=\"padding:9px 8px;text-align:right;font-size:12px;color:#8c7486\">Thành tiền</th></tr></thead><tbody><tr><td style=\"padding:10px 8px;border-bottom:1px solid #f4e4ec;font-size:13px;color:#423444\"><strong>Dung dịch vệ sinh tai dịu nhẹ cho thú cưng 120ml</strong><div style=\"font-size:12px;color:#a8486e;margin-top:2px\">Dung tích: Chai 60ml · Phù hợp cho bé: Dành cho Mèo</div></td><td style=\"padding:10px 8px;border-bottom:1px solid #f4e4ec;text-align:center;font-size:13px;color:#6e5f70\">×1</td><td style=\"padding:10px 8px;border-bottom:1px solid #f4e4ec;text-align:right;font-size:13px;font-weight:700;color:#df5889\">115.000 ₫</td></tr></tbody></table><div style=\"background:#fff9fb;border:1px solid #f5e2ec;border-radius:12px;padding:12px 14px;font-size:13px;color:#5b4c5e;line-height:1.75\"><div><strong>Người nhận:</strong> Nguyễn Ngọc Yến Vy (0969620300)</div><div><strong>Địa chỉ:</strong> Bình Dương</div><div><strong>Vận chuyển:</strong> Giao hàng thường (2–4 ngày làm việc) · Phí: 20.000 ₫</div><div><strong>Thanh toán:</strong> Thanh toán khi nhận hàng (COD)</div><div style=\"margin-top:6px;padding-top:6px;border-top:1px dashed #efcad9;font-size:15px\"><strong>Tổng cộng:</strong> <strong style=\"color:#df5889\">135.000 ₫</strong></div></div><p style=\"margin:16px 0 0;font-size:12px;color:#938196;line-height:1.6\">Cần hỗ trợ thêm? Liên hệ Hotline <strong>0901 234 567</strong> · 128 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh<br>Trân trọng,<br><strong>Đội ngũ Góc nhỏ có em 🐾</strong></p></div></div></body></html>', 'order_rejected', 'logged_local', 'Chưa cấu hình SMTP Gmail — đã lưu thư vào Hộp thư Email trên hệ thống.', 1, '2026-11-21 14:34:33'),
(5, NULL, NULL, '24004006@st.vlute.edu.vn', '[Góc nhỏ có em] Kiểm tra kết nối Email SMTP thành công', '<div style=\"font-family:Segoe UI,Arial,sans-serif;padding:20px;background:#fff7fa;border-radius:14px;border:1px solid #f6dce7\"><h2 style=\"color:#df5889;margin:0 0 8px\">🐾 Kết nối Email thành công!</h2><p style=\"color:#5b4c5e;font-size:14px;line-height:1.6\">Hệ thống <strong>Góc nhỏ có em</strong> đã sẵn sàng gửi thông báo duyệt / không duyệt đơn hàng tự động tới email khách hàng.</p></div>', 'general', 'sent_smtp', 'Đã gửi email thành công tới 24004006@st.vlute.edu.vn qua SMTP.', 1, '2026-11-21 15:05:00'),
(6, NULL, NULL, 'nguyengocyenvyy@gmail.com', '[Góc nhỏ có em] Kiểm tra kết nối Email SMTP thành công', '<div style=\"font-family:Segoe UI,Arial,sans-serif;padding:20px;background:#fff7fa;border-radius:14px;border:1px solid #f6dce7\"><h2 style=\"color:#df5889;margin:0 0 8px\">🐾 Kết nối Email thành công!</h2><p style=\"color:#5b4c5e;font-size:14px;line-height:1.6\">Hệ thống <strong>Góc nhỏ có em</strong> đã sẵn sàng gửi thông báo duyệt / không duyệt đơn hàng tự động tới email khách hàng.</p></div>', 'general', 'sent_smtp', 'Đã gửi email thành công tới nguyengocyenvyy@gmail.com qua SMTP.', 1, '2026-11-21 15:05:36'),
(7, NULL, NULL, 'nguyengocyenvyy@gmail.com', '[Góc nhỏ có em] Kiểm tra kết nối Email SMTP thành công', '<div style=\"font-family:Segoe UI,Arial,sans-serif;padding:20px;background:#fff7fa;border-radius:14px;border:1px solid #f6dce7\"><h2 style=\"color:#df5889;margin:0 0 8px\">🐾 Kết nối Email thành công!</h2><p style=\"color:#5b4c5e;font-size:14px;line-height:1.6\">Hệ thống <strong>Góc nhỏ có em</strong> đã sẵn sàng gửi thông báo duyệt / không duyệt đơn hàng tự động tới email khách hàng.</p></div>', 'general', 'sent_smtp', 'Đã gửi email thành công tới nguyengocyenvyy@gmail.com qua SMTP.', 1, '2026-11-21 15:06:35'),
(9, NULL, NULL, '24004011@st.vlute.edu.vn', '[Góc nhỏ có em] Kiểm tra kết nối Email SMTP thành công', '<div style=\"font-family:Segoe UI,Arial,sans-serif;padding:20px;background:#fff7fa;border-radius:14px;border:1px solid #f6dce7\"><h2 style=\"color:#df5889;margin:0 0 8px\">🐾 Kết nối Email thành công!</h2><p style=\"color:#5b4c5e;font-size:14px;line-height:1.6\">Hệ thống <strong>Góc nhỏ có em</strong> đã sẵn sàng gửi thông báo duyệt / không duyệt đơn hàng tự động tới email khách hàng.</p></div>', 'general', 'sent_smtp', 'Đã gửi email thành công tới 24004011@st.vlute.edu.vn qua SMTP.', 1, '2026-11-22 10:48:05');

-- --------------------------------------------------------

--
-- Table structure for table `giohang`
--

CREATE TABLE `giohang` (
  `ma_gio_hang` int(10) UNSIGNED NOT NULL,
  `ma_khach_hang` int(10) UNSIGNED NOT NULL,
  `ngay_tao` timestamp NOT NULL DEFAULT current_timestamp(),
  `trang_thai` enum('active','checked_out') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `giohang`
--

INSERT INTO `giohang` (`ma_gio_hang`, `ma_khach_hang`, `ngay_tao`, `trang_thai`) VALUES
(1, 4, '2026-11-21 05:56:07', 'active'),
(2, 1, '2026-11-21 06:04:53', 'active'),
(3, 5, '2026-11-21 07:57:02', 'active'),
(4, 6, '2026-11-21 09:53:47', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `hinhanhsanpham`
--

CREATE TABLE `hinhanhsanpham` (
  `ma_hinh_anh` int(10) UNSIGNED NOT NULL,
  `ma_san_pham` int(10) UNSIGNED NOT NULL,
  `duong_dan` varchar(255) NOT NULL,
  `la_anh_chinh` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hinhanhsanpham`
--

INSERT INTO `hinhanhsanpham` (`ma_hinh_anh`, `ma_san_pham`, `duong_dan`, `la_anh_chinh`) VALUES
(1, 1, 'uploads/products/sp1_cat_kibble.jpg', 1),
(2, 2, 'uploads/products/sp2_cat_pate.jpg', 1),
(3, 3, 'uploads/products/sp3_puppy_food.jpg', 1),
(4, 4, 'uploads/products/sp4_dental_chew.jpg', 1),
(5, 5, 'uploads/products/sp5_cat_wand.jpg', 1),
(6, 6, 'uploads/products/sp6_dog_ball.jpg', 1),
(7, 7, 'uploads/products/sp7_cat_scratcher.jpg', 1),
(8, 8, 'uploads/products/sp8_pet_shampoo.jpg', 1),
(9, 9, 'uploads/products/sp9_pet_brush.jpg', 1),
(10, 10, 'uploads/products/sp10_ear_cleaner.jpg', 1),
(11, 11, 'uploads/products/sp11_pastel_collar.jpg', 1),
(12, 12, 'uploads/products/sp12_donut_bed.jpg', 1);

-- --------------------------------------------------------

--
-- Table structure for table `hoadon`
--

CREATE TABLE `hoadon` (
  `ma_hoa_don` int(10) UNSIGNED NOT NULL,
  `ma_hoa_don_code` varchar(30) NOT NULL,
  `ma_don_hang` int(10) UNSIGNED NOT NULL,
  `kenh_ban` enum('tai_quay','online') NOT NULL DEFAULT 'online',
  `ma_nhan_vien_lap` int(10) UNSIGNED DEFAULT NULL,
  `ten_nguoi_lap` varchar(120) NOT NULL DEFAULT 'Hệ thống',
  `ten_khach_hang` varchar(120) NOT NULL,
  `so_dien_thoai` varchar(20) DEFAULT NULL,
  `phuong_thuc` enum('cod','bank_transfer') NOT NULL DEFAULT 'cod',
  `tam_tinh` decimal(12,2) NOT NULL DEFAULT 0.00,
  `phi_van_chuyen` decimal(12,2) NOT NULL DEFAULT 0.00,
  `tong_tien` decimal(12,2) NOT NULL DEFAULT 0.00,
  `tien_khach_dua` decimal(12,2) DEFAULT NULL,
  `tien_thua` decimal(12,2) DEFAULT NULL,
  `ghi_chu` varchar(255) DEFAULT NULL,
  `ngay_xuat` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hoadon`
--

INSERT INTO `hoadon` (`ma_hoa_don`, `ma_hoa_don_code`, `ma_don_hang`, `kenh_ban`, `ma_nhan_vien_lap`, `ten_nguoi_lap`, `ten_khach_hang`, `so_dien_thoai`, `phuong_thuc`, `tam_tinh`, `phi_van_chuyen`, `tong_tien`, `tien_khach_dua`, `tien_thua`, `ghi_chu`, `ngay_xuat`) VALUES
(1, 'HD-20261121-0001', 1, 'online', 1, 'Nguyễn Thị Lan', 'Nguyễn Minh Anh', '0987654321', 'cod', 343000.00, 0.00, 343000.00, NULL, NULL, 'Giao giờ hành chính giúp mình', '2026-11-21 05:53:47'),
(2, 'HD-20261121-0002', 2, 'online', 1, 'Nguyễn Thị Lan', 'Lê Bảo Châu', '0938112233', 'bank_transfer', 485000.00, 0.00, 485000.00, NULL, NULL, '', '2026-11-21 05:53:47'),
(3, 'HD-20261121-0003', 8, 'online', 1, 'Nguyễn Thị Lan', 'Nguyễn Ngọc Yến Vy', '0969620300', 'bank_transfer', 79000.00, 20000.00, 99000.00, NULL, NULL, '', '2026-11-21 11:24:18'),
(4, 'HD-20261121-0004', 14, 'online', 1, 'Nguyễn Thị Lan', 'Nguyễn Ngọc Yến Vy', '0969620300', 'cod', 95000.00, 20000.00, 115000.00, NULL, NULL, '', '2026-11-21 14:28:59'),
(5, 'HD-20261122-0001', 19, 'tai_quay', 2, 'Trần Hoàng Nam', 'Khách lẻ', 'Tại quầy', 'cod', 79000.00, 0.00, 79000.00, NULL, NULL, '', '2026-11-22 15:13:42'),
(6, 'HD-20261123-0001', 20, 'tai_quay', 2, 'Trần Hoàng Nam', 'Nguyễn Ngọc Yến Vy', '0969620300', 'cod', 115000.00, 0.00, 115000.00, NULL, NULL, '', '2026-11-23 15:06:42'),
(7, 'HD-20261124-0001', 21, 'tai_quay', 1, 'Nguyễn Thị Lan', 'Khách lẻ', 'Tại quầy', 'bank_transfer', 79000.00, 0.00, 79000.00, NULL, NULL, '', '2026-11-24 08:24:26'),
(8, 'HD-20261124-0002', 22, 'tai_quay', 2, 'Trần Hoàng Nam', 'Khách lẻ', 'Tại quầy', 'cod', 79000.00, 0.00, 79000.00, 79000.00, 0.00, '', '2026-11-24 08:47:07'),
(9, 'HD-20261124-0003', 23, 'tai_quay', 2, 'Trần Hoàng Nam', 'Khách lẻ', 'Tại quầy', 'cod', 79000.00, 0.00, 79000.00, NULL, NULL, '', '2026-11-24 08:48:25');

-- --------------------------------------------------------

--
-- Table structure for table `khachhang`
--

CREATE TABLE `khachhang` (
  `ma_khach_hang` int(10) UNSIGNED NOT NULL,
  `ma_tai_khoan` int(10) UNSIGNED DEFAULT NULL,
  `ho_ten` varchar(120) NOT NULL,
  `so_dien_thoai` varchar(20) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `dia_chi` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `khachhang`
--

INSERT INTO `khachhang` (`ma_khach_hang`, `ma_tai_khoan`, `ho_ten`, `so_dien_thoai`, `email`, `dia_chi`, `created_at`) VALUES
(1, 3, 'Nguyễn Minh Anh', '0987654321', 'khachhang@gocnhocoem.vn', '128 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh', '2026-11-21 05:53:47'),
(2, NULL, 'Lê Bảo Châu', '0938112233', 'baochau@gmail.com', '45 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh', '2026-11-21 05:53:47'),
(3, NULL, 'Phạm Gia Huy', '0977445566', 'giahuy@gmail.com', '19 Lê Lợi, Quận 1, TP. Hồ Chí Minh', '2026-11-21 05:53:47'),
(4, 2, 'Trần Hoàng Nam', '0912345678', 'nhanvien@gocnhocoem.vn', '', '2026-11-21 05:56:07'),
(5, 4, 'Nguyễn Ngọc Yến Vy', '0969620300', 'nguyengocyenvyy@gmail.com', 'Vĩnh Long', '2026-11-21 07:57:01'),
(6, 1, 'Nguyễn Thị Lan', '0901234567', 'admin@gocnhocoem.vn', '', '2026-11-21 09:53:47');

-- --------------------------------------------------------

--
-- Table structure for table `lichhen`
--

CREATE TABLE `lichhen` (
  `ma_lich_hen` int(10) UNSIGNED NOT NULL,
  `ma_khach_hang` int(10) UNSIGNED DEFAULT NULL,
  `ma_thu_cung` int(10) UNSIGNED DEFAULT NULL,
  `ma_dich_vu` int(10) UNSIGNED NOT NULL,
  `ten_chu_nuoi` varchar(120) NOT NULL,
  `so_dien_thoai` varchar(20) NOT NULL,
  `ten_thu_cung` varchar(80) NOT NULL,
  `bieu_tuong` varchar(16) NOT NULL DEFAULT '?',
  `ngay_gio` datetime NOT NULL,
  `ghi_chu` varchar(255) DEFAULT NULL,
  `trang_thai` enum('pending','confirmed','done','cancelled') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lichhen`
--

INSERT INTO `lichhen` (`ma_lich_hen`, `ma_khach_hang`, `ma_thu_cung`, `ma_dich_vu`, `ten_chu_nuoi`, `so_dien_thoai`, `ten_thu_cung`, `bieu_tuong`, `ngay_gio`, `ghi_chu`, `trang_thai`, `created_at`) VALUES
(1, 1, 2, 2, 'Nguyễn Minh Anh', '0987654321', 'Bông', '🐶', '2026-11-22 12:53:47', 'Bé hơi sợ tiếng máy sấy mạnh', 'confirmed', '2026-11-21 05:53:47'),
(2, 2, 3, 1, 'Lê Bảo Châu', '0938112233', 'Cam', '🐱', '2026-11-23 12:53:47', 'Cắt thêm móng giúp bé', 'pending', '2026-11-21 05:53:47');

-- --------------------------------------------------------

--
-- Table structure for table `nhacungcap`
--

CREATE TABLE `nhacungcap` (
  `ma_ncc` int(10) UNSIGNED NOT NULL,
  `ten_ncc` varchar(150) NOT NULL,
  `so_dien_thoai` varchar(20) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `dia_chi` varchar(255) DEFAULT NULL,
  `nguoi_lien_he` varchar(120) DEFAULT NULL,
  `ghi_chu` varchar(255) DEFAULT NULL,
  `trang_thai` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `nhacungcap`
--

INSERT INTO `nhacungcap` (`ma_ncc`, `ten_ncc`, `so_dien_thoai`, `email`, `dia_chi`, `nguoi_lien_he`, `ghi_chu`, `trang_thai`, `created_at`) VALUES
(1, 'Công ty TNHH Royal Canin Việt Nam', '02838221100', 'sales@royalcanin-vn.example', 'Quận 1, TP. Hồ Chí Minh', 'Nguyễn Quốc Bảo', 'Chuyên thức ăn hạt & pate dinh dưỡng chó mèo', 'active', '2026-11-24 09:17:43'),
(2, 'Nhà phân phối Phụ kiện PetStyle', '0909556677', 'petstyle@npp.example', 'Quận Tân Bình, TP. Hồ Chí Minh', 'Lê Mỹ Duyên', 'Vòng cổ, nệm ngủ, trụ cào móng, đồ chơi', 'active', '2026-11-24 09:17:43'),
(3, 'Công ty Dược & Chăm sóc PetCare VN', '02839445566', 'order@petcarevn.example', 'Quận 7, TP. Hồ Chí Minh', 'Trần Minh Khôi', 'Sữa tắm thảo mộc, dung dịch vệ sinh tai & lược chải', 'active', '2026-11-24 09:17:43');

-- --------------------------------------------------------

--
-- Table structure for table `nhanvien`
--

CREATE TABLE `nhanvien` (
  `ma_nhan_vien` int(10) UNSIGNED NOT NULL,
  `ma_tai_khoan` int(10) UNSIGNED DEFAULT NULL,
  `ho_ten` varchar(120) NOT NULL,
  `so_dien_thoai` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `chuc_vu` varchar(100) NOT NULL DEFAULT 'Nhân viên bán hàng',
  `trang_thai` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `nhanvien`
--

INSERT INTO `nhanvien` (`ma_nhan_vien`, `ma_tai_khoan`, `ho_ten`, `so_dien_thoai`, `email`, `chuc_vu`, `trang_thai`, `created_at`) VALUES
(1, 1, 'Nguyễn Thị Lan', '0901234567', 'admin@gocnhocoem.vn', 'Quản lý cửa hàng', 'active', '2026-11-21 05:53:47'),
(2, 2, 'Trần Hoàng Nam', '0912345678', 'nhanvien@gocnhocoem.vn', 'Nhân viên bán hàng & Spa', 'active', '2026-11-21 05:53:47');

-- --------------------------------------------------------

--
-- Table structure for table `phieunhap`
--

CREATE TABLE `phieunhap` (
  `ma_phieu_nhap` int(10) UNSIGNED NOT NULL,
  `ma_phieu_code` varchar(30) NOT NULL,
  `ma_ncc` int(10) UNSIGNED NOT NULL,
  `ma_nhan_vien_nhap` int(10) UNSIGNED DEFAULT NULL,
  `ten_nguoi_nhap` varchar(120) NOT NULL,
  `ma_yeu_cau` int(10) UNSIGNED DEFAULT NULL,
  `tong_tien_nhap` decimal(12,2) NOT NULL DEFAULT 0.00,
  `ghi_chu` varchar(255) DEFAULT NULL,
  `ngay_nhap` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `phieunhap`
--

INSERT INTO `phieunhap` (`ma_phieu_nhap`, `ma_phieu_code`, `ma_ncc`, `ma_nhan_vien_nhap`, `ten_nguoi_nhap`, `ma_yeu_cau`, `tong_tien_nhap`, `ghi_chu`, `ngay_nhap`) VALUES
(1, 'PN-20261120-0001', 1, 1, 'Nguyễn Thị Lan', NULL, 4420000.00, 'Nhập bổ sung thức ăn đầu tuần', '2026-11-20 09:17:43');

-- --------------------------------------------------------

--
-- Table structure for table `quyen`
--

CREATE TABLE `quyen` (
  `ma_quyen` int(10) UNSIGNED NOT NULL,
  `ten_quyen` varchar(50) NOT NULL,
  `mo_ta` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `quyen`
--

INSERT INTO `quyen` (`ma_quyen`, `ten_quyen`, `mo_ta`) VALUES
(1, 'admin', 'Quản trị viên — toàn quyền quản lý hệ thống, nhân sự, dữ liệu và báo cáo'),
(2, 'nhan_vien', 'Nhân viên — xử lý đơn hàng, hỗ trợ khách hàng, quản lý sản phẩm và lịch hẹn'),
(3, 'khach_hang', 'Khách hàng — mua sắm, đặt lịch spa, theo dõi đơn hàng và hỏi đáp Pawly AI');

-- --------------------------------------------------------

--
-- Table structure for table `sanpham`
--

CREATE TABLE `sanpham` (
  `ma_san_pham` int(10) UNSIGNED NOT NULL,
  `ma_danh_muc` int(10) UNSIGNED NOT NULL,
  `ten_san_pham` varchar(160) NOT NULL,
  `mo_ta` text DEFAULT NULL,
  `loai_thu_cung` enum('cho','meo','ca_hai','khac') NOT NULL DEFAULT 'ca_hai',
  `gia` decimal(12,2) NOT NULL DEFAULT 0.00,
  `ton_kho` int(11) NOT NULL DEFAULT 0,
  `bieu_tuong` varchar(16) NOT NULL DEFAULT '?',
  `trang_thai` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sanpham`
--

INSERT INTO `sanpham` (`ma_san_pham`, `ma_danh_muc`, `ten_san_pham`, `mo_ta`, `loai_thu_cung`, `gia`, `ton_kho`, `bieu_tuong`, `trang_thai`, `created_at`, `updated_at`) VALUES
(1, 1, 'Hạt dinh dưỡng Royal Canin cho mèo trưởng thành 1.5kg', 'Công thức cân bằng protein và taurine giúp mèo mượt lông, tiêu hóa tốt và hạn chế búi lông.', 'meo', 285000.00, 24, '🥣', 'active', '2026-11-21 05:53:47', '2026-11-21 05:53:47'),
(2, 1, 'Pate cá hồi & bí đỏ tươi cho mèo (Gói 85g)', 'Thịt cá hồi thật kết hợp bí đỏ giàu chất xơ, không chất bảo quản, phù hợp cho cả mèo con và mèo lớn.', 'meo', 29000.00, 48, '🐟', 'active', '2026-11-21 05:53:47', '2026-11-22 12:04:19'),
(3, 1, 'Hạt hữu cơ vị gà & rau củ cho cún con 1.2kg', 'Hạt nhỏ dễ nhai, bổ sung DHA và canxi giúp chó con phát triển xương chắc khỏe.', 'cho', 245000.00, 18, '🦴', 'active', '2026-11-21 05:53:47', '2026-11-21 05:53:47'),
(4, 1, 'Bánh thưởng gặm sạch răng vị bạc hà cho chó', 'Giúp làm sạch mảng bám, thơm miệng và giảm ngứa nướu cho cún mọi độ tuổi.', 'cho', 65000.00, 7, '🍖', 'active', '2026-11-21 05:53:47', '2026-11-21 05:53:47'),
(5, 2, 'Cần câu lông vũ gắn chuông cho mèo', 'Thanh cầm nhẹ, lông vũ mềm an toàn kích thích bản năng săn mồi và vận động của mèo.', 'meo', 49000.00, 32, '🪶', 'active', '2026-11-21 05:53:47', '2026-11-21 11:20:07'),
(6, 2, 'Bóng cao su đàn hồi nhồi thưởng cho cún', 'Chất liệu cao su thiên nhiên bền bỉ, có khe nhét bánh thưởng giúp cún chơi vui không chán.', 'cho', 89000.00, 15, '🎾', 'active', '2026-11-21 05:53:47', '2026-11-21 05:53:47'),
(7, 2, 'Trụ cào móng bọc dây thừng sisal kèm quả bông', 'Bảo vệ sofa nhà bạn, giúp mèo mài móng tự nhiên và thư giãn mỗi ngày.', 'meo', 195000.00, 5, '🧸', 'active', '2026-11-21 05:53:47', '2026-11-24 09:27:57'),
(8, 3, 'Sữa tắm thảo mộc yến mạch dịu nhẹ cho chó mèo 500ml', 'Chiết xuất yến mạch và hoa cúc làm dịu da nhạy cảm, khử mùi hôi và lưu hương thơm nhẹ nhàng.', 'ca_hai', 165000.00, 22, '🧴', 'active', '2026-11-21 05:53:47', '2026-11-21 05:53:47'),
(9, 3, 'Lược chải lông gỡ rối có nút đẩy lông thông minh', 'Đầu răng tròn bọc silicon êm ái không làm xước da, giảm rụng lông bám trên quần áo.', 'ca_hai', 95000.00, 8, '🪮', 'inactive', '2026-11-21 05:53:47', '2026-11-24 10:08:51'),
(10, 3, 'Dung dịch vệ sinh tai dịu nhẹ cho thú cưng 120ml', 'Làm sạch ráy tai, giảm mùi hôi và hỗ trợ ngăn ngừa viêm tai nhẹ cho chó mèo.', 'ca_hai', 115000.00, 13, '💧', 'active', '2026-11-21 05:53:47', '2026-11-23 15:06:42'),
(11, 4, 'Vòng cổ nơ pastel kèm chuông khắc tên', 'Vải cotton mềm mại không gây cấn cổ, chốt an toàn cho mèo và chó giống nhỏ.', 'ca_hai', 79000.00, 21, '🎀', 'active', '2026-11-21 05:53:47', '2026-11-24 08:48:25'),
(12, 4, 'Nệm tròn bông mềm hình bánh donut màu hồng phấn', 'Đệm bông PP êm ái, vỏ tháo giặt dễ dàng, mang lại giấc ngủ ấm áp cho bé cưng.', 'ca_hai', 320000.00, 4, '🛏️', 'active', '2026-11-21 05:53:47', '2026-11-22 06:45:59');

-- --------------------------------------------------------

--
-- Table structure for table `smsotplog`
--

CREATE TABLE `smsotplog` (
  `ma_sms` int(10) UNSIGNED NOT NULL,
  `so_dien_thoai` varchar(20) NOT NULL,
  `so_che_an` varchar(25) NOT NULL,
  `noi_dung` varchar(255) NOT NULL,
  `nha_cung_cap` enum('demo','smsgate','speedsms','esms') NOT NULL DEFAULT 'demo',
  `trang_thai` enum('sent','demo_logged','failed') NOT NULL DEFAULT 'demo_logged',
  `ghi_chu` varchar(255) DEFAULT NULL,
  `ngay_gui` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `smsotplog`
--

INSERT INTO `smsotplog` (`ma_sms`, `so_dien_thoai`, `so_che_an`, `noi_dung`, `nha_cung_cap`, `trang_thai`, `ghi_chu`, `ngay_gui`) VALUES
(2, '0387881330', '038****330', '[GocNhoCoEm] Ma xac nhan dang ky cua ban la 147803. Hieu luc 5 phut. Khong chia se ma nay.', 'demo', 'demo_logged', 'Chế độ Demo đồ án — đã tạo tin nhắn SMS mô phỏng và lưu nhật ký SmsOtpLog.', '2026-11-23 15:33:44'),
(3, '0775394336', '077****336', '[GocNhoCoEm] Ma xac nhan dang ky cua ban la 581173. Hieu luc 5 phut. Khong chia se ma nay.', 'demo', 'demo_logged', 'Chế độ Demo đồ án — đã tạo tin nhắn SMS mô phỏng và lưu nhật ký SmsOtpLog.', '2026-11-23 15:40:45'),
(4, '0775394336', '077****336', '[GocNhoCoEm] Ma xac nhan dang ky cua ban la 349442. Hieu luc 5 phut. Khong chia se ma nay.', 'demo', 'demo_logged', 'Chế độ Demo đồ án — đã tạo tin nhắn SMS mô phỏng và lưu nhật ký SmsOtpLog.', '2026-11-23 15:42:23'),
(5, '0775394336', '077****336', '[GocNhoCoEm] Ma xac nhan dang ky cua ban la 010537. Hieu luc 5 phut. Khong chia se ma nay.', 'demo', 'demo_logged', 'Chế độ Demo đồ án — đã tạo tin nhắn SMS mô phỏng và lưu nhật ký SmsOtpLog.', '2026-11-23 15:42:55'),
(6, '0775394336', '077****336', '[GocNhoCoEm] Ma xac nhan dang ky cua ban la 447183. Hieu luc 5 phut. Khong chia se ma nay.', 'demo', 'demo_logged', 'Chế độ Demo đồ án — đã tạo tin nhắn SMS mô phỏng và lưu nhật ký SmsOtpLog.', '2026-11-23 15:45:34'),
(7, '0969620300', '096****300', '[GocNhoCoEm] Ma xac nhan dang ky cua ban la 116235. Hieu luc 5 phut. Khong chia se ma nay.', 'demo', 'demo_logged', 'Chế độ Demo đồ án — đã tạo tin nhắn SMS mô phỏng và lưu nhật ký SmsOtpLog.', '2026-11-24 07:54:02');

-- --------------------------------------------------------

--
-- Table structure for table `taikhoan`
--

CREATE TABLE `taikhoan` (
  `ma_tai_khoan` int(10) UNSIGNED NOT NULL,
  `ten_dang_nhap` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `mat_khau` varchar(255) NOT NULL,
  `ma_quyen` int(10) UNSIGNED NOT NULL,
  `trang_thai` enum('active','locked') NOT NULL DEFAULT 'active',
  `anh_dai_dien` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `taikhoan`
--

INSERT INTO `taikhoan` (`ma_tai_khoan`, `ten_dang_nhap`, `email`, `mat_khau`, `ma_quyen`, `trang_thai`, `anh_dai_dien`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'admin@gocnhocoem.vn', '$2y$10$xecBCRQ.eaXEVyBJ7uVw5.6FGaaZMZk.7gTwncKHueCKeRX7Fh5.S', 1, 'active', NULL, '2026-11-21 05:53:47', '2026-11-23 14:49:25'),
(2, 'nhanvien', 'nhanvien@gocnhocoem.vn', '$2y$10$UlIpdsmX2VQ6FpwjyoKXieDbS1X8E0Dohzj1jGN.TqXYu66jnQOrK', 2, 'active', NULL, '2026-11-21 05:53:47', '2026-11-21 05:53:47'),
(3, 'minhanh', 'khachhang@gocnhocoem.vn', '$2y$10$FvpLUheIalF84bJ1o49ruOLrJmdf/Dn3WqLDjrCmnMfALQjqtQd4O', 3, 'active', NULL, '2026-11-21 05:53:47', '2026-11-23 15:02:27'),
(4, 'nguyengocyenvyy@gmail.com', 'nguyengocyenvyy@gmail.com', '$2y$10$l1X1Tlj6H4hV6AzOTae/3ulUcQPUy.7Bm07FnTgS1l4UjBhDa/.Wm', 3, 'active', NULL, '2026-11-21 07:57:01', '2026-11-21 07:57:01');

-- --------------------------------------------------------

--
-- Table structure for table `thanhtoan`
--

CREATE TABLE `thanhtoan` (
  `ma_thanh_toan` int(10) UNSIGNED NOT NULL,
  `ma_don_hang` int(10) UNSIGNED NOT NULL,
  `phuong_thuc` enum('cod','bank_transfer') NOT NULL DEFAULT 'cod',
  `so_tien` decimal(12,2) NOT NULL,
  `trang_thai` enum('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
  `thoi_gian` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `thanhtoan`
--

INSERT INTO `thanhtoan` (`ma_thanh_toan`, `ma_don_hang`, `phuong_thuc`, `so_tien`, `trang_thai`, `thoi_gian`) VALUES
(1, 1, 'cod', 343000.00, 'paid', '2026-11-16 05:53:47'),
(2, 2, 'bank_transfer', 485000.00, 'paid', '2026-11-18 05:53:47'),
(3, 3, 'cod', 334000.00, 'unpaid', '2026-11-20 05:53:47'),
(4, 4, 'cod', 244000.00, 'unpaid', '2026-11-21 05:53:47'),
(5, 5, 'cod', 640000.00, 'unpaid', '2026-11-21 10:38:34'),
(6, 6, 'bank_transfer', 114000.00, 'unpaid', '2026-11-21 10:57:13'),
(8, 8, 'bank_transfer', 99000.00, 'paid', '2026-11-21 11:23:33'),
(14, 14, 'cod', 115000.00, 'paid', '2026-11-21 14:26:12'),
(15, 15, 'cod', 135000.00, 'unpaid', '2026-11-21 14:34:10'),
(16, 16, 'cod', 1280000.00, 'unpaid', '2026-11-22 06:40:24'),
(19, 19, 'cod', 79000.00, 'paid', '2026-11-22 15:13:42'),
(20, 20, 'cod', 115000.00, 'paid', '2026-11-23 15:06:42'),
(21, 21, 'bank_transfer', 79000.00, 'paid', '2026-11-24 08:24:26'),
(22, 22, 'cod', 79000.00, 'paid', '2026-11-24 08:47:07'),
(23, 23, 'cod', 79000.00, 'paid', '2026-11-24 08:48:25');

-- --------------------------------------------------------

--
-- Table structure for table `thongbao`
--

CREATE TABLE `thongbao` (
  `ma_thong_bao` int(10) UNSIGNED NOT NULL,
  `ma_tai_khoan` int(10) UNSIGNED DEFAULT NULL COMMENT 'NULL = thông báo chung cho quản trị/nhân viên',
  `tieu_de` varchar(160) NOT NULL,
  `noi_dung` varchar(500) NOT NULL,
  `loai` varchar(30) NOT NULL DEFAULT 'info',
  `thoi_gian` timestamp NOT NULL DEFAULT current_timestamp(),
  `da_doc` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `thongbao`
--

INSERT INTO `thongbao` (`ma_thong_bao`, `ma_tai_khoan`, `tieu_de`, `noi_dung`, `loai`, `thoi_gian`, `da_doc`) VALUES
(1, NULL, 'Đơn hàng mới #GN-1004', 'Khách hàng Nguyễn Minh Anh vừa đặt đơn hàng trị giá 244.000 ₫ đang chờ xử lý.', 'order', '2026-11-21 05:53:47', 1),
(2, NULL, 'Cảnh báo tồn kho thấp', 'Nệm tròn bông mềm (còn 4) và Trụ cào móng (còn 5) sắp hết hàng, cần kiểm tra nhập bổ sung.', 'stock', '2026-11-21 05:53:47', 1),
(3, NULL, 'Lịch hẹn Spa mới', 'Bé Cam (chủ nuôi Lê Bảo Châu) đã đặt lịch Tắm & vệ sinh cơ bản.', 'appointment', '2026-11-21 05:53:47', 1),
(8, NULL, 'Khách hàng mới đăng ký', 'nguyễn ngọc yến vy (nguyengocyenvyy@gmail.com) vừa tạo tài khoản tại Góc nhỏ có em.', 'customer', '2026-11-21 07:57:01', 1),
(10, NULL, 'Lịch hẹn mới cho bé Bông Test', 'Nguyễn Minh Anh đặt lịch Tắm & vệ sinh cơ bản khung giờ 17h - 18h ngày 21/11/2026.', 'appointment', '2026-11-21 09:25:06', 1),
(12, NULL, 'Cảnh báo tồn kho thấp', 'Sản phẩm \"Nệm tròn bông mềm hình bánh donut màu hồng phấn\" chỉ còn 2 món sau đơn #GN-1005.', 'stock', '2026-11-21 10:38:34', 1),
(13, NULL, 'Đơn hàng mới #GN-1005', 'Khách hàng Nguyễn Ngọc Yến Vy vừa đặt đơn hàng trị giá 640.000 ₫.', 'order', '2026-11-21 10:38:34', 1),
(14, NULL, 'Đơn hàng mới #GN-1006', 'Khách hàng Nguyễn Ngọc Yến Vy vừa đặt đơn hàng trị giá 114.000 ₫.', 'order', '2026-11-21 10:57:13', 1),
(15, 4, 'Cập nhật đơn #GN-1005', 'Đơn hàng #GN-1005 đã chuyển sang trạng thái: Đã hủy.', 'order', '2026-11-21 10:57:20', 0),
(16, 4, 'Cập nhật đơn #GN-1006', 'Đơn hàng #GN-1006 đã chuyển sang trạng thái: Đã hủy.', 'order', '2026-11-21 10:57:24', 0),
(17, NULL, 'Đơn hàng mới #GN-1007', 'Khách hàng Nguyễn Minh Anh vừa đặt đơn hàng trị giá 84.000 ₫.', 'order', '2026-11-21 11:20:06', 1),
(21, NULL, 'Đơn hàng mới #GN-1007', 'Khách hàng Nguyễn Ngọc Yến Vy vừa đặt đơn hàng trị giá 99.000 ₫.', 'order', '2026-11-21 11:23:25', 1),
(22, NULL, 'Đã thanh toán QR đơn #GN-1007', 'Khách hàng Nguyễn Ngọc Yến Vy đã xác nhận chuyển khoản QR cho đơn #GN-1007. Vui lòng kiểm tra và xét duyệt giao hàng.', 'order', '2026-11-21 11:23:33', 1),
(23, 4, 'Cập nhật đơn #GN-1007', 'Đơn hàng #GN-1007 đã chuyển sang trạng thái: Đang vận chuyển.', 'order', '2026-11-21 11:23:53', 0),
(24, NULL, 'Khách đã nhận đơn #GN-1007', 'Khách hàng Nguyễn Ngọc Yến Vy đã xác nhận nhận được đơn hàng #GN-1007.', 'order', '2026-11-21 11:24:18', 1),
(25, NULL, 'Đơn hàng mới #GN-1009', 'Khách hàng Nguyễn Minh Anh vừa đặt đơn hàng trị giá 49.000 ₫.', 'order', '2026-11-21 14:24:41', 1),
(26, NULL, 'Đơn hàng mới #GN-1013', 'Khách hàng Nguyễn Minh Anh vừa đặt đơn hàng trị giá 64.000 ₫.', 'order', '2026-11-21 14:24:41', 1),
(29, NULL, 'Đơn hàng mới #GN-1009', 'Khách hàng Nguyễn Ngọc Yến Vy vừa đặt đơn hàng trị giá 115.000 ₫.', 'order', '2026-11-21 14:26:12', 1),
(30, 4, 'Cập nhật đơn #GN-1009', 'Đơn hàng #GN-1009 đã chuyển sang trạng thái: Đang vận chuyển.', 'order', '2026-11-21 14:26:44', 0),
(31, 4, 'Cập nhật đơn #GN-1009', 'Đơn hàng #GN-1009 đã chuyển sang trạng thái: Đã nhận hàng.', 'order', '2026-11-21 14:28:59', 0),
(32, NULL, 'Đơn hàng mới #GN-1015', 'Khách hàng Nguyễn Ngọc Yến Vy vừa đặt đơn hàng trị giá 135.000 ₫.', 'order', '2026-11-21 14:34:10', 1),
(33, 4, 'Cập nhật đơn #GN-1015', 'Đơn hàng #GN-1015 đã chuyển sang trạng thái: Đã hủy.', 'order', '2026-11-21 14:34:33', 0),
(34, NULL, 'Khách hàng mới đăng ký', 'Khách Thử Xóa (deltest_1795275257@example.com) vừa tạo tài khoản tại Góc nhỏ có em.', 'customer', '2026-11-21 15:34:17', 1),
(35, NULL, 'Cảnh báo tồn kho thấp', 'Sản phẩm \"Nệm tròn bông mềm hình bánh donut màu hồng phấn\" chỉ còn 0 món sau đơn #GN-1016.', 'stock', '2026-11-22 06:40:24', 1),
(36, NULL, 'Đơn hàng mới #GN-1016', 'Khách hàng Nguyễn Ngọc Yến Vy vừa đặt đơn hàng trị giá 1.280.000 ₫.', 'order', '2026-11-22 06:40:24', 1),
(37, 4, 'Cập nhật đơn #GN-1016', 'Đơn hàng #GN-1016 đã chuyển sang trạng thái: Đã hủy.', 'order', '2026-11-22 06:45:59', 0),
(43, NULL, 'Bán tại quầy #GN-1017', 'Nhân viên Trần Hoàng Nam vừa hoàn tất đơn tại quầy #GN-1017 cho Khách lẻ tại quầy (79.000 ₫).', 'order', '2026-11-22 15:13:42', 0),
(44, NULL, 'Bán tại quầy #GN-1020', 'Nhân viên Trần Hoàng Nam vừa hoàn tất đơn tại quầy #GN-1020 cho Nguyễn Ngọc Yến Vy (115.000 ₫).', 'order', '2026-11-23 15:06:42', 0),
(46, NULL, 'Bán tại quầy #GN-1021', 'Nhân viên Nguyễn Thị Lan vừa hoàn tất đơn tại quầy #GN-1021 cho Khách lẻ (79.000 ₫).', 'order', '2026-11-24 08:24:26', 0),
(47, NULL, 'Bán tại quầy #GN-1022', 'Nhân viên Trần Hoàng Nam vừa hoàn tất đơn tại quầy #GN-1022 cho Khách lẻ (79.000 ₫).', 'order', '2026-11-24 08:47:07', 0),
(48, NULL, 'Bán tại quầy #GN-1023', 'Nhân viên Trần Hoàng Nam vừa hoàn tất đơn tại quầy #GN-1023 cho Khách lẻ (79.000 ₫).', 'order', '2026-11-24 08:48:25', 0);

-- --------------------------------------------------------

--
-- Table structure for table `thucung`
--

CREATE TABLE `thucung` (
  `ma_thu_cung` int(10) UNSIGNED NOT NULL,
  `ma_khach_hang` int(10) UNSIGNED NOT NULL,
  `ten_thu_cung` varchar(80) NOT NULL,
  `loai` varchar(40) NOT NULL DEFAULT 'Chó',
  `giong` varchar(80) DEFAULT NULL,
  `tuoi` varchar(40) DEFAULT NULL,
  `bieu_tuong` varchar(16) NOT NULL DEFAULT '?',
  `ghi_chu` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `thucung`
--

INSERT INTO `thucung` (`ma_thu_cung`, `ma_khach_hang`, `ten_thu_cung`, `loai`, `giong`, `tuoi`, `bieu_tuong`, `ghi_chu`, `created_at`) VALUES
(1, 1, 'Mochi', 'Mèo', 'Anh lông ngắn', '1 tuổi', '🐱', 'Hiền lành, thích pate cá hồi', '2026-11-21 05:53:47'),
(2, 1, 'Bông', 'Chó', 'Poodle Toy', '2 tuổi', '🐶', 'Da hơi nhạy cảm, dùng sữa tắm dịu nhẹ', '2026-11-21 05:53:47'),
(3, 2, 'Cam', 'Mèo', 'Mèo ta mướp vàng', '8 tháng', '🐱', 'Rất hiếu động', '2026-11-21 05:53:47');

-- --------------------------------------------------------

--
-- Table structure for table `tinnhanai`
--

CREATE TABLE `tinnhanai` (
  `ma_tin_nhan` int(10) UNSIGNED NOT NULL,
  `ma_cuoc_hoi_thoai` int(10) UNSIGNED NOT NULL,
  `vai_tro` enum('user','assistant') NOT NULL,
  `noi_dung` text NOT NULL,
  `thoi_gian` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tinnhanai`
--

INSERT INTO `tinnhanai` (`ma_tin_nhan`, `ma_cuoc_hoi_thoai`, `vai_tro`, `noi_dung`, `thoi_gian`) VALUES
(1, 1, 'user', 'Sản phẩm nào sắp hết hàng?', '2026-11-21 06:00:39'),
(2, 1, 'assistant', '⚠️ Cảnh báo tồn kho thấp (<= 10 món) từ dữ liệu MySQL:\n• Nệm tròn bông mềm hình bánh donut màu hồng phấn: còn **4** món (320.000 ₫)\n• Trụ cào móng bọc dây thừng sisal kèm quả bông: còn **5** món (195.000 ₫)\n• Bánh thưởng gặm sạch răng vị bạc hà cho chó: còn **7** món (65.000 ₫)\n• Lược chải lông gỡ rối có nút đẩy lông thông minh: còn **9** món (95.000 ₫)\n\n👉 Đề xuất: Ưu tiên nhập bổ sung các sản phẩm còn dưới 5 món để tránh gián đoạn đơn hàng.', '2026-11-21 06:00:39'),
(3, 2, 'user', 'Gợi ý sản phẩm cho mèo dưới 200k', '2026-11-21 15:29:57'),
(4, 2, 'assistant', '🩺 Lưu ý sức khỏe thú cưng:\nVới các biểu hiện bất thường như bỏ ăn, nôn ói, tiêu chảy, sốt hoặc viêm da, thông tin từ Pawly AI chỉ mang tính tham khảo chung — bạn nên đưa bé đến **bác sĩ thú y** gần nhất để được thăm khám chính xác nhé!\n\nTrong thời gian theo dõi, hãy giữ ấm cho bé, chuẩn bị sẵn nước sạch và không tự ý dùng thuốc của người cho thú cưng.', '2026-11-21 15:29:57'),
(5, 2, 'user', 'Có thức ăn nào cho chó con không?', '2026-11-21 15:30:04'),
(6, 2, 'assistant', '🩺 Lưu ý sức khỏe thú cưng:\nVới các biểu hiện bất thường như bỏ ăn, nôn ói, tiêu chảy, sốt hoặc viêm da, thông tin từ Pawly AI chỉ mang tính tham khảo chung — bạn nên đưa bé đến **bác sĩ thú y** gần nhất để được thăm khám chính xác nhé!\n\nTrong thời gian theo dõi, hãy giữ ấm cho bé, chuẩn bị sẵn nước sạch và không tự ý dùng thuốc của người cho thú cưng.', '2026-11-21 15:30:04');

-- --------------------------------------------------------

--
-- Table structure for table `trahang`
--

CREATE TABLE `trahang` (
  `ma_tra_hang` int(10) UNSIGNED NOT NULL,
  `ma_don_hang` int(10) UNSIGNED NOT NULL,
  `ma_khach_hang` int(10) UNSIGNED DEFAULT NULL,
  `ho_ten` varchar(120) NOT NULL,
  `so_dien_thoai` varchar(20) NOT NULL,
  `dia_chi_lay_hang` varchar(255) NOT NULL,
  `phuong_thuc_hoan_tien` varchar(160) DEFAULT NULL,
  `ly_do` text NOT NULL,
  `hinh_anh` varchar(255) DEFAULT NULL,
  `trang_thai` enum('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  `ngay_tao` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `yeucaunhapkho`
--

CREATE TABLE `yeucaunhapkho` (
  `ma_yeu_cau` int(10) UNSIGNED NOT NULL,
  `ma_yeu_cau_code` varchar(30) NOT NULL,
  `ma_san_pham` int(10) UNSIGNED NOT NULL,
  `so_luong_yeu_cau` int(11) NOT NULL,
  `ly_do` varchar(255) DEFAULT NULL,
  `ma_nhan_vien_yc` int(10) UNSIGNED DEFAULT NULL,
  `ten_nguoi_yc` varchar(120) NOT NULL,
  `trang_thai` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `ten_nguoi_duyet` varchar(120) DEFAULT NULL,
  `ly_do_tu_choi` varchar(255) DEFAULT NULL,
  `ma_phieu_nhap` int(10) UNSIGNED DEFAULT NULL,
  `ngay_tao` timestamp NOT NULL DEFAULT current_timestamp(),
  `ngay_xu_ly` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `yeucaunhapkho`
--

INSERT INTO `yeucaunhapkho` (`ma_yeu_cau`, `ma_yeu_cau_code`, `ma_san_pham`, `so_luong_yeu_cau`, `ly_do`, `ma_nhan_vien_yc`, `ten_nguoi_yc`, `trang_thai`, `ten_nguoi_duyet`, `ly_do_tu_choi`, `ma_phieu_nhap`, `ngay_tao`, `ngay_xu_ly`) VALUES
(1, 'YC-20261124-0001', 12, 10, 'Nệm tròn bánh donut chỉ còn 4 cái, khách hỏi mua nhiều cuối tuần.', 2, 'Trần Hoàng Nam', 'pending', NULL, NULL, NULL, '2026-11-24 09:17:43', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `caidat`
--
ALTER TABLE `caidat`
  ADD PRIMARY KEY (`khoa`);

--
-- Indexes for table `chitietdonhang`
--
ALTER TABLE `chitietdonhang`
  ADD PRIMARY KEY (`ma_chi_tiet`),
  ADD KEY `idx_ctdh_donhang` (`ma_don_hang`),
  ADD KEY `fk_ctdh_sanpham` (`ma_san_pham`);

--
-- Indexes for table `chitietgiohang`
--
ALTER TABLE `chitietgiohang`
  ADD PRIMARY KEY (`ma_chi_tiet`),
  ADD UNIQUE KEY `uq_giohang_sp_phanloai` (`ma_gio_hang`,`ma_san_pham`,`phan_loai`(150)),
  ADD KEY `fk_ctgh_sanpham` (`ma_san_pham`),
  ADD KEY `idx_ctgh_giohang` (`ma_gio_hang`);

--
-- Indexes for table `chitietphieunhap`
--
ALTER TABLE `chitietphieunhap`
  ADD PRIMARY KEY (`ma_chi_tiet`),
  ADD KEY `idx_ctpn_phieu` (`ma_phieu_nhap`),
  ADD KEY `fk_ctpn_sp` (`ma_san_pham`);

--
-- Indexes for table `cuochoithoaiai`
--
ALTER TABLE `cuochoithoaiai`
  ADD PRIMARY KEY (`ma_cuoc_hoi_thoai`),
  ADD KEY `fk_ai_khachhang` (`ma_khach_hang`),
  ADD KEY `fk_ai_taikhoan` (`ma_tai_khoan`);

--
-- Indexes for table `danhgia`
--
ALTER TABLE `danhgia`
  ADD PRIMARY KEY (`ma_danh_gia`),
  ADD KEY `idx_danhgia_sp` (`ma_san_pham`),
  ADD KEY `idx_danhgia_dv` (`ma_dich_vu`),
  ADD KEY `fk_danhgia_khachhang` (`ma_khach_hang`);

--
-- Indexes for table `danhmuc`
--
ALTER TABLE `danhmuc`
  ADD PRIMARY KEY (`ma_danh_muc`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `dichvu`
--
ALTER TABLE `dichvu`
  ADD PRIMARY KEY (`ma_dich_vu`);

--
-- Indexes for table `donhang`
--
ALTER TABLE `donhang`
  ADD PRIMARY KEY (`ma_don_hang`),
  ADD UNIQUE KEY `ma_don_code` (`ma_don_code`),
  ADD KEY `idx_donhang_kh` (`ma_khach_hang`),
  ADD KEY `idx_donhang_status` (`trang_thai`),
  ADD KEY `idx_donhang_date` (`ngay_dat`);

--
-- Indexes for table `emailthongbao`
--
ALTER TABLE `emailthongbao`
  ADD PRIMARY KEY (`ma_email`),
  ADD KEY `idx_email_kh` (`ma_khach_hang`,`da_doc`),
  ADD KEY `idx_email_don` (`ma_don_hang`);

--
-- Indexes for table `giohang`
--
ALTER TABLE `giohang`
  ADD PRIMARY KEY (`ma_gio_hang`),
  ADD KEY `idx_giohang_kh` (`ma_khach_hang`,`trang_thai`);

--
-- Indexes for table `hinhanhsanpham`
--
ALTER TABLE `hinhanhsanpham`
  ADD PRIMARY KEY (`ma_hinh_anh`),
  ADD KEY `idx_hinhanh_sp` (`ma_san_pham`);

--
-- Indexes for table `hoadon`
--
ALTER TABLE `hoadon`
  ADD PRIMARY KEY (`ma_hoa_don`),
  ADD UNIQUE KEY `ma_hoa_don_code` (`ma_hoa_don_code`),
  ADD UNIQUE KEY `uq_hoadon_donhang` (`ma_don_hang`),
  ADD KEY `idx_hoadon_kenh` (`kenh_ban`,`ngay_xuat`),
  ADD KEY `fk_hoadon_nhanvien` (`ma_nhan_vien_lap`);

--
-- Indexes for table `khachhang`
--
ALTER TABLE `khachhang`
  ADD PRIMARY KEY (`ma_khach_hang`),
  ADD UNIQUE KEY `ma_tai_khoan` (`ma_tai_khoan`),
  ADD KEY `idx_khachhang_phone` (`so_dien_thoai`);

--
-- Indexes for table `lichhen`
--
ALTER TABLE `lichhen`
  ADD PRIMARY KEY (`ma_lich_hen`),
  ADD KEY `idx_lichhen_kh` (`ma_khach_hang`),
  ADD KEY `idx_lichhen_ngaygio` (`ngay_gio`),
  ADD KEY `fk_lichhen_thucung` (`ma_thu_cung`),
  ADD KEY `fk_lichhen_dichvu` (`ma_dich_vu`);

--
-- Indexes for table `nhacungcap`
--
ALTER TABLE `nhacungcap`
  ADD PRIMARY KEY (`ma_ncc`);

--
-- Indexes for table `nhanvien`
--
ALTER TABLE `nhanvien`
  ADD PRIMARY KEY (`ma_nhan_vien`),
  ADD UNIQUE KEY `ma_tai_khoan` (`ma_tai_khoan`);

--
-- Indexes for table `phieunhap`
--
ALTER TABLE `phieunhap`
  ADD PRIMARY KEY (`ma_phieu_nhap`),
  ADD UNIQUE KEY `ma_phieu_code` (`ma_phieu_code`),
  ADD KEY `idx_phieunhap_ncc` (`ma_ncc`,`ngay_nhap`),
  ADD KEY `fk_phieunhap_nv` (`ma_nhan_vien_nhap`);

--
-- Indexes for table `quyen`
--
ALTER TABLE `quyen`
  ADD PRIMARY KEY (`ma_quyen`),
  ADD UNIQUE KEY `ten_quyen` (`ten_quyen`);

--
-- Indexes for table `sanpham`
--
ALTER TABLE `sanpham`
  ADD PRIMARY KEY (`ma_san_pham`),
  ADD KEY `idx_sanpham_danhmuc` (`ma_danh_muc`),
  ADD KEY `idx_sanpham_trangthai` (`trang_thai`);

--
-- Indexes for table `smsotplog`
--
ALTER TABLE `smsotplog`
  ADD PRIMARY KEY (`ma_sms`),
  ADD KEY `idx_sms_phone` (`so_dien_thoai`,`ngay_gui`);

--
-- Indexes for table `taikhoan`
--
ALTER TABLE `taikhoan`
  ADD PRIMARY KEY (`ma_tai_khoan`),
  ADD UNIQUE KEY `ten_dang_nhap` (`ten_dang_nhap`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_taikhoan_quyen` (`ma_quyen`);

--
-- Indexes for table `thanhtoan`
--
ALTER TABLE `thanhtoan`
  ADD PRIMARY KEY (`ma_thanh_toan`),
  ADD KEY `idx_thanhtoan_donhang` (`ma_don_hang`);

--
-- Indexes for table `thongbao`
--
ALTER TABLE `thongbao`
  ADD PRIMARY KEY (`ma_thong_bao`),
  ADD KEY `idx_thongbao_tk` (`ma_tai_khoan`,`da_doc`);

--
-- Indexes for table `thucung`
--
ALTER TABLE `thucung`
  ADD PRIMARY KEY (`ma_thu_cung`),
  ADD KEY `idx_thucung_kh` (`ma_khach_hang`);

--
-- Indexes for table `tinnhanai`
--
ALTER TABLE `tinnhanai`
  ADD PRIMARY KEY (`ma_tin_nhan`),
  ADD KEY `idx_tinnhan_cht` (`ma_cuoc_hoi_thoai`);

--
-- Indexes for table `trahang`
--
ALTER TABLE `trahang`
  ADD PRIMARY KEY (`ma_tra_hang`),
  ADD UNIQUE KEY `uq_trahang_donhang` (`ma_don_hang`),
  ADD KEY `idx_trahang_kh` (`ma_khach_hang`);

--
-- Indexes for table `yeucaunhapkho`
--
ALTER TABLE `yeucaunhapkho`
  ADD PRIMARY KEY (`ma_yeu_cau`),
  ADD UNIQUE KEY `ma_yeu_cau_code` (`ma_yeu_cau_code`),
  ADD KEY `idx_ycnk_status` (`trang_thai`,`ngay_tao`),
  ADD KEY `fk_ycnk_sp` (`ma_san_pham`),
  ADD KEY `fk_ycnk_nv` (`ma_nhan_vien_yc`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `chitietdonhang`
--
ALTER TABLE `chitietdonhang`
  MODIFY `ma_chi_tiet` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `chitietgiohang`
--
ALTER TABLE `chitietgiohang`
  MODIFY `ma_chi_tiet` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `chitietphieunhap`
--
ALTER TABLE `chitietphieunhap`
  MODIFY `ma_chi_tiet` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `cuochoithoaiai`
--
ALTER TABLE `cuochoithoaiai`
  MODIFY `ma_cuoc_hoi_thoai` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `danhgia`
--
ALTER TABLE `danhgia`
  MODIFY `ma_danh_gia` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `danhmuc`
--
ALTER TABLE `danhmuc`
  MODIFY `ma_danh_muc` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `dichvu`
--
ALTER TABLE `dichvu`
  MODIFY `ma_dich_vu` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `donhang`
--
ALTER TABLE `donhang`
  MODIFY `ma_don_hang` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `emailthongbao`
--
ALTER TABLE `emailthongbao`
  MODIFY `ma_email` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `giohang`
--
ALTER TABLE `giohang`
  MODIFY `ma_gio_hang` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `hinhanhsanpham`
--
ALTER TABLE `hinhanhsanpham`
  MODIFY `ma_hinh_anh` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `hoadon`
--
ALTER TABLE `hoadon`
  MODIFY `ma_hoa_don` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `khachhang`
--
ALTER TABLE `khachhang`
  MODIFY `ma_khach_hang` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `lichhen`
--
ALTER TABLE `lichhen`
  MODIFY `ma_lich_hen` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `nhacungcap`
--
ALTER TABLE `nhacungcap`
  MODIFY `ma_ncc` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `nhanvien`
--
ALTER TABLE `nhanvien`
  MODIFY `ma_nhan_vien` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `phieunhap`
--
ALTER TABLE `phieunhap`
  MODIFY `ma_phieu_nhap` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `quyen`
--
ALTER TABLE `quyen`
  MODIFY `ma_quyen` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `sanpham`
--
ALTER TABLE `sanpham`
  MODIFY `ma_san_pham` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `smsotplog`
--
ALTER TABLE `smsotplog`
  MODIFY `ma_sms` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `taikhoan`
--
ALTER TABLE `taikhoan`
  MODIFY `ma_tai_khoan` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `thanhtoan`
--
ALTER TABLE `thanhtoan`
  MODIFY `ma_thanh_toan` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `thongbao`
--
ALTER TABLE `thongbao`
  MODIFY `ma_thong_bao` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `thucung`
--
ALTER TABLE `thucung`
  MODIFY `ma_thu_cung` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tinnhanai`
--
ALTER TABLE `tinnhanai`
  MODIFY `ma_tin_nhan` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `trahang`
--
ALTER TABLE `trahang`
  MODIFY `ma_tra_hang` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `yeucaunhapkho`
--
ALTER TABLE `yeucaunhapkho`
  MODIFY `ma_yeu_cau` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chitietdonhang`
--
ALTER TABLE `chitietdonhang`
  ADD CONSTRAINT `fk_ctdh_donhang` FOREIGN KEY (`ma_don_hang`) REFERENCES `donhang` (`ma_don_hang`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ctdh_sanpham` FOREIGN KEY (`ma_san_pham`) REFERENCES `sanpham` (`ma_san_pham`) ON UPDATE CASCADE;

--
-- Constraints for table `chitietgiohang`
--
ALTER TABLE `chitietgiohang`
  ADD CONSTRAINT `fk_ctgh_giohang` FOREIGN KEY (`ma_gio_hang`) REFERENCES `giohang` (`ma_gio_hang`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ctgh_sanpham` FOREIGN KEY (`ma_san_pham`) REFERENCES `sanpham` (`ma_san_pham`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `chitietphieunhap`
--
ALTER TABLE `chitietphieunhap`
  ADD CONSTRAINT `fk_ctpn_phieu` FOREIGN KEY (`ma_phieu_nhap`) REFERENCES `phieunhap` (`ma_phieu_nhap`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ctpn_sp` FOREIGN KEY (`ma_san_pham`) REFERENCES `sanpham` (`ma_san_pham`) ON UPDATE CASCADE;

--
-- Constraints for table `cuochoithoaiai`
--
ALTER TABLE `cuochoithoaiai`
  ADD CONSTRAINT `fk_ai_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `khachhang` (`ma_khach_hang`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ai_taikhoan` FOREIGN KEY (`ma_tai_khoan`) REFERENCES `taikhoan` (`ma_tai_khoan`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `danhgia`
--
ALTER TABLE `danhgia`
  ADD CONSTRAINT `fk_danhgia_dichvu` FOREIGN KEY (`ma_dich_vu`) REFERENCES `dichvu` (`ma_dich_vu`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_danhgia_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `khachhang` (`ma_khach_hang`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_danhgia_sanpham` FOREIGN KEY (`ma_san_pham`) REFERENCES `sanpham` (`ma_san_pham`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `donhang`
--
ALTER TABLE `donhang`
  ADD CONSTRAINT `fk_donhang_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `khachhang` (`ma_khach_hang`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `emailthongbao`
--
ALTER TABLE `emailthongbao`
  ADD CONSTRAINT `fk_email_donhang` FOREIGN KEY (`ma_don_hang`) REFERENCES `donhang` (`ma_don_hang`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_email_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `khachhang` (`ma_khach_hang`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `giohang`
--
ALTER TABLE `giohang`
  ADD CONSTRAINT `fk_giohang_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `khachhang` (`ma_khach_hang`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `hinhanhsanpham`
--
ALTER TABLE `hinhanhsanpham`
  ADD CONSTRAINT `fk_hinhanh_sanpham` FOREIGN KEY (`ma_san_pham`) REFERENCES `sanpham` (`ma_san_pham`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `hoadon`
--
ALTER TABLE `hoadon`
  ADD CONSTRAINT `fk_hoadon_donhang` FOREIGN KEY (`ma_don_hang`) REFERENCES `donhang` (`ma_don_hang`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_hoadon_nhanvien` FOREIGN KEY (`ma_nhan_vien_lap`) REFERENCES `nhanvien` (`ma_nhan_vien`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `khachhang`
--
ALTER TABLE `khachhang`
  ADD CONSTRAINT `fk_khachhang_taikhoan` FOREIGN KEY (`ma_tai_khoan`) REFERENCES `taikhoan` (`ma_tai_khoan`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `lichhen`
--
ALTER TABLE `lichhen`
  ADD CONSTRAINT `fk_lichhen_dichvu` FOREIGN KEY (`ma_dich_vu`) REFERENCES `dichvu` (`ma_dich_vu`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lichhen_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `khachhang` (`ma_khach_hang`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lichhen_thucung` FOREIGN KEY (`ma_thu_cung`) REFERENCES `thucung` (`ma_thu_cung`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `nhanvien`
--
ALTER TABLE `nhanvien`
  ADD CONSTRAINT `fk_nhanvien_taikhoan` FOREIGN KEY (`ma_tai_khoan`) REFERENCES `taikhoan` (`ma_tai_khoan`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `phieunhap`
--
ALTER TABLE `phieunhap`
  ADD CONSTRAINT `fk_phieunhap_ncc` FOREIGN KEY (`ma_ncc`) REFERENCES `nhacungcap` (`ma_ncc`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_phieunhap_nv` FOREIGN KEY (`ma_nhan_vien_nhap`) REFERENCES `nhanvien` (`ma_nhan_vien`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `sanpham`
--
ALTER TABLE `sanpham`
  ADD CONSTRAINT `fk_sanpham_danhmuc` FOREIGN KEY (`ma_danh_muc`) REFERENCES `danhmuc` (`ma_danh_muc`) ON UPDATE CASCADE;

--
-- Constraints for table `taikhoan`
--
ALTER TABLE `taikhoan`
  ADD CONSTRAINT `fk_taikhoan_quyen` FOREIGN KEY (`ma_quyen`) REFERENCES `quyen` (`ma_quyen`) ON UPDATE CASCADE;

--
-- Constraints for table `thanhtoan`
--
ALTER TABLE `thanhtoan`
  ADD CONSTRAINT `fk_thanhtoan_donhang` FOREIGN KEY (`ma_don_hang`) REFERENCES `donhang` (`ma_don_hang`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `thongbao`
--
ALTER TABLE `thongbao`
  ADD CONSTRAINT `fk_thongbao_taikhoan` FOREIGN KEY (`ma_tai_khoan`) REFERENCES `taikhoan` (`ma_tai_khoan`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `thucung`
--
ALTER TABLE `thucung`
  ADD CONSTRAINT `fk_thucung_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `khachhang` (`ma_khach_hang`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tinnhanai`
--
ALTER TABLE `tinnhanai`
  ADD CONSTRAINT `fk_tinnhan_cht` FOREIGN KEY (`ma_cuoc_hoi_thoai`) REFERENCES `cuochoithoaiai` (`ma_cuoc_hoi_thoai`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `trahang`
--
ALTER TABLE `trahang`
  ADD CONSTRAINT `fk_trahang_donhang` FOREIGN KEY (`ma_don_hang`) REFERENCES `donhang` (`ma_don_hang`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_trahang_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `khachhang` (`ma_khach_hang`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `yeucaunhapkho`
--
ALTER TABLE `yeucaunhapkho`
  ADD CONSTRAINT `fk_ycnk_nv` FOREIGN KEY (`ma_nhan_vien_yc`) REFERENCES `nhanvien` (`ma_nhan_vien`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ycnk_sp` FOREIGN KEY (`ma_san_pham`) REFERENCES `sanpham` (`ma_san_pham`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
