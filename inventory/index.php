<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
init_api();

$pdo = get_db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function generate_code_with_prefix(PDO $pdo, string $table, string $col, string $prefix): string
{
    $ymd = date('Ymd');
    $base = "{$prefix}-{$ymd}-";
    $stmt = $pdo->prepare("SELECT {$col} FROM {$table} WHERE {$col} LIKE ? ORDER BY 1 DESC LIMIT 1");
    $stmt->execute([$base . '%']);
    $last = (string)($stmt->fetchColumn() ?: '');
    $seq = 1;
    if ($last !== '' && preg_match('/(\d+)$/', $last, $m)) {
        $seq = (int)$m[1] + 1;
    }
    $code = $base . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
    $chk = $pdo->prepare("SELECT COUNT(*) FROM {$table} WHERE {$col} = ?");
    $chk->execute([$code]);
    while ((int)$chk->fetchColumn() > 0) {
        $seq++;
        $code = $base . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
        $chk->execute([$code]);
    }
    return $code;
}

if ($method === 'GET') {
    $user = require_role(['admin', 'nhan_vien'], $pdo);
    $isAdmin = $user['role'] === 'admin';

    $stockRow = $pdo->query(
        "SELECT
            COUNT(*) AS total_products,
            COALESCE(SUM(ton_kho), 0) AS total_units,
            SUM(CASE WHEN ton_kho > 0 AND ton_kho <= 10 THEN 1 ELSE 0 END) AS low_stock_count,
            SUM(CASE WHEN ton_kho <= 0 THEN 1 ELSE 0 END) AS out_of_stock_count
         FROM SanPham
         WHERE trang_thai = 'active'"
    )->fetch() ?: [];

    $requests = $pdo->query(
        "SELECT yc.*, sp.ten_san_pham, sp.ton_kho AS ton_hien_tai, sp.gia AS gia_ban,
                pn.ma_phieu_code
         FROM YeuCauNhapKho yc
         JOIN SanPham sp ON sp.ma_san_pham = yc.ma_san_pham
         LEFT JOIN PhieuNhap pn ON pn.ma_phieu_nhap = yc.ma_phieu_nhap
         ORDER BY FIELD(yc.trang_thai, 'pending', 'approved', 'rejected'), yc.ngay_tao DESC, yc.ma_yeu_cau DESC"
    )->fetchAll();

    $pendingCount = 0;
    foreach ($requests as $r) {
        if ($r['trang_thai'] === 'pending') {
            $pendingCount++;
        }
    }

    $receipts = [];
    $totalImportValue = 0.0;
    if ($isAdmin) {
        $receipts = $pdo->query(
            "SELECT pn.*, ncc.ten_ncc, ncc.so_dien_thoai AS sdt_ncc, yc.ma_yeu_cau_code
             FROM PhieuNhap pn
             JOIN NhaCungCap ncc ON ncc.ma_ncc = pn.ma_ncc
             LEFT JOIN YeuCauNhapKho yc ON yc.ma_yeu_cau = pn.ma_yeu_cau
             ORDER BY pn.ngay_nhap DESC, pn.ma_phieu_nhap DESC"
        )->fetchAll();

        $itemsByReceipt = [];
        if ($receipts) {
            $ids = array_map(static fn($x) => (int)$x['ma_phieu_nhap'], $receipts);
            $ph = implode(',', array_fill(0, count($ids), '?'));
            $itStmt = $pdo->prepare(
                "SELECT ct.*, sp.ten_san_pham
                 FROM ChiTietPhieuNhap ct
                 JOIN SanPham sp ON sp.ma_san_pham = ct.ma_san_pham
                 WHERE ct.ma_phieu_nhap IN ({$ph})"
            );
            $itStmt->execute($ids);
            foreach ($itStmt->fetchAll() as $it) {
                $itemsByReceipt[(int)$it['ma_phieu_nhap']][] = $it;
            }
        }

        foreach ($receipts as &$rc) {
            $rid = (int)$rc['ma_phieu_nhap'];
            $rc['items'] = $itemsByReceipt[$rid] ?? [];
            $rc['tong_so_luong'] = array_reduce($rc['items'], static fn($s, $i) => $s + (int)$i['so_luong'], 0);
            $totalImportValue += (float)$rc['tong_tien_nhap'];
        }
        unset($rc);
    }

    json_response([
        'summary' => [
            'total_products' => (int)($stockRow['total_products'] ?? 0),
            'total_units' => (int)($stockRow['total_units'] ?? 0),
            'low_stock_count' => (int)($stockRow['low_stock_count'] ?? 0),
            'out_of_stock_count' => (int)($stockRow['out_of_stock_count'] ?? 0),
            'pending_requests_count' => $pendingCount,
            'receipts_count' => count($receipts),
            'total_import_value' => $totalImportValue,
        ],
        'requests' => $requests,
        'receipts' => $receipts,
    ]);
}

if ($method === 'POST') {
    $user = require_role(['admin', 'nhan_vien'], $pdo);
    $in = get_json_input();
    $action = trim((string)($in['action'] ?? ''));

    // 1. Nhân viên (hoặc quản lý) gửi yêu cầu nhập kho
    if ($action === 'request_import') {
        $productId = (int)($in['ma_san_pham'] ?? 0);
        $qty = (int)($in['so_luong_yeu_cau'] ?? 0);
        $lyDo = mb_substr(trim((string)($in['ly_do'] ?? '')), 0, 250, 'UTF-8');

        if ($productId <= 0 || $qty < 1 || $qty > 10000) {
            json_error('Vui lòng chọn sản phẩm và nhập số lượng yêu cầu hợp lệ (1–10.000).');
        }

        $pStmt = $pdo->prepare('SELECT ma_san_pham, ten_san_pham, ton_kho FROM SanPham WHERE ma_san_pham = ? LIMIT 1');
        $pStmt->execute([$productId]);
        $prod = $pStmt->fetch();
        if (!$prod) {
            json_error('Không tìm thấy sản phẩm được chọn.', 404);
        }

        $code = generate_code_with_prefix($pdo, 'YeuCauNhapKho', 'ma_yeu_cau_code', 'YC');
        $pdo->prepare(
            "INSERT INTO YeuCauNhapKho (ma_yeu_cau_code, ma_san_pham, so_luong_yeu_cau, ly_do, ma_nhan_vien_yc, ten_nguoi_yc, trang_thai)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')"
        )->execute([
            $code,
            $productId,
            $qty,
            $lyDo !== '' ? $lyDo : 'Bổ sung tồn kho sản phẩm sắp hết.',
            $user['ma_nhan_vien'] ?? null,
            $user['ho_ten'] ?? 'Nhân viên',
        ]);

        create_notification(
            $pdo,
            "Yêu cầu nhập kho #{$code}",
            "{$user['ho_ten']} đề xuất nhập thêm {$qty} × \"{$prod['ten_san_pham']}\" (tồn hiện tại: {$prod['ton_kho']}).",
            'stock',
            null
        );

        json_response([
            'message' => "Đã gửi yêu cầu nhập kho #{$code} tới Quản lý cửa hàng.",
            'ma_yeu_cau_code' => $code,
        ], 201);
    }

    // 2. Chỉ Quản lý / Chủ cửa hàng (admin) được lập phiếu nhập kho và cộng tồn kho
    if ($action === 'create_receipt') {
        if ($user['role'] !== 'admin') {
            json_error('Chỉ Quản trị viên / Chủ cửa hàng mới có quyền lập phiếu nhập kho.', 403);
        }

        $supplierId = (int)($in['ma_ncc'] ?? 0);
        $requestId = (int)($in['ma_yeu_cau'] ?? 0);
        $ghiChu = mb_substr(trim((string)($in['ghi_chu'] ?? '')), 0, 250, 'UTF-8');
        $itemsIn = is_array($in['items'] ?? null) ? $in['items'] : [];

        if ($supplierId <= 0) {
            json_error('Vui lòng chọn nhà cung cấp.');
        }
        $supStmt = $pdo->prepare('SELECT ma_ncc, ten_ncc FROM NhaCungCap WHERE ma_ncc = ? LIMIT 1');
        $supStmt->execute([$supplierId]);
        $supplier = $supStmt->fetch();
        if (!$supplier) {
            json_error('Không tìm thấy nhà cung cấp đã chọn.', 404);
        }
        if (empty($itemsIn)) {
            json_error('Vui lòng thêm ít nhất 1 sản phẩm vào phiếu nhập kho.');
        }

        try {
            $pdo->beginTransaction();

            $verified = [];
            $tongTien = 0.0;
            $pLock = $pdo->prepare('SELECT ma_san_pham, ten_san_pham, ton_kho FROM SanPham WHERE ma_san_pham = ? FOR UPDATE');
            foreach ($itemsIn as $row) {
                $pid = (int)($row['ma_san_pham'] ?? 0);
                $qty = (int)($row['so_luong'] ?? 0);
                $cost = (float)($row['gia_nhap'] ?? 0);
                if ($pid <= 0 || $qty < 1 || $cost < 0) {
                    $pdo->rollBack();
                    json_error('Dữ liệu sản phẩm, số lượng nhập hoặc giá nhập không hợp lệ.');
                }
                $pLock->execute([$pid]);
                $prod = $pLock->fetch();
                if (!$prod) {
                    $pdo->rollBack();
                    json_error('Một sản phẩm trong phiếu nhập không tồn tại.', 404);
                }
                $tongTien += $qty * $cost;
                $verified[] = [
                    'ma_san_pham' => $pid,
                    'ten_san_pham' => $prod['ten_san_pham'],
                    'so_luong' => $qty,
                    'gia_nhap' => $cost,
                ];
            }

            $reqRow = null;
            if ($requestId > 0) {
                $rStmt = $pdo->prepare('SELECT * FROM YeuCauNhapKho WHERE ma_yeu_cau = ? FOR UPDATE');
                $rStmt->execute([$requestId]);
                $reqRow = $rStmt->fetch();
                if (!$reqRow || $reqRow['trang_thai'] !== 'pending') {
                    $requestId = 0;
                    $reqRow = null;
                }
            }

            $code = generate_code_with_prefix($pdo, 'PhieuNhap', 'ma_phieu_code', 'PN');
            $pdo->prepare(
                "INSERT INTO PhieuNhap (ma_phieu_code, ma_ncc, ma_nhan_vien_nhap, ten_nguoi_nhap, ma_yeu_cau, tong_tien_nhap, ghi_chu)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            )->execute([
                $code,
                $supplierId,
                $user['ma_nhan_vien'] ?? null,
                $user['ho_ten'] ?? 'Quản trị viên',
                $requestId > 0 ? $requestId : null,
                $tongTien,
                $ghiChu !== '' ? $ghiChu : null,
            ]);
            $receiptId = (int)$pdo->lastInsertId();

            $insCt = $pdo->prepare('INSERT INTO ChiTietPhieuNhap (ma_phieu_nhap, ma_san_pham, so_luong, gia_nhap) VALUES (?, ?, ?, ?)');
            $addStock = $pdo->prepare('UPDATE SanPham SET ton_kho = ton_kho + ? WHERE ma_san_pham = ?');
            $totalUnits = 0;
            foreach ($verified as $vi) {
                $insCt->execute([$receiptId, $vi['ma_san_pham'], $vi['so_luong'], $vi['gia_nhap']]);
                $addStock->execute([$vi['so_luong'], $vi['ma_san_pham']]);
                $totalUnits += $vi['so_luong'];
            }

            if ($reqRow && $requestId > 0) {
                $pdo->prepare(
                    "UPDATE YeuCauNhapKho
                     SET trang_thai = 'approved', ten_nguoi_duyet = ?, ma_phieu_nhap = ?, ngay_xu_ly = NOW()
                     WHERE ma_yeu_cau = ?"
                )->execute([$user['ho_ten'] ?? 'Quản trị viên', $receiptId, $requestId]);
            }

            create_notification(
                $pdo,
                "Đã nhập kho #{$code}",
                "{$user['ho_ten']} vừa lập phiếu nhập #{$code} từ {$supplier['ten_ncc']} ({$totalUnits} sản phẩm · " . format_vnd($tongTien) . ').',
                'stock',
                null
            );

            $pdo->commit();

            json_response([
                'message' => "Đã lập phiếu nhập kho #{$code} và cộng tồn kho thành công!",
                'ma_phieu_nhap' => $receiptId,
                'ma_phieu_code' => $code,
            ], 201);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            json_error('Không thể lập phiếu nhập kho: ' . $e->getMessage(), 500);
        }
    }

    json_error('Hành động không hợp lệ.');
}

if ($method === 'PUT') {
    $user = require_role(['admin'], $pdo);
    $in = get_json_input();
    $action = trim((string)($in['action'] ?? ''));

    if ($action === 'reject_request') {
        $reqId = (int)($in['ma_yeu_cau'] ?? 0);
        $reason = mb_substr(trim((string)($in['ly_do_tu_choi'] ?? '')), 0, 250, 'UTF-8');
        if ($reqId <= 0) {
            json_error('Thiếu mã yêu cầu nhập kho.');
        }

        $rStmt = $pdo->prepare('SELECT * FROM YeuCauNhapKho WHERE ma_yeu_cau = ? LIMIT 1');
        $rStmt->execute([$reqId]);
        $req = $rStmt->fetch();
        if (!$req) {
            json_error('Không tìm thấy yêu cầu nhập kho.', 404);
        }
        if ($req['trang_thai'] !== 'pending') {
            json_error('Yêu cầu này đã được xử lý trước đó.', 400);
        }

        $pdo->prepare(
            "UPDATE YeuCauNhapKho
             SET trang_thai = 'rejected', ten_nguoi_duyet = ?, ly_do_tu_choi = ?, ngay_xu_ly = NOW()
             WHERE ma_yeu_cau = ?"
        )->execute([
            $user['ho_ten'] ?? 'Quản trị viên',
            $reason !== '' ? $reason : 'Chưa cần nhập bổ sung ở thời điểm hiện tại.',
            $reqId,
        ]);

        json_response(['message' => "Đã từ chối yêu cầu nhập kho #{$req['ma_yeu_cau_code']}."]);
    }

    json_error('Hành động không hợp lệ.');
}

json_error('Phương thức không được hỗ trợ.', 405);
