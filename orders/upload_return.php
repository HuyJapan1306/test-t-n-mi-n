<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_error('Chỉ hỗ trợ phương thức POST.', 405);
}

$pdo = get_db();
require_auth($pdo);

if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    json_error('Vui lòng chụp hoặc chọn hình ảnh sản phẩm hợp lệ để tải lên.');
}

$file = $_FILES['image'];
if ($file['size'] > 5 * 1024 * 1024) {
    json_error('Kích thước ảnh trả hàng tối đa 5MB.');
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
    json_error('Chỉ chấp nhận định dạng ảnh JPG, PNG, WEBP hoặc GIF.');
}

$uploadDir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'returns';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0775, true);
}

$filename = 'ret_' . date('YmdHis') . '_' . bin2hex(random_bytes(4)) . '.' . $allowed[$mime];
$dest = $uploadDir . DIRECTORY_SEPARATOR . $filename;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    json_error('Không thể lưu hình ảnh sản phẩm trả hàng trên máy chủ.', 500);
}

json_response([
    'message' => 'Đã tải ảnh sản phẩm trả hàng thành công.',
    'path' => 'uploads/returns/' . $filename,
], 201);
