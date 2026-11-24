-- ============================================================================
-- CƠ SỞ DỮ LIỆU WEBSITE CỬA HÀNG THÚ CƯNG TÍCH HỢP AI
-- Thương hiệu: Góc nhỏ có em
-- Hệ quản trị: MySQL / MariaDB (XAMPP - phpMyAdmin)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `pawly_petshop`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `pawly_petshop`;

-- Xóa bảng cũ nếu tạo lại từ đầu (theo thứ tự khóa ngoại)
DROP TABLE IF EXISTS `TinNhanAI`;
DROP TABLE IF EXISTS `CuocHoiThoaiAI`;
DROP TABLE IF EXISTS `ThongBao`;
DROP TABLE IF EXISTS `DanhGia`;
DROP TABLE IF EXISTS `LichHen`;
DROP TABLE IF EXISTS `DichVu`;
DROP TABLE IF EXISTS `ThuCung`;
DROP TABLE IF EXISTS `ChiTietPhieuNhap`;
DROP TABLE IF EXISTS `YeuCauNhapKho`;
DROP TABLE IF EXISTS `PhieuNhap`;
DROP TABLE IF EXISTS `NhaCungCap`;
DROP TABLE IF EXISTS `HoaDon`;
DROP TABLE IF EXISTS `ThanhToan`;
DROP TABLE IF EXISTS `ChiTietDonHang`;
DROP TABLE IF EXISTS `DonHang`;
DROP TABLE IF EXISTS `ChiTietGioHang`;
DROP TABLE IF EXISTS `GioHang`;
DROP TABLE IF EXISTS `HinhAnhSanPham`;
DROP TABLE IF EXISTS `SanPham`;
DROP TABLE IF EXISTS `DanhMuc`;
DROP TABLE IF EXISTS `NhanVien`;
DROP TABLE IF EXISTS `KhachHang`;
DROP TABLE IF EXISTS `TaiKhoan`;
DROP TABLE IF EXISTS `Quyen`;
DROP TABLE IF EXISTS `CaiDat`;

-- ----------------------------------------------------------------------------
-- 1. Bảng Quyen
-- ----------------------------------------------------------------------------
CREATE TABLE `Quyen` (
  `ma_quyen` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ten_quyen` VARCHAR(50) NOT NULL UNIQUE,
  `mo_ta` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`ma_quyen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Bảng TaiKhoan
-- ----------------------------------------------------------------------------
CREATE TABLE `TaiKhoan` (
  `ma_tai_khoan` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ten_dang_nhap` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `mat_khau` VARCHAR(255) NOT NULL,
  `ma_quyen` INT UNSIGNED NOT NULL,
  `trang_thai` ENUM('active', 'locked') NOT NULL DEFAULT 'active',
  `anh_dai_dien` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_tai_khoan`),
  CONSTRAINT `fk_taikhoan_quyen` FOREIGN KEY (`ma_quyen`) REFERENCES `Quyen`(`ma_quyen`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Bảng KhachHang
-- ----------------------------------------------------------------------------
CREATE TABLE `KhachHang` (
  `ma_khach_hang` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_tai_khoan` INT UNSIGNED DEFAULT NULL UNIQUE,
  `ho_ten` VARCHAR(120) NOT NULL,
  `so_dien_thoai` VARCHAR(20) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `dia_chi` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_khach_hang`),
  INDEX `idx_khachhang_phone` (`so_dien_thoai`),
  CONSTRAINT `fk_khachhang_taikhoan` FOREIGN KEY (`ma_tai_khoan`) REFERENCES `TaiKhoan`(`ma_tai_khoan`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Bảng NhanVien
-- ----------------------------------------------------------------------------
CREATE TABLE `NhanVien` (
  `ma_nhan_vien` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_tai_khoan` INT UNSIGNED DEFAULT NULL UNIQUE,
  `ho_ten` VARCHAR(120) NOT NULL,
  `so_dien_thoai` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `chuc_vu` VARCHAR(100) NOT NULL DEFAULT 'Nhân viên bán hàng',
  `trang_thai` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_nhan_vien`),
  CONSTRAINT `fk_nhanvien_taikhoan` FOREIGN KEY (`ma_tai_khoan`) REFERENCES `TaiKhoan`(`ma_tai_khoan`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Bảng DanhMuc
-- ----------------------------------------------------------------------------
CREATE TABLE `DanhMuc` (
  `ma_danh_muc` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(60) NOT NULL UNIQUE,
  `ten_danh_muc` VARCHAR(100) NOT NULL,
  `mo_ta` VARCHAR(255) DEFAULT NULL,
  `bieu_tuong` VARCHAR(16) NOT NULL DEFAULT '🐾',
  `hinh_anh` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`ma_danh_muc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Bảng SanPham (giá dùng DECIMAL, không dùng FLOAT)
-- ----------------------------------------------------------------------------
CREATE TABLE `SanPham` (
  `ma_san_pham` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_danh_muc` INT UNSIGNED NOT NULL,
  `ten_san_pham` VARCHAR(160) NOT NULL,
  `mo_ta` TEXT DEFAULT NULL,
  `loai_thu_cung` ENUM('cho', 'meo', 'ca_hai', 'khac') NOT NULL DEFAULT 'ca_hai',
  `gia` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `ton_kho` INT NOT NULL DEFAULT 0,
  `bieu_tuong` VARCHAR(16) NOT NULL DEFAULT '🦴',
  `trang_thai` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_san_pham`),
  INDEX `idx_sanpham_danhmuc` (`ma_danh_muc`),
  INDEX `idx_sanpham_trangthai` (`trang_thai`),
  CONSTRAINT `fk_sanpham_danhmuc` FOREIGN KEY (`ma_danh_muc`) REFERENCES `DanhMuc`(`ma_danh_muc`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. Bảng HinhAnhSanPham
-- ----------------------------------------------------------------------------
CREATE TABLE `HinhAnhSanPham` (
  `ma_hinh_anh` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_san_pham` INT UNSIGNED NOT NULL,
  `duong_dan` VARCHAR(255) NOT NULL,
  `la_anh_chinh` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`ma_hinh_anh`),
  INDEX `idx_hinhanh_sp` (`ma_san_pham`),
  CONSTRAINT `fk_hinhanh_sanpham` FOREIGN KEY (`ma_san_pham`) REFERENCES `SanPham`(`ma_san_pham`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Bảng GioHang
-- ----------------------------------------------------------------------------
CREATE TABLE `GioHang` (
  `ma_gio_hang` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_khach_hang` INT UNSIGNED NOT NULL,
  `ngay_tao` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `trang_thai` ENUM('active', 'checked_out') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`ma_gio_hang`),
  INDEX `idx_giohang_kh` (`ma_khach_hang`, `trang_thai`),
  CONSTRAINT `fk_giohang_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `KhachHang`(`ma_khach_hang`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. Bảng ChiTietGioHang
-- ----------------------------------------------------------------------------
CREATE TABLE `ChiTietGioHang` (
  `ma_chi_tiet` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_gio_hang` INT UNSIGNED NOT NULL,
  `ma_san_pham` INT UNSIGNED NOT NULL,
  `phan_loai` VARCHAR(255) NOT NULL DEFAULT '',
  `so_luong` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`ma_chi_tiet`),
  INDEX `idx_ctgh_giohang` (`ma_gio_hang`),
  UNIQUE KEY `uq_giohang_sp_phanloai` (`ma_gio_hang`, `ma_san_pham`, `phan_loai`(150)),
  CONSTRAINT `fk_ctgh_giohang` FOREIGN KEY (`ma_gio_hang`) REFERENCES `GioHang`(`ma_gio_hang`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_ctgh_sanpham` FOREIGN KEY (`ma_san_pham`) REFERENCES `SanPham`(`ma_san_pham`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. Bảng DonHang
-- ----------------------------------------------------------------------------
CREATE TABLE `DonHang` (
  `ma_don_hang` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_don_code` VARCHAR(30) NOT NULL UNIQUE,
  `ma_khach_hang` INT UNSIGNED DEFAULT NULL,
  `ma_nhan_vien_xu_ly` INT UNSIGNED DEFAULT NULL,
  `ten_nguoi_nhan` VARCHAR(120) NOT NULL,
  `so_dien_thoai` VARCHAR(20) NOT NULL,
  `dia_chi_nhan` VARCHAR(255) NOT NULL,
  `ghi_chu` VARCHAR(255) DEFAULT NULL,
  `phuong_thuc_van_chuyen` ENUM('standard', 'express') NOT NULL DEFAULT 'standard',
  `phi_van_chuyen` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `ngay_dat` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tong_tien` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `trang_thai` ENUM('pending', 'confirmed', 'shipping', 'done', 'returned', 'cancelled') NOT NULL DEFAULT 'pending',
  `ngay_giao` DATETIME DEFAULT NULL,
  `khong_tra_hang` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_don_hang`),
  INDEX `idx_donhang_kh` (`ma_khach_hang`),
  INDEX `idx_donhang_status` (`trang_thai`),
  INDEX `idx_donhang_date` (`ngay_dat`),
  CONSTRAINT `fk_donhang_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `KhachHang`(`ma_khach_hang`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. Bảng ChiTietDonHang (lưu đơn giá tại thời điểm mua)
-- ----------------------------------------------------------------------------
CREATE TABLE `ChiTietDonHang` (
  `ma_chi_tiet` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_don_hang` INT UNSIGNED NOT NULL,
  `ma_san_pham` INT UNSIGNED NOT NULL,
  `phan_loai` VARCHAR(255) NOT NULL DEFAULT '',
  `so_luong` INT NOT NULL,
  `don_gia` DECIMAL(12, 2) NOT NULL,
  PRIMARY KEY (`ma_chi_tiet`),
  INDEX `idx_ctdh_donhang` (`ma_don_hang`),
  CONSTRAINT `fk_ctdh_donhang` FOREIGN KEY (`ma_don_hang`) REFERENCES `DonHang`(`ma_don_hang`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_ctdh_sanpham` FOREIGN KEY (`ma_san_pham`) REFERENCES `SanPham`(`ma_san_pham`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. Bảng ThanhToan
-- ----------------------------------------------------------------------------
CREATE TABLE `ThanhToan` (
  `ma_thanh_toan` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_don_hang` INT UNSIGNED NOT NULL,
  `phuong_thuc` ENUM('cod', 'bank_transfer') NOT NULL DEFAULT 'cod',
  `so_tien` DECIMAL(12, 2) NOT NULL,
  `trang_thai` ENUM('unpaid', 'paid', 'refunded') NOT NULL DEFAULT 'unpaid',
  `thoi_gian` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_thanh_toan`),
  INDEX `idx_thanhtoan_donhang` (`ma_don_hang`),
  CONSTRAINT `fk_thanhtoan_donhang` FOREIGN KEY (`ma_don_hang`) REFERENCES `DonHang`(`ma_don_hang`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12b. Bảng TraHang (lưu thông tin & ảnh trả hàng trong 3 ngày sau khi nhận)
-- ----------------------------------------------------------------------------
CREATE TABLE `TraHang` (
  `ma_tra_hang` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_don_hang` INT UNSIGNED NOT NULL,
  `ma_khach_hang` INT UNSIGNED DEFAULT NULL,
  `ho_ten` VARCHAR(120) NOT NULL,
  `so_dien_thoai` VARCHAR(20) NOT NULL,
  `dia_chi_lay_hang` VARCHAR(255) NOT NULL,
  `phuong_thuc_hoan_tien` VARCHAR(160) DEFAULT NULL,
  `ly_do` TEXT NOT NULL,
  `hinh_anh` VARCHAR(255) DEFAULT NULL,
  `trang_thai` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
  `ngay_tao` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_tra_hang`),
  UNIQUE KEY `uq_trahang_donhang` (`ma_don_hang`),
  INDEX `idx_trahang_kh` (`ma_khach_hang`),
  CONSTRAINT `fk_trahang_donhang` FOREIGN KEY (`ma_don_hang`) REFERENCES `DonHang`(`ma_don_hang`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_trahang_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `KhachHang`(`ma_khach_hang`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12b. Bảng HoaDon (lưu trữ hóa đơn bán hàng Tại quầy & Online, liên kết 1-1 DonHang)
-- ----------------------------------------------------------------------------
CREATE TABLE `HoaDon` (
  `ma_hoa_don` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_hoa_don_code` VARCHAR(30) NOT NULL UNIQUE,
  `ma_don_hang` INT UNSIGNED NOT NULL,
  `kenh_ban` ENUM('tai_quay', 'online') NOT NULL DEFAULT 'online',
  `ma_nhan_vien_lap` INT UNSIGNED DEFAULT NULL,
  `ten_nguoi_lap` VARCHAR(120) NOT NULL DEFAULT 'Hệ thống',
  `ten_khach_hang` VARCHAR(120) NOT NULL,
  `so_dien_thoai` VARCHAR(20) DEFAULT NULL,
  `phuong_thuc` ENUM('cod', 'bank_transfer') NOT NULL DEFAULT 'cod',
  `tam_tinh` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `phi_van_chuyen` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `tong_tien` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `tien_khach_dua` DECIMAL(12, 2) DEFAULT NULL,
  `tien_thua` DECIMAL(12, 2) DEFAULT NULL,
  `ghi_chu` VARCHAR(255) DEFAULT NULL,
  `ngay_xuat` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_hoa_don`),
  UNIQUE KEY `uq_hoadon_donhang` (`ma_don_hang`),
  INDEX `idx_hoadon_kenh` (`kenh_ban`, `ngay_xuat`),
  CONSTRAINT `fk_hoadon_donhang` FOREIGN KEY (`ma_don_hang`) REFERENCES `DonHang`(`ma_don_hang`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_hoadon_nhanvien` FOREIGN KEY (`ma_nhan_vien_lap`) REFERENCES `NhanVien`(`ma_nhan_vien`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12c. Quản lý Kho, Phiếu nhập & Nhà cung cấp
-- ----------------------------------------------------------------------------
CREATE TABLE `NhaCungCap` (
  `ma_ncc` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ten_ncc` VARCHAR(150) NOT NULL,
  `so_dien_thoai` VARCHAR(20) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `dia_chi` VARCHAR(255) DEFAULT NULL,
  `nguoi_lien_he` VARCHAR(120) DEFAULT NULL,
  `ghi_chu` VARCHAR(255) DEFAULT NULL,
  `trang_thai` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_ncc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PhieuNhap` (
  `ma_phieu_nhap` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_phieu_code` VARCHAR(30) NOT NULL UNIQUE,
  `ma_ncc` INT UNSIGNED NOT NULL,
  `ma_nhan_vien_nhap` INT UNSIGNED DEFAULT NULL,
  `ten_nguoi_nhap` VARCHAR(120) NOT NULL,
  `ma_yeu_cau` INT UNSIGNED DEFAULT NULL,
  `tong_tien_nhap` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `ghi_chu` VARCHAR(255) DEFAULT NULL,
  `ngay_nhap` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_phieu_nhap`),
  INDEX `idx_phieunhap_ncc` (`ma_ncc`, `ngay_nhap`),
  CONSTRAINT `fk_phieunhap_ncc` FOREIGN KEY (`ma_ncc`) REFERENCES `NhaCungCap`(`ma_ncc`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_phieunhap_nv` FOREIGN KEY (`ma_nhan_vien_nhap`) REFERENCES `NhanVien`(`ma_nhan_vien`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ChiTietPhieuNhap` (
  `ma_chi_tiet` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_phieu_nhap` INT UNSIGNED NOT NULL,
  `ma_san_pham` INT UNSIGNED NOT NULL,
  `so_luong` INT NOT NULL,
  `gia_nhap` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`ma_chi_tiet`),
  INDEX `idx_ctpn_phieu` (`ma_phieu_nhap`),
  CONSTRAINT `fk_ctpn_phieu` FOREIGN KEY (`ma_phieu_nhap`) REFERENCES `PhieuNhap`(`ma_phieu_nhap`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_ctpn_sp` FOREIGN KEY (`ma_san_pham`) REFERENCES `SanPham`(`ma_san_pham`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `YeuCauNhapKho` (
  `ma_yeu_cau` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_yeu_cau_code` VARCHAR(30) NOT NULL UNIQUE,
  `ma_san_pham` INT UNSIGNED NOT NULL,
  `so_luong_yeu_cau` INT NOT NULL,
  `ly_do` VARCHAR(255) DEFAULT NULL,
  `ma_nhan_vien_yc` INT UNSIGNED DEFAULT NULL,
  `ten_nguoi_yc` VARCHAR(120) NOT NULL,
  `trang_thai` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `ten_nguoi_duyet` VARCHAR(120) DEFAULT NULL,
  `ly_do_tu_choi` VARCHAR(255) DEFAULT NULL,
  `ma_phieu_nhap` INT UNSIGNED DEFAULT NULL,
  `ngay_tao` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_xu_ly` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`ma_yeu_cau`),
  INDEX `idx_ycnk_status` (`trang_thai`, `ngay_tao`),
  CONSTRAINT `fk_ycnk_sp` FOREIGN KEY (`ma_san_pham`) REFERENCES `SanPham`(`ma_san_pham`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_ycnk_nv` FOREIGN KEY (`ma_nhan_vien_yc`) REFERENCES `NhanVien`(`ma_nhan_vien`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. Bảng ThuCung
-- ----------------------------------------------------------------------------
CREATE TABLE `ThuCung` (
  `ma_thu_cung` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_khach_hang` INT UNSIGNED NOT NULL,
  `ten_thu_cung` VARCHAR(80) NOT NULL,
  `loai` VARCHAR(40) NOT NULL DEFAULT 'Chó',
  `giong` VARCHAR(80) DEFAULT NULL,
  `tuoi` VARCHAR(40) DEFAULT NULL,
  `bieu_tuong` VARCHAR(16) NOT NULL DEFAULT '🐶',
  `ghi_chu` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_thu_cung`),
  INDEX `idx_thucung_kh` (`ma_khach_hang`),
  CONSTRAINT `fk_thucung_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `KhachHang`(`ma_khach_hang`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 14. Bảng DichVu
-- ----------------------------------------------------------------------------
CREATE TABLE `DichVu` (
  `ma_dich_vu` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ten_dich_vu` VARCHAR(120) NOT NULL,
  `mo_ta` TEXT DEFAULT NULL,
  `gia` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `thoi_luong` INT NOT NULL DEFAULT 45 COMMENT 'Phút',
  `bieu_tuong` VARCHAR(16) NOT NULL DEFAULT '🛁',
  `hinh_anh` VARCHAR(255) DEFAULT NULL,
  `trang_thai` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`ma_dich_vu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 15. Bảng LichHen
-- ----------------------------------------------------------------------------
CREATE TABLE `LichHen` (
  `ma_lich_hen` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_khach_hang` INT UNSIGNED DEFAULT NULL,
  `ma_thu_cung` INT UNSIGNED DEFAULT NULL,
  `ma_dich_vu` INT UNSIGNED NOT NULL,
  `ten_chu_nuoi` VARCHAR(120) NOT NULL,
  `so_dien_thoai` VARCHAR(20) NOT NULL,
  `ten_thu_cung` VARCHAR(80) NOT NULL,
  `bieu_tuong` VARCHAR(16) NOT NULL DEFAULT '🐶',
  `ngay_gio` DATETIME NOT NULL,
  `ghi_chu` VARCHAR(255) DEFAULT NULL,
  `trang_thai` ENUM('pending', 'confirmed', 'done', 'cancelled') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_lich_hen`),
  INDEX `idx_lichhen_kh` (`ma_khach_hang`),
  INDEX `idx_lichhen_ngaygio` (`ngay_gio`),
  CONSTRAINT `fk_lichhen_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `KhachHang`(`ma_khach_hang`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_lichhen_thucung` FOREIGN KEY (`ma_thu_cung`) REFERENCES `ThuCung`(`ma_thu_cung`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_lichhen_dichvu` FOREIGN KEY (`ma_dich_vu`) REFERENCES `DichVu`(`ma_dich_vu`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 16. Bảng DanhGia
-- ----------------------------------------------------------------------------
CREATE TABLE `DanhGia` (
  `ma_danh_gia` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_khach_hang` INT UNSIGNED NOT NULL,
  `ma_san_pham` INT UNSIGNED DEFAULT NULL,
  `ma_dich_vu` INT UNSIGNED DEFAULT NULL,
  `so_sao` TINYINT UNSIGNED NOT NULL,
  `noi_dung` TEXT DEFAULT NULL,
  `hinh_anh` VARCHAR(255) DEFAULT NULL,
  `ngay_tao` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_danh_gia`),
  INDEX `idx_danhgia_sp` (`ma_san_pham`),
  INDEX `idx_danhgia_dv` (`ma_dich_vu`),
  CONSTRAINT `fk_danhgia_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `KhachHang`(`ma_khach_hang`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_danhgia_sanpham` FOREIGN KEY (`ma_san_pham`) REFERENCES `SanPham`(`ma_san_pham`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_danhgia_dichvu` FOREIGN KEY (`ma_dich_vu`) REFERENCES `DichVu`(`ma_dich_vu`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 17. Bảng ThongBao
-- ----------------------------------------------------------------------------
CREATE TABLE `ThongBao` (
  `ma_thong_bao` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_tai_khoan` INT UNSIGNED DEFAULT NULL COMMENT 'NULL = thông báo chung cho quản trị/nhân viên',
  `tieu_de` VARCHAR(160) NOT NULL,
  `noi_dung` VARCHAR(500) NOT NULL,
  `loai` VARCHAR(30) NOT NULL DEFAULT 'info',
  `thoi_gian` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `da_doc` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`ma_thong_bao`),
  INDEX `idx_thongbao_tk` (`ma_tai_khoan`, `da_doc`),
  CONSTRAINT `fk_thongbao_taikhoan` FOREIGN KEY (`ma_tai_khoan`) REFERENCES `TaiKhoan`(`ma_tai_khoan`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 18. Bảng CuocHoiThoaiAI
-- ----------------------------------------------------------------------------
CREATE TABLE `CuocHoiThoaiAI` (
  `ma_cuoc_hoi_thoai` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_khach_hang` INT UNSIGNED DEFAULT NULL,
  `ma_tai_khoan` INT UNSIGNED DEFAULT NULL,
  `loai_tro_ly` ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  `thoi_gian_bat_dau` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_cuoc_hoi_thoai`),
  CONSTRAINT `fk_ai_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `KhachHang`(`ma_khach_hang`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_ai_taikhoan` FOREIGN KEY (`ma_tai_khoan`) REFERENCES `TaiKhoan`(`ma_tai_khoan`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 19. Bảng TinNhanAI
-- ----------------------------------------------------------------------------
CREATE TABLE `TinNhanAI` (
  `ma_tin_nhan` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_cuoc_hoi_thoai` INT UNSIGNED NOT NULL,
  `vai_tro` ENUM('user', 'assistant') NOT NULL,
  `noi_dung` TEXT NOT NULL,
  `thoi_gian` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_tin_nhan`),
  INDEX `idx_tinnhan_cht` (`ma_cuoc_hoi_thoai`),
  CONSTRAINT `fk_tinnhan_cht` FOREIGN KEY (`ma_cuoc_hoi_thoai`) REFERENCES `CuocHoiThoaiAI`(`ma_cuoc_hoi_thoai`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Bảng phụ trợ: CaiDat (cấu hình hệ thống & cửa hàng)
-- ----------------------------------------------------------------------------
CREATE TABLE `CaiDat` (
  `khoa` VARCHAR(80) NOT NULL,
  `gia_tri` TEXT DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`khoa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Bảng phụ trợ: EmailThongBao (lưu & theo dõi email duyệt/không duyệt đơn hàng)
-- ----------------------------------------------------------------------------
CREATE TABLE `EmailThongBao` (
  `ma_email` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_don_hang` INT UNSIGNED DEFAULT NULL,
  `ma_khach_hang` INT UNSIGNED DEFAULT NULL,
  `email_nhan` VARCHAR(150) NOT NULL,
  `tieu_de` VARCHAR(255) NOT NULL,
  `noi_dung_html` MEDIUMTEXT NOT NULL,
  `loai` ENUM('order_approved', 'order_rejected', 'general') NOT NULL DEFAULT 'general',
  `trang_thai_gui` ENUM('sent_smtp', 'logged_local', 'failed') NOT NULL DEFAULT 'logged_local',
  `ghi_chu_gui` VARCHAR(255) DEFAULT NULL,
  `da_doc` TINYINT(1) NOT NULL DEFAULT 0,
  `ngay_gui` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_email`),
  INDEX `idx_email_kh` (`ma_khach_hang`, `da_doc`),
  INDEX `idx_email_don` (`ma_don_hang`),
  CONSTRAINT `fk_email_donhang` FOREIGN KEY (`ma_don_hang`) REFERENCES `DonHang`(`ma_don_hang`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_email_khachhang` FOREIGN KEY (`ma_khach_hang`) REFERENCES `KhachHang`(`ma_khach_hang`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- DỮ LIỆU MẪU KHỞI TẠO — THƯƠNG HIỆU "GÓC NHỎ CÓ EM"
-- ============================================================================

INSERT INTO `Quyen` (`ma_quyen`, `ten_quyen`, `mo_ta`) VALUES
(1, 'admin', 'Quản trị viên — toàn quyền quản lý hệ thống, nhân sự, dữ liệu và báo cáo'),
(2, 'nhan_vien', 'Nhân viên — xử lý đơn hàng, hỗ trợ khách hàng, quản lý sản phẩm và lịch hẹn'),
(3, 'khach_hang', 'Khách hàng — mua sắm, đặt lịch spa, theo dõi đơn hàng và hỏi đáp Pawly AI');

-- Mật khẩu mẫu (đã mã hóa bcrypt bằng password_hash):
-- admin@gocnhocoem.vn      / Admin@123
-- nhanvien@gocnhocoem.vn   / Staff@123
-- khachhang@gocnhocoem.vn  / Khach@123
INSERT INTO `TaiKhoan` (`ma_tai_khoan`, `ten_dang_nhap`, `email`, `mat_khau`, `ma_quyen`, `trang_thai`) VALUES
(1, 'admin', 'admin@gocnhocoem.vn', '$2y$10$Z5WndJWJrKeJQTWmi/F3L.oypGyANocrAgwVUMbUGto1diFbtMRHS', 1, 'active'),
(2, 'nhanvien', 'nhanvien@gocnhocoem.vn', '$2y$10$UlIpdsmX2VQ6FpwjyoKXieDbS1X8E0Dohzj1jGN.TqXYu66jnQOrK', 2, 'active'),
(3, 'minhanh', 'khachhang@gocnhocoem.vn', '$2y$10$FvpLUheIalF84bJ1o49ruOLrJmdf/Dn3WqLDjrCmnMfALQjqtQd4O', 3, 'active');

INSERT INTO `NhanVien` (`ma_nhan_vien`, `ma_tai_khoan`, `ho_ten`, `so_dien_thoai`, `email`, `chuc_vu`, `trang_thai`) VALUES
(1, 1, 'Nguyễn Thị Lan', '0901234567', 'admin@gocnhocoem.vn', 'Quản lý cửa hàng', 'active'),
(2, 2, 'Trần Hoàng Nam', '0912345678', 'nhanvien@gocnhocoem.vn', 'Nhân viên bán hàng & Spa', 'active');

INSERT INTO `KhachHang` (`ma_khach_hang`, `ma_tai_khoan`, `ho_ten`, `so_dien_thoai`, `email`, `dia_chi`) VALUES
(1, 3, 'Nguyễn Minh Anh', '0987654321', 'khachhang@gocnhocoem.vn', '128 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh'),
(2, NULL, 'Lê Bảo Châu', '0938112233', 'baochau@gmail.com', '45 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh'),
(3, NULL, 'Phạm Gia Huy', '0977445566', 'giahuy@gmail.com', '19 Lê Lợi, Quận 1, TP. Hồ Chí Minh');

INSERT INTO `ThuCung` (`ma_thu_cung`, `ma_khach_hang`, `ten_thu_cung`, `loai`, `giong`, `tuoi`, `bieu_tuong`, `ghi_chu`) VALUES
(1, 1, 'Mochi', 'Mèo', 'Anh lông ngắn', '1 tuổi', '🐱', 'Hiền lành, thích pate cá hồi'),
(2, 1, 'Bông', 'Chó', 'Poodle Toy', '2 tuổi', '🐶', 'Da hơi nhạy cảm, dùng sữa tắm dịu nhẹ'),
(3, 2, 'Cam', 'Mèo', 'Mèo ta mướp vàng', '8 tháng', '🐱', 'Rất hiếu động');

INSERT INTO `DanhMuc` (`ma_danh_muc`, `slug`, `ten_danh_muc`, `mo_ta`, `bieu_tuong`, `hinh_anh`) VALUES
(1, 'food', 'Thức ăn', 'Hạt khô, pate, snack dinh dưỡng mỗi ngày cho chó mèo', '🥣', 'assets/images/categories/cat_food.jpg'),
(2, 'toy', 'Đồ chơi', 'Đồ chơi vận động, trí tuệ và xả stress cho thú cưng', '🧸', 'assets/images/categories/cat_toy.jpg'),
(3, 'care', 'Chăm sóc', 'Sữa tắm thảo mộc, vệ sinh tai mắt, lược chải lông', '🧴', 'assets/images/categories/cat_care.jpg'),
(4, 'accessory', 'Phụ kiện', 'Vòng cổ, dây dắt, nệm ngủ, bát ăn đáng yêu', '🎀', 'assets/images/categories/cat_accessory.jpg');

INSERT INTO `SanPham` (`ma_san_pham`, `ma_danh_muc`, `ten_san_pham`, `mo_ta`, `loai_thu_cung`, `gia`, `ton_kho`, `bieu_tuong`, `trang_thai`) VALUES
(1, 1, 'Hạt dinh dưỡng Royal Canin cho mèo trưởng thành 1.5kg', 'Công thức cân bằng protein và taurine giúp mèo mượt lông, tiêu hóa tốt và hạn chế búi lông.', 'meo', 285000.00, 24, '🥣', 'active'),
(2, 1, 'Pate cá hồi & bí đỏ tươi cho mèo (Gói 85g)', 'Thịt cá hồi thật kết hợp bí đỏ giàu chất xơ, không chất bảo quản, phù hợp cho cả mèo con và mèo lớn.', 'meo', 29000.00, 48, '🐟', 'active'),
(3, 1, 'Hạt hữu cơ vị gà & rau củ cho cún con 1.2kg', 'Hạt nhỏ dễ nhai, bổ sung DHA và canxi giúp chó con phát triển xương chắc khỏe.', 'cho', 245000.00, 18, '🦴', 'active'),
(4, 1, 'Bánh thưởng gặm sạch răng vị bạc hà cho chó', 'Giúp làm sạch mảng bám, thơm miệng và giảm ngứa nướu cho cún mọi độ tuổi.', 'cho', 65000.00, 7, '🍖', 'active'),
(5, 2, 'Cần câu lông vũ gắn chuông cho mèo', 'Thanh cầm nhẹ, lông vũ mềm an toàn kích thích bản năng săn mồi và vận động của mèo.', 'meo', 49000.00, 32, '🪶', 'active'),
(6, 2, 'Bóng cao su đàn hồi nhồi thưởng cho cún', 'Chất liệu cao su thiên nhiên bền bỉ, có khe nhét bánh thưởng giúp cún chơi vui không chán.', 'cho', 89000.00, 15, '🎾', 'active'),
(7, 2, 'Trụ cào móng bọc dây thừng sisal kèm quả bông', 'Bảo vệ sofa nhà bạn, giúp mèo mài móng tự nhiên và thư giãn mỗi ngày.', 'meo', 195000.00, 5, '🧸', 'active'),
(8, 3, 'Sữa tắm thảo mộc yến mạch dịu nhẹ cho chó mèo 500ml', 'Chiết xuất yến mạch và hoa cúc làm dịu da nhạy cảm, khử mùi hôi và lưu hương thơm nhẹ nhàng.', 'ca_hai', 165000.00, 22, '🧴', 'active'),
(9, 3, 'Lược chải lông gỡ rối có nút đẩy lông thông minh', 'Đầu răng tròn bọc silicon êm ái không làm xước da, giảm rụng lông bám trên quần áo.', 'ca_hai', 95000.00, 9, '🪮', 'active'),
(10, 3, 'Dung dịch vệ sinh tai dịu nhẹ cho thú cưng 120ml', 'Làm sạch ráy tai, giảm mùi hôi và hỗ trợ ngăn ngừa viêm tai nhẹ cho chó mèo.', 'ca_hai', 115000.00, 14, '💧', 'active'),
(11, 4, 'Vòng cổ nơ pastel kèm chuông khắc tên', 'Vải cotton mềm mại không gây cấn cổ, chốt an toàn cho mèo và chó giống nhỏ.', 'ca_hai', 79000.00, 26, '🎀', 'active'),
(12, 4, 'Nệm tròn bông mềm hình bánh donut màu hồng phấn', 'Đệm bông PP êm ái, vỏ tháo giặt dễ dàng, mang lại giấc ngủ ấm áp cho bé cưng.', 'ca_hai', 320000.00, 4, '🛏️', 'active');

INSERT INTO `HinhAnhSanPham` (`ma_san_pham`, `duong_dan`, `la_anh_chinh`) VALUES
(1, 'uploads/products/sp1_cat_kibble.jpg', 1),
(2, 'uploads/products/sp2_cat_pate.jpg', 1),
(3, 'uploads/products/sp3_puppy_food.jpg', 1),
(4, 'uploads/products/sp4_dental_chew.jpg', 1),
(5, 'uploads/products/sp5_cat_wand.jpg', 1),
(6, 'uploads/products/sp6_dog_ball.jpg', 1),
(7, 'uploads/products/sp7_cat_scratcher.jpg', 1),
(8, 'uploads/products/sp8_pet_shampoo.jpg', 1),
(9, 'uploads/products/sp9_pet_brush.jpg', 1),
(10, 'uploads/products/sp10_ear_cleaner.jpg', 1),
(11, 'uploads/products/sp11_pastel_collar.jpg', 1),
(12, 'uploads/products/sp12_donut_bed.jpg', 1);

INSERT INTO `DichVu` (`ma_dich_vu`, `ten_dich_vu`, `mo_ta`, `gia`, `thoi_luong`, `bieu_tuong`, `hinh_anh`, `trang_thai`) VALUES
(1, 'Tắm & vệ sinh cơ bản', 'Tắm sữa tắm thảo mộc, sấy khô bông xù, vệ sinh tai, cắt mài móng và cạo lông bàn chân.', 120000.00, 45, '🛁', 'assets/images/services/svc1_bath.jpg', 'active'),
(2, 'Gói Spa thư giãn toàn diện', 'Tắm dưỡng lông tinh dầu, massage thư giãn, ủ mềm mượt lông, vệ sinh tai mắt và xịt dưỡng thơm.', 219000.00, 75, '🎀', 'assets/images/services/svc2_spa.jpg', 'active'),
(3, 'Cắt tỉa tạo kiểu lông', 'Tắm sạch và cắt tỉa tạo kiểu gọn gàng, đáng yêu theo giống loài và yêu cầu của chủ nuôi.', 260000.00, 90, '✂️', 'assets/images/services/svc3_grooming.jpg', 'active'),
(4, 'Chăm sóc móng & vệ sinh tai', 'Cắt mài móng an toàn, vệ sinh lỗ tai sạch sẽ và chải gỡ lông rối nhanh gọn.', 69000.00, 25, '🐾', 'assets/images/services/svc4_nail_ear.jpg', 'active'),
(5, 'Tiêm phòng vắc-xin định kỳ', 'Khám sàng lọc sức khỏe trước tiêm, tư vấn phác đồ vắc-xin phù hợp cho chó mèo (5 bệnh, 7 bệnh, phòng dại, giảm bạch cầu...) và cấp sổ theo dõi tiêm chủng.', 0.00, 30, '💉', 'assets/images/services/svc5_vaccine.jpg', 'active');

-- Đơn hàng mẫu trải đều trong 7 ngày gần nhất để biểu đồ & báo cáo hoạt động thực tế ngay
INSERT INTO `DonHang` (`ma_don_hang`, `ma_don_code`, `ma_khach_hang`, `ten_nguoi_nhan`, `so_dien_thoai`, `dia_chi_nhan`, `ghi_chu`, `ngay_dat`, `tong_tien`, `trang_thai`) VALUES
(1, 'GN-1001', 1, 'Nguyễn Minh Anh', '0987654321', '128 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh', 'Giao giờ hành chính giúp mình', DATE_SUB(NOW(), INTERVAL 5 DAY), 343000.00, 'done'),
(2, 'GN-1002', 2, 'Lê Bảo Châu', '0938112233', '45 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh', '', DATE_SUB(NOW(), INTERVAL 3 DAY), 485000.00, 'done'),
(3, 'GN-1003', 3, 'Phạm Gia Huy', '0977445566', '19 Lê Lợi, Quận 1, TP. Hồ Chí Minh', 'Gọi trước khi giao 15 phút', DATE_SUB(NOW(), INTERVAL 1 DAY), 334000.00, 'shipping'),
(4, 'GN-1004', 1, 'Nguyễn Minh Anh', '0987654321', '128 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh', 'Chọn nơ màu hồng pastel nhé', NOW(), 244000.00, 'pending');

INSERT INTO `ChiTietDonHang` (`ma_don_hang`, `ma_san_pham`, `so_luong`, `don_gia`) VALUES
(1, 1, 1, 285000.00),
(1, 2, 2, 29000.00),
(2, 8, 1, 165000.00),
(2, 12, 1, 320000.00),
(3, 3, 1, 245000.00),
(3, 6, 1, 89000.00),
(4, 8, 1, 165000.00),
(4, 11, 1, 79000.00);

INSERT INTO `ThanhToan` (`ma_don_hang`, `phuong_thuc`, `so_tien`, `trang_thai`, `thoi_gian`) VALUES
(1, 'cod', 343000.00, 'paid', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 'bank_transfer', 485000.00, 'paid', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, 'cod', 334000.00, 'unpaid', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 'cod', 244000.00, 'unpaid', NOW());

INSERT INTO `LichHen` (`ma_lich_hen`, `ma_khach_hang`, `ma_thu_cung`, `ma_dich_vu`, `ten_chu_nuoi`, `so_dien_thoai`, `ten_thu_cung`, `bieu_tuong`, `ngay_gio`, `ghi_chu`, `trang_thai`) VALUES
(1, 1, 2, 2, 'Nguyễn Minh Anh', '0987654321', 'Bông', '🐶', DATE_ADD(NOW(), INTERVAL 1 DAY), 'Bé hơi sợ tiếng máy sấy mạnh', 'confirmed'),
(2, 2, 3, 1, 'Lê Bảo Châu', '0938112233', 'Cam', '🐱', DATE_ADD(NOW(), INTERVAL 2 DAY), 'Cắt thêm móng giúp bé', 'pending');

INSERT INTO `DanhGia` (`ma_khach_hang`, `ma_san_pham`, `ma_dich_vu`, `so_sao`, `noi_dung`) VALUES
(1, 1, NULL, 5, 'Mèo nhà mình rất thích hạt này, ăn ngon miệng và ít rụng lông hơn hẳn!'),
(2, 8, NULL, 5, 'Sữa tắm mùi thơm dịu nhẹ, tắm xong lông bé mềm mượt lắm.'),
(1, NULL, 2, 5, 'Nhân viên spa ở Góc nhỏ có em cực kỳ nhẹ nhàng, bé Bông đi về vui vẻ thơm tho.');

INSERT INTO `ThongBao` (`ma_tai_khoan`, `tieu_de`, `noi_dung`, `loai`, `da_doc`) VALUES
(NULL, 'Đơn hàng mới #GN-1004', 'Khách hàng Nguyễn Minh Anh vừa đặt đơn hàng trị giá 244.000 ₫ đang chờ xử lý.', 'order', 0),
(NULL, 'Cảnh báo tồn kho thấp', 'Nệm tròn bông mềm (còn 4) và Trụ cào móng (còn 5) sắp hết hàng, cần kiểm tra nhập bổ sung.', 'stock', 0),
(NULL, 'Lịch hẹn Spa mới', 'Bé Cam (chủ nuôi Lê Bảo Châu) đã đặt lịch Tắm & vệ sinh cơ bản.', 'appointment', 0);

INSERT INTO `CaiDat` (`khoa`, `gia_tri`) VALUES
('store_name', 'Góc nhỏ có em'),
('store_slogan', 'Nâng niu từng khoảnh khắc bên bé cưng'),
('store_hotline', '0901 234 567'),
('store_address', '128 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh'),
('store_logo', 'assets/images/logo.png'),
('bank_name', 'Vietcombank (VCB)'),
('bank_account_no', '1028 6688 9999'),
('bank_account_name', 'GOC NHO CO EM'),
('bank_transfer_note', 'GNCE'),
('bank_qr_image', ''),
('notifications', '1'),
('insights', '1'),
('reg_otp_enabled', '1'),
('sms_provider', 'demo'),
('sms_gateway_url', ''),
('sms_api_key', ''),
('sms_secret_key', ''),
('sms_brandname', '');
