<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

/**
 * Khởi tạo API JSON & Session an toàn
 */
function init_api(): void
{
    date_default_timezone_set('Asia/Ho_Chi_Minh');

    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }

    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(array_merge(['success' => true], $payload), JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $status = 400, array $extra = []): void
{
    http_response_code($status);
    echo json_encode(array_merge([
        'success' => false,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

function get_json_input(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return $_POST ?: [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : ($_POST ?: []);
}

function clean_phone(string $phone): string
{
    return preg_replace('/\D+/', '', $phone) ?? '';
}

function format_vnd(float|int|string $amount): string
{
    return number_format((float)$amount, 0, ',', '.') . ' ₫';
}

function normalize_vi(string $text): string
{
    $text = mb_strtolower($text, 'UTF-8');
    $map = [
        'à'=>'a','á'=>'a','ạ'=>'a','ả'=>'a','ã'=>'a','â'=>'a','ầ'=>'a','ấ'=>'a','ậ'=>'a','ẩ'=>'a','ẫ'=>'a','ă'=>'a','ằ'=>'a','ắ'=>'a','ặ'=>'a','ẳ'=>'a','ẵ'=>'a',
        'è'=>'e','é'=>'e','ẹ'=>'e','ẻ'=>'e','ẽ'=>'e','ê'=>'e','ề'=>'e','ế'=>'e','ệ'=>'e','ể'=>'e','ễ'=>'e',
        'ì'=>'i','í'=>'i','ị'=>'i','ỉ'=>'i','ĩ'=>'i',
        'ò'=>'o','ó'=>'o','ọ'=>'o','ỏ'=>'o','õ'=>'o','ô'=>'o','ồ'=>'o','ố'=>'o','ộ'=>'o','ổ'=>'o','ỗ'=>'o','ơ'=>'o','ờ'=>'o','ớ'=>'o','ợ'=>'o','ở'=>'o','ỡ'=>'o',
        'ù'=>'u','ú'=>'u','ụ'=>'u','ủ'=>'u','ũ'=>'u','ư'=>'u','ừ'=>'u','ứ'=>'u','ự'=>'u','ử'=>'u','ữ'=>'u',
        'ỳ'=>'y','ý'=>'y','ỵ'=>'y','ỷ'=>'y','ỹ'=>'y',
        'đ'=>'d',
    ];
    return strtr($text, $map);
}

/**
 * Lấy thông tin người dùng hiện tại từ Session + kiểm tra DB
 */
function current_user(?PDO $pdo = null): ?array
{
    $accountId = $_SESSION['user_id'] ?? null;
    if (!$accountId) {
        return null;
    }

    $pdo = $pdo ?? get_db();
    $stmt = $pdo->prepare(
        "SELECT tk.ma_tai_khoan, tk.ten_dang_nhap, tk.email, tk.trang_thai, tk.anh_dai_dien,
                q.ma_quyen, q.ten_quyen,
                kh.ma_khach_hang, kh.ho_ten AS kh_ho_ten, kh.so_dien_thoai AS kh_sdt, kh.dia_chi AS kh_dia_chi,
                nv.ma_nhan_vien, nv.ho_ten AS nv_ho_ten, nv.so_dien_thoai AS nv_sdt, nv.chuc_vu
         FROM TaiKhoan tk
         JOIN Quyen q ON q.ma_quyen = tk.ma_quyen
         LEFT JOIN KhachHang kh ON kh.ma_tai_khoan = tk.ma_tai_khoan
         LEFT JOIN NhanVien nv ON nv.ma_tai_khoan = tk.ma_tai_khoan
         WHERE tk.ma_tai_khoan = ?
         LIMIT 1"
    );
    $stmt->execute([$accountId]);
    $row = $stmt->fetch();

    if (!$row || $row['trang_thai'] !== 'active') {
        unset($_SESSION['user_id']);
        return null;
    }

    $name = $row['nv_ho_ten'] ?: ($row['kh_ho_ten'] ?: $row['ten_dang_nhap']);
    $phone = $row['nv_sdt'] ?: ($row['kh_sdt'] ?: '');

    return [
        'ma_tai_khoan' => (int)$row['ma_tai_khoan'],
        'ten_dang_nhap' => $row['ten_dang_nhap'],
        'email' => $row['email'],
        'role' => $row['ten_quyen'],
        'ma_quyen' => (int)$row['ma_quyen'],
        'ma_khach_hang' => $row['ma_khach_hang'] ? (int)$row['ma_khach_hang'] : null,
        'ma_nhan_vien' => $row['ma_nhan_vien'] ? (int)$row['ma_nhan_vien'] : null,
        'ho_ten' => $name,
        'so_dien_thoai' => $phone,
        'dia_chi' => $row['kh_dia_chi'] ?? '',
        'chuc_vu' => $row['chuc_vu'] ?? ($row['ten_quyen'] === 'khach_hang' ? 'Khách hàng' : 'Quản trị'),
        'anh_dai_dien' => (string)($row['anh_dai_dien'] ?? ''),
    ];
}

function require_auth(?PDO $pdo = null): array
{
    $user = current_user($pdo);
    if (!$user) {
        json_error('Vui lòng đăng nhập để thực hiện chức năng này.', 401);
    }
    return $user;
}

function require_role(array $allowedRoles, ?PDO $pdo = null): array
{
    $user = require_auth($pdo);
    if (!in_array($user['role'], $allowedRoles, true)) {
        json_error('Bạn không có quyền truy cập chức năng này.', 403);
    }
    return $user;
}

function create_notification(PDO $pdo, string $title, string $content, string $type = 'info', ?int $accountId = null): void
{
    $stmt = $pdo->prepare(
        "INSERT INTO ThongBao (ma_tai_khoan, tieu_de, noi_dung, loai, da_doc)
         VALUES (?, ?, ?, ?, 0)"
    );
    $stmt->execute([$accountId, mb_substr($title, 0, 160), mb_substr($content, 0, 500), $type]);
}

/**
 * Giới hạn tần suất gọi API theo phiên làm việc
 */
function check_rate_limit(string $bucket, int $maxRequests = 25, int $windowSeconds = 60): void
{
    $now = time();
    $history = $_SESSION['rate_limit'][$bucket] ?? [];
    $history = array_values(array_filter($history, static fn($ts) => ($now - (int)$ts) < $windowSeconds));

    if (count($history) >= $maxRequests) {
        json_error('Bạn gửi yêu cầu quá nhanh. Vui lòng đợi một chút rồi thử lại nhé.', 429);
    }

    $history[] = $now;
    $_SESSION['rate_limit'][$bucket] = $history;
}
