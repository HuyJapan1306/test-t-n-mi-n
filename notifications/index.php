<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

$pdo = get_db();
$user = require_auth($pdo);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (in_array($user['role'], ['admin', 'nhan_vien'], true)) {
        $stmt = $pdo->prepare(
            "SELECT * FROM ThongBao
             WHERE ma_tai_khoan IS NULL OR ma_tai_khoan = ?
             ORDER BY thoi_gian DESC
             LIMIT 40"
        );
        $stmt->execute([$user['ma_tai_khoan']]);
    } else {
        $stmt = $pdo->prepare(
            "SELECT * FROM ThongBao
             WHERE ma_tai_khoan = ?
             ORDER BY thoi_gian DESC
             LIMIT 30"
        );
        $stmt->execute([$user['ma_tai_khoan']]);
    }
    $list = $stmt->fetchAll();
    $unread = count(array_filter($list, static fn($n) => (int)$n['da_doc'] === 0));
    json_response(['notifications' => $list, 'unread' => $unread]);
}

if ($method === 'POST') {
    $in = get_json_input();
    $action = (string)($in['action'] ?? 'mark_all_read');

    if ($action === 'mark_all_read') {
        if (in_array($user['role'], ['admin', 'nhan_vien'], true)) {
            $pdo->prepare('UPDATE ThongBao SET da_doc = 1 WHERE ma_tai_khoan IS NULL OR ma_tai_khoan = ?')
                ->execute([$user['ma_tai_khoan']]);
        } else {
            $pdo->prepare('UPDATE ThongBao SET da_doc = 1 WHERE ma_tai_khoan = ?')
                ->execute([$user['ma_tai_khoan']]);
        }
        json_response(['message' => 'Đã đánh dấu tất cả thông báo là đã đọc.']);
    }

    if ($action === 'create') {
        require_role(['admin'], $pdo);
        $title = trim((string)($in['tieu_de'] ?? ''));
        $content = trim((string)($in['noi_dung'] ?? ''));
        if ($title === '' || $content === '') {
            json_error('Vui lòng nhập tiêu đề và nội dung thông báo.');
        }
        create_notification($pdo, $title, $content, 'system', null);
        json_response(['message' => 'Đã tạo thông báo hệ thống.'], 201);
    }
}

json_error('Phương thức không được hỗ trợ.', 405);
