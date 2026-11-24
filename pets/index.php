<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

$pdo = get_db();
$user = require_auth($pdo);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (!$user['ma_khach_hang']) {
    json_response(['pets' => []]);
}

$cid = (int)$user['ma_khach_hang'];

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT * FROM ThuCung WHERE ma_khach_hang = ? ORDER BY ma_thu_cung DESC');
    $stmt->execute([$cid]);
    json_response(['pets' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $in = get_json_input();
    $ten = trim((string)($in['ten_thu_cung'] ?? ''));
    $loai = trim((string)($in['loai'] ?? 'Chó'));
    $giong = trim((string)($in['giong'] ?? ''));
    $tuoi = trim((string)($in['tuoi'] ?? ''));
    $bieuTuong = trim((string)($in['bieu_tuong'] ?? '🐶')) ?: '🐶';
    $ghiChu = trim((string)($in['ghi_chu'] ?? ''));

    if ($ten === '') {
        json_error('Vui lòng nhập tên thú cưng.');
    }

    $stmt = $pdo->prepare(
        "INSERT INTO ThuCung (ma_khach_hang, ten_thu_cung, loai, giong, tuoi, bieu_tuong, ghi_chu)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$cid, $ten, $loai, $giong, $tuoi, $bieuTuong, $ghiChu]);
    json_response([
        'message' => 'Đã lưu hồ sơ bé ' . $ten . ' 🐾',
        'ma_thu_cung' => (int)$pdo->lastInsertId(),
    ], 201);
}

if ($method === 'PUT') {
    $in = get_json_input();
    $id = (int)($in['ma_thu_cung'] ?? 0);
    $ten = trim((string)($in['ten_thu_cung'] ?? ''));
    $loai = trim((string)($in['loai'] ?? 'Chó')) ?: 'Chó';
    $giong = trim((string)($in['giong'] ?? ''));
    $tuoi = trim((string)($in['tuoi'] ?? ''));
    $bieuTuong = trim((string)($in['bieu_tuong'] ?? '🐶')) ?: '🐶';
    $ghiChu = trim((string)($in['ghi_chu'] ?? ''));

    if ($id <= 0) {
        json_error('Thiếu mã thú cưng cần cập nhật.');
    }
    if ($ten === '') {
        json_error('Vui lòng nhập tên thú cưng.');
    }

    $chk = $pdo->prepare('SELECT ma_thu_cung FROM ThuCung WHERE ma_thu_cung = ? AND ma_khach_hang = ? LIMIT 1');
    $chk->execute([$id, $cid]);
    if (!$chk->fetchColumn()) {
        json_error('Không tìm thấy hồ sơ thú cưng của bạn.', 404);
    }

    $pdo->prepare(
        "UPDATE ThuCung
         SET ten_thu_cung = ?, loai = ?, giong = ?, tuoi = ?, bieu_tuong = ?, ghi_chu = ?
         WHERE ma_thu_cung = ? AND ma_khach_hang = ?"
    )->execute([$ten, $loai, $giong, $tuoi, $bieuTuong, $ghiChu, $id, $cid]);

    json_response(['message' => 'Đã cập nhật thông tin bé ' . $ten . ' 🐾']);
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? (get_json_input()['ma_thu_cung'] ?? 0));
    $pdo->prepare('DELETE FROM ThuCung WHERE ma_thu_cung = ? AND ma_khach_hang = ?')->execute([$id, $cid]);
    json_response(['message' => 'Đã xóa hồ sơ thú cưng.']);
}

json_error('Phương thức không được hỗ trợ.', 405);
