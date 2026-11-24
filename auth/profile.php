<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

$pdo = get_db();
$user = require_auth($pdo);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_error('Phương thức không hợp lệ.', 405);
}

$in = get_json_input();
$hoTen = trim((string)($in['ho_ten'] ?? $user['ho_ten']));
$email = strtolower(trim((string)($in['email'] ?? $user['email'])));
$phone = trim((string)($in['so_dien_thoai'] ?? $user['so_dien_thoai']));
$diaChi = trim((string)($in['dia_chi'] ?? $user['dia_chi']));
$oldPass = (string)($in['mat_khau_cu'] ?? '');
$newPass = (string)($in['mat_khau_moi'] ?? '');
$otpCode = trim((string)($in['ma_xac_nhan'] ?? ''));
$requireOtp = true;
$hasAvatar = array_key_exists('anh_dai_dien', $in);
$avatarPath = $hasAvatar ? trim((string)$in['anh_dai_dien']) : null;
$isPasswordOnly = $newPass !== '' && !isset($in['ho_ten']) && !isset($in['email']) && !$hasAvatar;

if ($hoTen === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('Họ tên và email không được để trống hoặc sai định dạng.');
}

$dup = $pdo->prepare('SELECT ma_tai_khoan FROM TaiKhoan WHERE email = ? AND ma_tai_khoan <> ? LIMIT 1');
$dup->execute([$email, $user['ma_tai_khoan']]);
if ($dup->fetch()) {
    json_error('Email này đã thuộc về tài khoản khác.', 409);
}

try {
    $pdo->beginTransaction();

    if ($newPass !== '') {
        if (strlen($newPass) < 6) {
            $pdo->rollBack();
            json_error('Mật khẩu mới cần tối thiểu 6 ký tự.');
        }
        $curStmt = $pdo->prepare('SELECT mat_khau FROM TaiKhoan WHERE ma_tai_khoan = ?');
        $curStmt->execute([$user['ma_tai_khoan']]);
        $curHash = (string)$curStmt->fetchColumn();
        if (!password_verify($oldPass, $curHash)) {
            $pdo->rollBack();
            json_error('Mật khẩu hiện tại không đúng.', 400);
        }
        if ($requireOtp) {
            $otpData = $_SESSION['pw_change_otp'] ?? null;
            if (!is_array($otpData) || (int)($otpData['account_id'] ?? 0) !== (int)$user['ma_tai_khoan']) {
                $pdo->rollBack();
                json_error('Vui lòng yêu cầu gửi mã xác nhận qua email trước khi đổi mật khẩu.', 400);
            }
            if (time() > (int)($otpData['expires_at'] ?? 0)) {
                unset($_SESSION['pw_change_otp']);
                $pdo->rollBack();
                json_error('Mã xác nhận đã hết hạn. Vui lòng gửi lại mã mới.', 400);
            }
            $attempts = (int)($otpData['attempts'] ?? 0);
            if ($attempts >= 5) {
                unset($_SESSION['pw_change_otp']);
                $pdo->rollBack();
                json_error('Bạn đã nhập sai mã quá 5 lần. Vui lòng yêu cầu gửi lại mã mới.', 400);
            }
            if ($otpCode === '' || !password_verify($otpCode, (string)($otpData['code_hash'] ?? ''))) {
                $_SESSION['pw_change_otp']['attempts'] = $attempts + 1;
                $left = max(0, 5 - ($attempts + 1));
                $pdo->rollBack();
                json_error($left > 0
                    ? "Mã xác nhận không đúng (còn {$left} lần thử)."
                    : 'Bạn đã nhập sai mã quá 5 lần. Vui lòng yêu cầu gửi lại mã mới.', 400);
            }
        }
        $pdo->prepare('UPDATE TaiKhoan SET email = ?, mat_khau = ? WHERE ma_tai_khoan = ?')
            ->execute([$email, password_hash($newPass, PASSWORD_DEFAULT), $user['ma_tai_khoan']]);
        if ($requireOtp) {
            unset($_SESSION['pw_change_otp']);
        }
    } else {
        $pdo->prepare('UPDATE TaiKhoan SET email = ? WHERE ma_tai_khoan = ?')
            ->execute([$email, $user['ma_tai_khoan']]);
    }

    if ($hasAvatar) {
        $pdo->prepare('UPDATE TaiKhoan SET anh_dai_dien = ? WHERE ma_tai_khoan = ?')
            ->execute([$avatarPath !== '' ? $avatarPath : null, $user['ma_tai_khoan']]);
    }

    if ($user['ma_nhan_vien']) {
        $pdo->prepare('UPDATE NhanVien SET ho_ten = ?, so_dien_thoai = ?, email = ? WHERE ma_nhan_vien = ?')
            ->execute([$hoTen, $phone, $email, $user['ma_nhan_vien']]);
    }

    if ($user['ma_khach_hang']) {
        $pdo->prepare('UPDATE KhachHang SET ho_ten = ?, so_dien_thoai = ?, email = ?, dia_chi = ? WHERE ma_khach_hang = ?')
            ->execute([$hoTen, $phone, $email, $diaChi, $user['ma_khach_hang']]);
    }

    $pdo->commit();
    json_response([
        'message' => $isPasswordOnly
            ? 'Đã đổi mật khẩu thành công.'
            : 'Đã cập nhật hồ sơ cá nhân thành công.',
        'user' => current_user($pdo),
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Không thể cập nhật tài khoản: ' . $e->getMessage(), 500);
}
