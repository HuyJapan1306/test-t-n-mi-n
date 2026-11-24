<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

$pdo = get_db();
$user = require_auth($pdo);

if (!$user['ma_khach_hang']) {
    $stmt = $pdo->prepare(
        "INSERT INTO KhachHang (ma_tai_khoan, ho_ten, so_dien_thoai, email, dia_chi)
         VALUES (?, ?, ?, ?, '')"
    );
    $stmt->execute([$user['ma_tai_khoan'], $user['ho_ten'], $user['so_dien_thoai'] ?: '0900000000', $user['email']]);
    $user['ma_khach_hang'] = (int)$pdo->lastInsertId();
}

$customerId = (int)$user['ma_khach_hang'];

function clean_variant_text($raw): string
{
    $txt = trim((string)($raw ?? ''));
    return mb_substr($txt, 0, 250, 'UTF-8');
}

function get_or_create_cart_id(PDO $pdo, int $customerId): int
{
    $stmt = $pdo->prepare("SELECT ma_gio_hang FROM GioHang WHERE ma_khach_hang = ? AND trang_thai = 'active' ORDER BY ma_gio_hang DESC LIMIT 1");
    $stmt->execute([$customerId]);
    $id = $stmt->fetchColumn();
    if ($id) {
        return (int)$id;
    }
    $pdo->prepare("INSERT INTO GioHang (ma_khach_hang, trang_thai) VALUES (?, 'active')")->execute([$customerId]);
    return (int)$pdo->lastInsertId();
}

function fetch_cart_payload(PDO $pdo, int $cartId): array
{
    $stmt = $pdo->prepare(
        "SELECT ct.ma_chi_tiet, ct.ma_san_pham, ct.phan_loai, ct.so_luong,
                sp.ten_san_pham, sp.gia, sp.ton_kho, sp.bieu_tuong, sp.trang_thai,
                (SELECT ha.duong_dan FROM HinhAnhSanPham ha WHERE ha.ma_san_pham = sp.ma_san_pham ORDER BY ha.la_anh_chinh DESC LIMIT 1) AS anh_chinh
         FROM ChiTietGioHang ct
         JOIN SanPham sp ON sp.ma_san_pham = ct.ma_san_pham
         WHERE ct.ma_gio_hang = ?
         ORDER BY ct.ma_chi_tiet DESC"
    );
    $stmt->execute([$cartId]);
    $rows = $stmt->fetchAll();

    $items = [];
    $total = 0.0;
    $count = 0;
    foreach ($rows as $r) {
        if ($r['trang_thai'] !== 'active' || (int)$r['ton_kho'] <= 0) {
            $pdo->prepare('DELETE FROM ChiTietGioHang WHERE ma_chi_tiet = ?')->execute([$r['ma_chi_tiet']]);
            continue;
        }
        $qty = min((int)$r['so_luong'], (int)$r['ton_kho']);
        if ($qty !== (int)$r['so_luong']) {
            $pdo->prepare('UPDATE ChiTietGioHang SET so_luong = ? WHERE ma_chi_tiet = ?')->execute([$qty, $r['ma_chi_tiet']]);
        }
        $lineTotal = (float)$r['gia'] * $qty;
        $total += $lineTotal;
        $count += $qty;
        $items[] = [
            'ma_chi_tiet' => (int)$r['ma_chi_tiet'],
            'ma_san_pham' => (int)$r['ma_san_pham'],
            'phan_loai' => (string)($r['phan_loai'] ?? ''),
            'ten_san_pham' => $r['ten_san_pham'],
            'gia' => (float)$r['gia'],
            'ton_kho' => (int)$r['ton_kho'],
            'bieu_tuong' => $r['bieu_tuong'],
            'anh_chinh' => $r['anh_chinh'],
            'so_luong' => $qty,
            'thanh_tien' => $lineTotal,
        ];
    }

    return [
        'ma_gio_hang' => $cartId,
        'items' => $items,
        'total_qty' => $count,
        'total_amount' => $total,
    ];
}

function total_qty_for_product_in_cart(PDO $pdo, int $cartId, int $productId, ?int $excludeDetailId = null): int
{
    if ($excludeDetailId !== null) {
        $stmt = $pdo->prepare('SELECT COALESCE(SUM(so_luong), 0) FROM ChiTietGioHang WHERE ma_gio_hang = ? AND ma_san_pham = ? AND ma_chi_tiet <> ?');
        $stmt->execute([$cartId, $productId, $excludeDetailId]);
    } else {
        $stmt = $pdo->prepare('SELECT COALESCE(SUM(so_luong), 0) FROM ChiTietGioHang WHERE ma_gio_hang = ? AND ma_san_pham = ?');
        $stmt->execute([$cartId, $productId]);
    }
    return (int)$stmt->fetchColumn();
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$cartId = get_or_create_cart_id($pdo, $customerId);

if ($method === 'GET') {
    json_response(fetch_cart_payload($pdo, $cartId));
}

if ($method === 'POST') {
    $in = get_json_input();

    // Hỗ trợ đồng bộ giỏ hàng khách vãng lai (kèm phân loại) khi vừa đăng nhập
    if (!empty($in['sync_items']) && is_array($in['sync_items'])) {
        foreach ($in['sync_items'] as $si) {
            $pid = (int)($si['ma_san_pham'] ?? 0);
            $qty = max(1, (int)($si['so_luong'] ?? 1));
            $variant = clean_variant_text($si['phan_loai'] ?? '');
            if ($pid <= 0) continue;

            $pStmt = $pdo->prepare("SELECT ton_kho FROM SanPham WHERE ma_san_pham = ? AND trang_thai = 'active'");
            $pStmt->execute([$pid]);
            $stock = $pStmt->fetchColumn();
            if ($stock === false || (int)$stock <= 0) continue;

            $ex = $pdo->prepare('SELECT ma_chi_tiet, so_luong FROM ChiTietGioHang WHERE ma_gio_hang = ? AND ma_san_pham = ? AND phan_loai = ?');
            $ex->execute([$cartId, $pid, $variant]);
            $row = $ex->fetch();
            $otherQty = total_qty_for_product_in_cart($pdo, $cartId, $pid, $row ? (int)$row['ma_chi_tiet'] : null);
            $maxAllowed = max(0, (int)$stock - $otherQty);
            if ($maxAllowed <= 0) continue;

            $newQty = min($maxAllowed, ($row ? (int)$row['so_luong'] : 0) + $qty);
            if ($row) {
                $pdo->prepare('UPDATE ChiTietGioHang SET so_luong = ? WHERE ma_chi_tiet = ?')->execute([$newQty, $row['ma_chi_tiet']]);
            } else {
                $pdo->prepare('INSERT INTO ChiTietGioHang (ma_gio_hang, ma_san_pham, phan_loai, so_luong) VALUES (?, ?, ?, ?)')
                    ->execute([$cartId, $pid, $variant, $newQty]);
            }
        }
        json_response(array_merge(['message' => 'Đã đồng bộ giỏ hàng.'], fetch_cart_payload($pdo, $cartId)));
    }

    $productId = (int)($in['ma_san_pham'] ?? 0);
    $qty = max(1, (int)($in['so_luong'] ?? 1));
    $variant = clean_variant_text($in['phan_loai'] ?? '');

    $pStmt = $pdo->prepare("SELECT ten_san_pham, ton_kho FROM SanPham WHERE ma_san_pham = ? AND trang_thai = 'active'");
    $pStmt->execute([$productId]);
    $prod = $pStmt->fetch();
    if (!$prod || (int)$prod['ton_kho'] <= 0) {
        json_error('Sản phẩm này hiện đã hết hàng hoặc ngừng kinh doanh.');
    }

    $exStmt = $pdo->prepare('SELECT ma_chi_tiet, so_luong FROM ChiTietGioHang WHERE ma_gio_hang = ? AND ma_san_pham = ? AND phan_loai = ?');
    $exStmt->execute([$cartId, $productId, $variant]);
    $existing = $exStmt->fetch();

    $otherQty = total_qty_for_product_in_cart($pdo, $cartId, $productId, $existing ? (int)$existing['ma_chi_tiet'] : null);
    $desired = ($existing ? (int)$existing['so_luong'] : 0) + $qty;

    if ($otherQty + $desired > (int)$prod['ton_kho']) {
        json_error('Không thể thêm vượt quá số lượng tồn kho hiện có (' . $prod['ton_kho'] . ').');
    }

    if ($existing) {
        $pdo->prepare('UPDATE ChiTietGioHang SET so_luong = ? WHERE ma_chi_tiet = ?')
            ->execute([$desired, $existing['ma_chi_tiet']]);
    } else {
        $pdo->prepare('INSERT INTO ChiTietGioHang (ma_gio_hang, ma_san_pham, phan_loai, so_luong) VALUES (?, ?, ?, ?)')
            ->execute([$cartId, $productId, $variant, $desired]);
    }

    $label = $variant !== '' ? "{$prod['ten_san_pham']} ({$variant})" : $prod['ten_san_pham'];
    json_response(array_merge(
        ['message' => "Đã thêm {$label} vào giỏ hàng 💕"],
        fetch_cart_payload($pdo, $cartId)
    ));
}

if ($method === 'PUT') {
    $in = get_json_input();
    $detailId = (int)($in['ma_chi_tiet'] ?? 0);
    $productId = (int)($in['ma_san_pham'] ?? 0);
    $variant = clean_variant_text($in['phan_loai'] ?? '');
    $qty = (int)($in['so_luong'] ?? 0);

    if ($detailId > 0) {
        $rowStmt = $pdo->prepare('SELECT ma_chi_tiet, ma_san_pham FROM ChiTietGioHang WHERE ma_chi_tiet = ? AND ma_gio_hang = ?');
        $rowStmt->execute([$detailId, $cartId]);
        $row = $rowStmt->fetch();
        if (!$row) {
            json_error('Không tìm thấy sản phẩm trong giỏ hàng.', 404);
        }
        $productId = (int)$row['ma_san_pham'];
    } elseif ($productId > 0) {
        $rowStmt = $pdo->prepare('SELECT ma_chi_tiet, ma_san_pham FROM ChiTietGioHang WHERE ma_gio_hang = ? AND ma_san_pham = ? AND phan_loai = ? LIMIT 1');
        $rowStmt->execute([$cartId, $productId, $variant]);
        $row = $rowStmt->fetch();
        if (!$row) {
            json_error('Không tìm thấy sản phẩm trong giỏ hàng.', 404);
        }
        $detailId = (int)$row['ma_chi_tiet'];
    } else {
        json_error('Thiếu mã chi tiết giỏ hàng.');
    }

    if ($qty <= 0) {
        $pdo->prepare('DELETE FROM ChiTietGioHang WHERE ma_chi_tiet = ? AND ma_gio_hang = ?')->execute([$detailId, $cartId]);
        json_response(array_merge(['message' => 'Đã xóa sản phẩm khỏi giỏ hàng.'], fetch_cart_payload($pdo, $cartId)));
    }

    $pStmt = $pdo->prepare("SELECT ton_kho FROM SanPham WHERE ma_san_pham = ? AND trang_thai = 'active'");
    $pStmt->execute([$productId]);
    $stock = $pStmt->fetchColumn();
    $otherQty = total_qty_for_product_in_cart($pdo, $cartId, $productId, $detailId);
    if ($stock === false || ($otherQty + $qty) > (int)$stock) {
        json_error('Số lượng vượt quá tồn kho hiện có (' . (int)$stock . ').');
    }

    $pdo->prepare('UPDATE ChiTietGioHang SET so_luong = ? WHERE ma_chi_tiet = ? AND ma_gio_hang = ?')
        ->execute([$qty, $detailId, $cartId]);

    json_response(fetch_cart_payload($pdo, $cartId));
}

if ($method === 'DELETE') {
    $idsRaw = trim((string)($_GET['ids'] ?? ''));
    $detailId = (int)($_GET['ma_chi_tiet'] ?? 0);
    $productId = (int)($_GET['ma_san_pham'] ?? 0);

    if ($idsRaw !== '') {
        $ids = array_values(array_filter(array_map('intval', explode(',', $idsRaw)), static fn($v) => $v > 0));
        if ($ids) {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $stmt = $pdo->prepare("DELETE FROM ChiTietGioHang WHERE ma_gio_hang = ? AND ma_chi_tiet IN ($placeholders)");
            $stmt->execute(array_merge([$cartId], $ids));
        }
        json_response(array_merge(['message' => 'Đã xóa các sản phẩm đã chọn khỏi giỏ hàng.'], fetch_cart_payload($pdo, $cartId)));
    } elseif ($detailId > 0) {
        $pdo->prepare('DELETE FROM ChiTietGioHang WHERE ma_chi_tiet = ? AND ma_gio_hang = ?')->execute([$detailId, $cartId]);
    } elseif ($productId > 0) {
        $pdo->prepare('DELETE FROM ChiTietGioHang WHERE ma_gio_hang = ? AND ma_san_pham = ?')->execute([$cartId, $productId]);
    } else {
        $pdo->prepare('DELETE FROM ChiTietGioHang WHERE ma_gio_hang = ?')->execute([$cartId]);
    }
    json_response(fetch_cart_payload($pdo, $cartId));
}

json_error('Phương thức không được hỗ trợ.', 405);
