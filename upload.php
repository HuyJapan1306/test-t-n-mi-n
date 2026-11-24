<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

$pdo = get_db();
require_role(['admin', 'nhan_vien'], $pdo);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_error('Phương thức không hợp lệ.', 405);
}

if (empty($_FILES['image'])) {
    $contentLen = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLen > 0) {
        json_error('Tệp hình ảnh quá lớn vượt giới hạn máy chủ. Vui lòng chọn ảnh nhỏ hơn 10MB.');
    }
    json_error('Vui lòng chọn tệp hình ảnh hợp lệ.');
}

$file = $_FILES['image'];
$errCode = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
if ($errCode !== UPLOAD_ERR_OK) {
    $errMessages = [
        UPLOAD_ERR_INI_SIZE => 'Kích thước ảnh vượt giới hạn cấu hình máy chủ. Vui lòng chọn ảnh nhỏ hơn 10MB.',
        UPLOAD_ERR_FORM_SIZE => 'Kích thước ảnh vượt giới hạn cho phép (tối đa 10MB).',
        UPLOAD_ERR_PARTIAL => 'Tệp ảnh mới chỉ tải lên được một phần. Vui lòng thử lại.',
        UPLOAD_ERR_NO_FILE => 'Chưa có tệp hình ảnh nào được chọn.',
        UPLOAD_ERR_NO_TMP_DIR => 'Máy chủ thiếu thư mục tạm để xử lý tệp tải lên.',
        UPLOAD_ERR_CANT_WRITE => 'Máy chủ không thể ghi tệp ảnh vào ổ đĩa.',
        UPLOAD_ERR_EXTENSION => 'Tiện ích máy chủ đã chặn quá trình tải ảnh lên.',
    ];
    json_error($errMessages[$errCode] ?? 'Không thể nhận tệp hình ảnh tải lên. Vui lòng thử lại.');
}

$maxBytes = 10 * 1024 * 1024; // 10MB
if ((int)$file['size'] <= 0) {
    json_error('Tệp hình ảnh trống hoặc bị lỗi.');
}
if ((int)$file['size'] > $maxBytes) {
    json_error('Kích thước ảnh tối đa là 10MB.');
}

$allowedMime = [
    'image/jpeg' => 'jpg',
    'image/pjpeg' => 'jpg',
    'image/jpg' => 'jpg',
    'image/png' => 'png',
    'image/x-png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
    'image/avif' => 'avif',
    'image/bmp' => 'bmp',
    'image/x-ms-bmp' => 'bmp',
];

$allowedExt = [
    'jpg' => 'jpg',
    'jpeg' => 'jpg',
    'jfif' => 'jpg',
    'png' => 'png',
    'webp' => 'webp',
    'gif' => 'gif',
    'avif' => 'avif',
    'bmp' => 'bmp',
];

$mime = '';
if (class_exists('finfo')) {
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $detected = $finfo->file($file['tmp_name']);
    if (is_string($detected)) {
        $mime = strtolower(trim($detected));
    }
}

$ext = $allowedMime[$mime] ?? '';

// Fallback cho Windows/finfo khi nhận diện image/avif hoặc application/octet-stream
if ($ext === '') {
    $imgInfo = @getimagesize($file['tmp_name']);
    if (is_array($imgInfo) && !empty($imgInfo['mime'])) {
        $fallbackMime = strtolower(trim((string)$imgInfo['mime']));
        $ext = $allowedMime[$fallbackMime] ?? '';
    }
}

if ($ext === '') {
    $origExt = strtolower((string)pathinfo((string)($file['name'] ?? ''), PATHINFO_EXTENSION));
    $clientType = strtolower(trim((string)($file['type'] ?? '')));
    if (isset($allowedExt[$origExt]) && ($mime === '' || $mime === 'application/octet-stream' || str_starts_with($clientType, 'image/'))) {
        $ext = $allowedExt[$origExt];
    }
}

if ($ext === '') {
    json_error('Định dạng ảnh chưa được hỗ trợ. Vui lòng chọn ảnh JPG, PNG, WEBP, GIF, AVIF hoặc BMP.');
}

$uploadDir = dirname(__DIR__, 2) . '/uploads/products';
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
    json_error('Không thể khởi tạo thư mục lưu ảnh sản phẩm trên máy chủ.', 500);
}

$filename = 'sp_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$dest = $uploadDir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    json_error('Không thể lưu tệp ảnh lên máy chủ.', 500);
}

$relativePath = 'uploads/products/' . $filename;
$productId = (int)($_POST['ma_san_pham'] ?? 0);
if ($productId > 0) {
    $pdo->prepare('UPDATE HinhAnhSanPham SET la_anh_chinh = 0 WHERE ma_san_pham = ?')->execute([$productId]);
    $pdo->prepare('INSERT INTO HinhAnhSanPham (ma_san_pham, duong_dan, la_anh_chinh) VALUES (?, ?, 1)')
        ->execute([$productId, $relativePath]);
}

json_response([
    'message' => 'Đã tải ảnh sản phẩm lên thành công.',
    'path' => $relativePath,
]);
