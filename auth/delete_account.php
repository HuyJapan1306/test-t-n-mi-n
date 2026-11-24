<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['POST', 'DELETE'], true)) {
    json_error('Chỉ hỗ trợ phương thức POST hoặc DELETE.', 405);
}

$pdo = get_db();
$user = require_auth($pdo);

if ($user['role'] !== 'khach_hang') {
    json_error('Tài khoản quản trị viên / nhân viên không thể tự xóa tại đây. Vui lòng liên hệ Quản trị viên.', 403);
}

$in = get_json_input();
$password = (string)($in['mat_khau'] ?? '');
if ($password === '') {
    json_error('Vui lòng nhập mật khẩu hiện tại để xác nhận xóa tài khoản.');
}

$accStmt = $pdo->prepare('SELECT ma_tai_khoan, mat_khau, email FROM TaiKhoan WHERE ma_tai_khoan = ? LIMIT 1');
$accStmt->execute([$user['ma_tai_khoan']]);
$acc = $accStmt->fetch();
if (!$acc || !password_verify($password, (string)$acc['mat_khau'])) {
    json_error('Mật khẩu xác nhận không chính xác. Vui lòng kiểm tra lại.', 401);
}

$customerId = !empty($user['ma_khach_hang']) ? (int)$user['ma_khach_hang'] : 0;

// Không cho xóa nếu còn đơn hàng đang chờ xử lý / đang vận chuyển
if ($customerId > 0) {
    $ordChk = $pdo->prepare(
        "SELECT COUNT(*) FROM DonHang
         WHERE ma_khach_hang = ? AND trang_thai IN ('pending', 'confirmed', 'shipping')"
    );
    $ordChk->execute([$customerId]);
    if ((int)$ordChk->fetchColumn() > 0) {
        json_error(
            'Bạn đang có đơn hàng chưa hoàn tất (chờ xử lý hoặc đang vận chuyển). Vui lòng hủy hoặc hoàn tất đơn trước khi xóa tài khoản nhé!',
            409
        );
    }
}

try {
    $pdo->beginTransaction();

    // Hủy các lịch hẹn Spa tương lai chưa thực hiện (nếu có) để trả lại khung giờ trống
    if ($customerId > 0) {
        $pdo->prepare(
            "UPDATE LichHen SET trang_thai = 'cancelled'
             WHERE ma_khach_hang = ? AND trang_thai IN ('pending', 'confirmed') AND ngay_gio >= NOW()"
        )->execute([$customerId]);

        // Xóa hồ sơ KhachHang (tự cascade ThuCung, GioHang, DanhGia; SET NULL trên DonHang/LichHen lịch sử)
        $pdo->prepare('DELETE FROM KhachHang WHERE ma_khach_hang = ?')->execute([$customerId]);
    }

    // Xóa tài khoản đăng nhập
    $pdo->prepare('DELETE FROM TaiKhoan WHERE ma_tai_khoan = ?')->execute([$user['ma_tai_khoan']]);

    $pdo->commit();

    // Hủy phiên đăng nhập hiện tại
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();

    json_response(['message' => 'Tài khoản của bạn đã được xóa vĩnh viễn khỏi hệ thống. Hẹn gặp lại bạn ở Góc nhỏ có em!']);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Không thể xóa tài khoản lúc này: ' . $e->getMessage(), 500);
}
