<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

$pdo = get_db();
$user = require_auth($pdo);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_error('Phương thức không hợp lệ.', 405);
}

if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    json_error('Vui lòng chọn tệp ảnh đại diện hợp lệ.');
}

$file = $_FILES['image'];
if ($file['size'] > 3 * 1024 * 1024) {
    json_error('Kích thước ảnh đại diện tối đa là 3MB.');
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
$allowed = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
];

if (!isset($allowed[$mime])) {
    json_error('Chỉ hỗ trợ định dạng ảnh JPG, PNG, WEBP hoặc GIF.');
}

$uploadDir = dirname(__DIR__, 2) . '/uploads/avatars';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$filename = 'avt_' . (int)$user['ma_tai_khoan'] . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $allowed[$mime];
$dest = $uploadDir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    json_error('Không thể lưu ảnh đại diện lên máy chủ.', 500);
}

$relativePath = 'uploads/avatars/' . $filename;

json_response([
    'message' => 'Đã tải ảnh đại diện thành công.',
    'path' => $relativePath,
]);
