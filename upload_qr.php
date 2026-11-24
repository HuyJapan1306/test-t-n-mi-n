<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

$pdo = get_db();
require_role(['admin'], $pdo);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_error('Phương thức không hợp lệ.', 405);
}

if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    json_error('Vui lòng chọn tệp ảnh mã QR hợp lệ.');
}

$file = $_FILES['image'];
if ($file['size'] > 3 * 1024 * 1024) {
    json_error('Kích thước ảnh mã QR tối đa là 3MB.');
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

$uploadDir = dirname(__DIR__, 2) . '/uploads/store';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$filename = 'qr_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $allowed[$mime];
$dest = $uploadDir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    json_error('Không thể lưu ảnh mã QR lên máy chủ.', 500);
}

$relativePath = 'uploads/store/' . $filename;

json_response([
    'message' => 'Đã tải ảnh mã QR chuyển khoản thành công.',
    'path' => $relativePath,
]);
