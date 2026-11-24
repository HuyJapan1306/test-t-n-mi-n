<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

$pdo = get_db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    require_role(['admin', 'nhan_vien'], $pdo);
    $stmt = $pdo->query(
        "SELECT nv.ma_nhan_vien, nv.ma_tai_khoan, nv.ho_ten, nv.so_dien_thoai, nv.email, nv.chuc_vu, nv.trang_thai, nv.created_at,
                tk.ten_dang_nhap, tk.trang_thai AS trang_thai_tai_khoan, q.ten_quyen
         FROM NhanVien nv
         LEFT JOIN TaiKhoan tk ON tk.ma_tai_khoan = nv.ma_tai_khoan
         LEFT JOIN Quyen q ON q.ma_quyen = tk.ma_quyen
         ORDER BY nv.ma_nhan_vien ASC"
    );
    json_response(['employees' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    require_role(['admin'], $pdo);
    $in = get_json_input();

    $hoTen = trim((string)($in['ho_ten'] ?? ''));
    $chucVu = trim((string)($in['chuc_vu'] ?? 'Nhân viên bán hàng'));
    $phone = trim((string)($in['so_dien_thoai'] ?? ''));
    $email = strtolower(trim((string)($in['email'] ?? '')));
    $matKhau = (string)($in['mat_khau'] ?? 'Staff@123');
    $tenQuyen = (string)($in['ten_quyen'] ?? 'nhan_vien');

    if ($hoTen === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('Vui lòng nhập họ tên và email hợp lệ cho nhân viên.');
    }
    if (strlen($matKhau) < 6) {
        json_error('Mật khẩu tài khoản nhân viên cần tối thiểu 6 ký tự.');
    }
    if (!in_array($tenQuyen, ['admin', 'nhan_vien'], true)) {
        $tenQuyen = 'nhan_vien';
    }

    $dup = $pdo->prepare('SELECT ma_tai_khoan FROM TaiKhoan WHERE email = ? OR ten_dang_nhap = ? LIMIT 1');
    $dup->execute([$email, $email]);
    if ($dup->fetch()) {
        json_error('Email này đã tồn tại trong hệ thống tài khoản.', 409);
    }

    $qStmt = $pdo->prepare('SELECT ma_quyen FROM Quyen WHERE ten_quyen = ? LIMIT 1');
    $qStmt->execute([$tenQuyen]);
    $maQuyen = (int)$qStmt->fetchColumn();

    try {
        $pdo->beginTransaction();
        $pdo->prepare(
            "INSERT INTO TaiKhoan (ten_dang_nhap, email, mat_khau, ma_quyen, trang_thai)
             VALUES (?, ?, ?, ?, 'active')"
        )->execute([$email, $email, password_hash($matKhau, PASSWORD_DEFAULT), $maQuyen]);
        $accountId = (int)$pdo->lastInsertId();

        $pdo->prepare(
            "INSERT INTO NhanVien (ma_tai_khoan, ho_ten, so_dien_thoai, email, chuc_vu, trang_thai)
             VALUES (?, ?, ?, ?, ?, 'active')"
        )->execute([$accountId, $hoTen, $phone, $email, $chucVu]);

        $pdo->commit();
        json_response(['message' => 'Đã tạo nhân viên và cấp tài khoản thành công!'], 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_error('Không thể thêm nhân viên: ' . $e->getMessage(), 500);
    }
}

if ($method === 'PUT') {
    $admin = require_role(['admin'], $pdo);
    $in = get_json_input();
    $empId = (int)($in['ma_nhan_vien'] ?? 0);
    if ($empId <= 0) {
        json_error('Thiếu mã nhân viên.');
    }

    $stmt = $pdo->prepare('SELECT * FROM NhanVien WHERE ma_nhan_vien = ?');
    $stmt->execute([$empId]);
    $emp = $stmt->fetch();
    if (!$emp) {
        json_error('Không tìm thấy nhân viên.', 404);
    }

    if ((int)$emp['ma_tai_khoan'] === (int)$admin['ma_tai_khoan'] && ($in['trang_thai_tai_khoan'] ?? '') === 'locked') {
        json_error('Không thể tự khóa tài khoản quản trị đang đăng nhập.', 400);
    }

    $chucVu = trim((string)($in['chuc_vu'] ?? $emp['chuc_vu']));
    $accStatus = (string)($in['trang_thai_tai_khoan'] ?? '');
    $tenQuyen = (string)($in['ten_quyen'] ?? '');

    $pdo->prepare('UPDATE NhanVien SET chuc_vu = ?, trang_thai = ? WHERE ma_nhan_vien = ?')
        ->execute([$chucVu, $accStatus === 'locked' ? 'inactive' : 'active', $empId]);

    if ($emp['ma_tai_khoan']) {
        if (in_array($accStatus, ['active', 'locked'], true)) {
            $pdo->prepare('UPDATE TaiKhoan SET trang_thai = ? WHERE ma_tai_khoan = ?')
                ->execute([$accStatus, $emp['ma_tai_khoan']]);
        }
        if (in_array($tenQuyen, ['admin', 'nhan_vien'], true)) {
            $qId = (int)$pdo->query("SELECT ma_quyen FROM Quyen WHERE ten_quyen = " . $pdo->quote($tenQuyen))->fetchColumn();
            if ($qId > 0) {
                $pdo->prepare('UPDATE TaiKhoan SET ma_quyen = ? WHERE ma_tai_khoan = ?')->execute([$qId, $emp['ma_tai_khoan']]);
            }
        }
    }

    json_response(['message' => 'Đã cập nhật thông tin nhân viên & phân quyền.']);
}

json_error('Phương thức không được hỗ trợ.', 405);
