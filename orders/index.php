<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/mailer.php';
require_once __DIR__ . '/../config/invoices.php';
init_api();

$pdo = get_db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function attach_order_items(PDO $pdo, array $orders, ?int $reviewCustomerId = null): array
{
    if (!$orders) {
        return [];
    }
    $ids = array_map(static fn($o) => (int)$o['ma_don_hang'], $orders);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare(
        "SELECT ct.ma_don_hang, ct.ma_san_pham, ct.phan_loai, ct.so_luong, ct.don_gia,
                sp.ten_san_pham, sp.bieu_tuong,
                (SELECT ha.duong_dan FROM HinhAnhSanPham ha
                 WHERE ha.ma_san_pham = sp.ma_san_pham
                 ORDER BY ha.la_anh_chinh DESC, ha.ma_hinh_anh ASC LIMIT 1) AS anh_chinh
         FROM ChiTietDonHang ct
         JOIN SanPham sp ON sp.ma_san_pham = ct.ma_san_pham
         WHERE ct.ma_don_hang IN ($placeholders)"
    );
    $stmt->execute($ids);

    // Kiểm tra các sản phẩm khách hàng này đã đánh giá
    $reviewedMap = [];
    if ($reviewCustomerId && $reviewCustomerId > 0) {
        $rStmt = $pdo->prepare(
            'SELECT ma_san_pham, MAX(so_sao) AS so_sao FROM DanhGia WHERE ma_khach_hang = ? AND ma_san_pham IS NOT NULL GROUP BY ma_san_pham'
        );
        $rStmt->execute([$reviewCustomerId]);
        foreach ($rStmt->fetchAll() as $rv) {
            $reviewedMap[(int)$rv['ma_san_pham']] = (int)$rv['so_sao'];
        }
    }

    $grouped = [];
    foreach ($stmt->fetchAll() as $it) {
        $pid = (int)$it['ma_san_pham'];
        $grouped[(int)$it['ma_don_hang']][] = [
            'ma_san_pham' => $pid,
            'phan_loai' => (string)($it['phan_loai'] ?? ''),
            'ten_san_pham' => $it['ten_san_pham'],
            'bieu_tuong' => $it['bieu_tuong'],
            'anh_chinh' => $it['anh_chinh'],
            'so_luong' => (int)$it['so_luong'],
            'don_gia' => (float)$it['don_gia'],
            'da_danh_gia' => isset($reviewedMap[$pid]),
            'so_sao_danh_gia' => $reviewedMap[$pid] ?? 0,
        ];
    }

    // Lấy thông tin trả hàng (nếu có)
    $returnMap = [];
    try {
        $retStmt = $pdo->prepare("SELECT * FROM TraHang WHERE ma_don_hang IN ($placeholders)");
        $retStmt->execute($ids);
        foreach ($retStmt->fetchAll() as $rt) {
            $returnMap[(int)$rt['ma_don_hang']] = $rt;
        }
    } catch (Throwable $e) {
        $returnMap = [];
    }

    $nowTs = time();
    foreach ($orders as &$o) {
        $oid = (int)$o['ma_don_hang'];
        $items = $grouped[$oid] ?? [];
        $o['items'] = $items;
        $o['tra_hang'] = $returnMap[$oid] ?? null;
        $o['tom_tat_san_pham'] = implode(', ', array_map(
            static fn($i) => $i['ten_san_pham']
                . ($i['phan_loai'] !== '' ? ' [' . $i['phan_loai'] . ']' : '')
                . ' (x' . $i['so_luong'] . ')',
            $items
        ));

        // Quy tắc:
        // - Mục "Cần đánh giá": trong vòng 7 ngày kể từ khi nhận hàng & còn SP chưa đánh giá.
        // - Nút "Trả hàng" trong mục "Đã giao": chỉ hiển thị trong 3 ngày kể từ khi nhận hàng & chưa ẩn (khong_tra_hang = 0).
        $isDone = ($o['trang_thai'] ?? '') === 'done';
        $unreviewedCount = count(array_filter($items, static fn($i) => empty($i['da_danh_gia'])));
        $allReviewed = $isDone && !empty($items) && $unreviewedCount === 0;

        if ($isDone) {
            $doneRef = !empty($o['ngay_giao'])
                ? (string)$o['ngay_giao']
                : (!empty($o['updated_at']) ? (string)$o['updated_at'] : (string)($o['ngay_dat'] ?? ''));
            $doneTs = strtotime($doneRef) ?: $nowTs;

            $deadlineTs = $doneTs + (7 * 86400);
            $reviewExpired = $nowTs > $deadlineTs;
            $daysLeft = $reviewExpired ? 0 : (int)max(1, ceil(($deadlineTs - $nowTs) / 86400));
            $o['all_reviewed'] = $allReviewed;
            $o['review_expired'] = $reviewExpired;
            $o['review_deadline'] = date('Y-m-d H:i:s', $deadlineTs);
            $o['review_days_left'] = $daysLeft;
            $o['can_review'] = !$allReviewed && !$reviewExpired && !empty($items);

            $returnDeadlineTs = $doneTs + (3 * 86400);
            $returnExpired = $nowTs > $returnDeadlineTs;
            $returnDismissed = !empty($o['khong_tra_hang']);
            $returnDaysLeft = $returnExpired ? 0 : (int)max(1, ceil(($returnDeadlineTs - $nowTs) / 86400));
            $o['return_deadline'] = date('Y-m-d H:i:s', $returnDeadlineTs);
            $o['return_expired'] = $returnExpired;
            $o['return_dismissed'] = $returnDismissed;
            $o['return_days_left'] = $returnDaysLeft;
            $o['can_return'] = !$returnExpired && !$returnDismissed && empty($o['tra_hang']);
        } else {
            $o['all_reviewed'] = false;
            $o['review_expired'] = false;
            $o['review_deadline'] = null;
            $o['review_days_left'] = 0;
            $o['can_review'] = false;

            $o['return_deadline'] = null;
            $o['return_expired'] = false;
            $o['return_dismissed'] = !empty($o['khong_tra_hang']);
            $o['return_days_left'] = 0;
            $o['can_return'] = false;
        }
    }
    return $orders;
}

if ($method === 'GET') {
    $user = current_user($pdo);
    $scope = $_GET['scope'] ?? '';

    // Quản trị / nhân viên lấy toàn bộ đơn hàng
    if ($scope === 'admin') {
        require_role(['admin', 'nhan_vien'], $pdo);
        $where = [];
        $params = [];

        if (!empty($_GET['status']) && $_GET['status'] !== 'all') {
            $where[] = 'dh.trang_thai = ?';
            $params[] = trim((string)$_GET['status']);
        }
        if (!empty($_GET['search'])) {
            $kw = '%' . trim((string)$_GET['search']) . '%';
            $where[] = '(dh.ma_don_code LIKE ? OR dh.ten_nguoi_nhan LIKE ? OR dh.so_dien_thoai LIKE ?)';
            $params[] = $kw;
            $params[] = $kw;
            $params[] = $kw;
        }

        $sql = "SELECT dh.*, tt.phuong_thuc, tt.trang_thai AS trang_thai_thanh_toan
                FROM DonHang dh
                LEFT JOIN ThanhToan tt ON tt.ma_don_hang = dh.ma_don_hang";
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY dh.ngay_dat DESC, dh.ma_don_hang DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        json_response(['orders' => attach_order_items($pdo, $stmt->fetchAll())]);
    }

    // Khách hàng đã đăng nhập xem lịch sử đơn của mình
    if ($user && $user['ma_khach_hang'] && empty($_GET['phone'])) {
        $stmt = $pdo->prepare(
            "SELECT dh.*, tt.phuong_thuc, tt.trang_thai AS trang_thai_thanh_toan
             FROM DonHang dh
             LEFT JOIN ThanhToan tt ON tt.ma_don_hang = dh.ma_don_hang
             WHERE dh.ma_khach_hang = ?
             ORDER BY dh.ngay_dat DESC, dh.ma_don_hang DESC"
        );
        $stmt->execute([$user['ma_khach_hang']]);
        json_response(['orders' => attach_order_items($pdo, $stmt->fetchAll(), (int)$user['ma_khach_hang'])]);
    }

    // Tra cứu đơn hàng bằng Họ tên + Số điện thoại
    $name = trim((string)($_GET['name'] ?? ''));
    $phone = clean_phone((string)($_GET['phone'] ?? ''));
    if ($name === '' || strlen($phone) < 9) {
        json_response(['orders' => []]);
    }

    $stmt = $pdo->prepare(
        "SELECT dh.*, tt.phuong_thuc, tt.trang_thai AS trang_thai_thanh_toan
         FROM DonHang dh
         LEFT JOIN ThanhToan tt ON tt.ma_don_hang = dh.ma_don_hang
         WHERE REPLACE(REPLACE(REPLACE(dh.so_dien_thoai, ' ', ''), '-', ''), '.', '') = ?
         ORDER BY dh.ngay_dat DESC"
    );
    $stmt->execute([$phone]);
    $candidates = $stmt->fetchAll();
    $normName = normalize_vi($name);
    $matched = array_values(array_filter(
        $candidates,
        static fn($r) => normalize_vi((string)$r['ten_nguoi_nhan']) === $normName
    ));

    json_response(['orders' => attach_order_items($pdo, $matched)]);
}

if ($method === 'POST') {
    $user = current_user($pdo);
    if (!$user) {
        json_error('Vui lòng đăng nhập hoặc đăng ký tài khoản để đặt hàng.', 401, ['require_auth' => true]);
    }
    $in = get_json_input();

    $tenNguoiNhan = trim((string)($in['ten_nguoi_nhan'] ?? ($user['ho_ten'] ?? '')));
    $soDienThoai = trim((string)($in['so_dien_thoai'] ?? ($user['so_dien_thoai'] ?? '')));
    $diaChiNhan = trim((string)($in['dia_chi_nhan'] ?? ($user['dia_chi'] ?? '')));
    $ghiChu = trim((string)($in['ghi_chu'] ?? ''));
    $phuongThuc = (string)($in['phuong_thuc'] ?? 'cod');
    if (!in_array($phuongThuc, ['cod', 'bank_transfer'], true)) {
        $phuongThuc = 'cod';
    }
    $vanChuyen = (string)($in['phuong_thuc_van_chuyen'] ?? 'standard');
    if (!in_array($vanChuyen, ['standard', 'express'], true)) {
        $vanChuyen = 'standard';
    }

    $isAdminCreate = !empty($in['from_admin']) && in_array($user['role'], ['admin', 'nhan_vien'], true);
    $isPosSale = $isAdminCreate && !empty($in['pos_sale']);
    $rawPhoneInput = trim((string)($in['so_dien_thoai'] ?? ''));

    if ($isPosSale) {
        if ($tenNguoiNhan === '') {
            $tenNguoiNhan = 'Khách lẻ';
        }
        if ($diaChiNhan === '') {
            $diaChiNhan = 'Mua trực tiếp tại quầy — Góc nhỏ có em';
        }
        $soDienThoai = $rawPhoneInput !== '' ? $rawPhoneInput : 'Tại quầy';
        if ($rawPhoneInput !== '' && strlen(clean_phone($rawPhoneInput)) < 9) {
            json_error('Số điện thoại khách hàng cần tối thiểu 9 chữ số (hoặc để trống nếu là khách lẻ).');
        }
    } else {
        if ($isAdminCreate && $diaChiNhan === '') {
            $diaChiNhan = 'Mua trực tiếp tại cửa hàng Góc nhỏ có em';
        }
        if ($isAdminCreate && $soDienThoai === '') {
            $soDienThoai = '0900000000';
        }
        if ($tenNguoiNhan === '' || strlen(clean_phone($soDienThoai)) < 9 || $diaChiNhan === '') {
            json_error('Vui lòng nhập đầy đủ họ tên, số điện thoại (tối thiểu 9 số) và địa chỉ nhận hàng.');
        }
    }

    $itemsInput = $in['items'] ?? null;

    try {
        $pdo->beginTransaction();

        // Xác định ma_khach_hang
        $customerId = null;
        if (!$isAdminCreate && $user && $user['ma_khach_hang']) {
            $customerId = (int)$user['ma_khach_hang'];
            // Cập nhật địa chỉ khách hàng nếu chưa có
            $pdo->prepare("UPDATE KhachHang SET dia_chi = IF(dia_chi = '' OR dia_chi IS NULL, ?, dia_chi) WHERE ma_khach_hang = ?")
                ->execute([$diaChiNhan, $customerId]);
        } elseif ($isPosSale && $rawPhoneInput === '') {
            // Khách lẻ tại quầy không để lại SĐT -> không tạo hồ sơ trùng lặp
            $customerId = null;
        } else {
            // Tìm khách hàng theo SĐT hoặc tạo hồ sơ KhachHang vãng lai
            $digits = clean_phone($soDienThoai);
            $findCus = $pdo->prepare(
                "SELECT ma_khach_hang FROM KhachHang
                 WHERE REPLACE(REPLACE(REPLACE(so_dien_thoai, ' ', ''), '-', ''), '.', '') = ?
                 LIMIT 1"
            );
            $findCus->execute([$digits]);
            $existingCid = $findCus->fetchColumn();
            if ($existingCid) {
                $customerId = (int)$existingCid;
            } else {
                $pdo->prepare("INSERT INTO KhachHang (ma_tai_khoan, ho_ten, so_dien_thoai, dia_chi) VALUES (NULL, ?, ?, ?)")
                    ->execute([$tenNguoiNhan, $soDienThoai, $diaChiNhan]);
                $customerId = (int)$pdo->lastInsertId();
            }
        }

        // Nếu không truyền items trực tiếp, lấy từ giỏ hàng DB của khách hàng
        if (!is_array($itemsInput) || count($itemsInput) === 0) {
            if (!$user || !$user['ma_khach_hang']) {
                $pdo->rollBack();
                json_error('Giỏ hàng đang trống.');
            }
            $cStmt = $pdo->prepare(
                "SELECT ct.ma_san_pham, ct.phan_loai, ct.so_luong
                 FROM GioHang gh
                 JOIN ChiTietGioHang ct ON ct.ma_gio_hang = gh.ma_gio_hang
                 WHERE gh.ma_khach_hang = ? AND gh.trang_thai = 'active'"
            );
            $cStmt->execute([$user['ma_khach_hang']]);
            $itemsInput = $cStmt->fetchAll();
        }

        if (!$itemsInput) {
            $pdo->rollBack();
            json_error('Giỏ hàng chưa có sản phẩm nào.');
        }

        // Khóa dòng sản phẩm bằng FOR UPDATE để kiểm tra & trừ tồn kho an toàn (hỗ trợ nhiều phân loại cùng 1 sản phẩm)
        $verifiedItems = [];
        $lockedProducts = [];
        $usedQtyByProduct = [];
        $tongTien = 0.0;
        $lockStmt = $pdo->prepare("SELECT ma_san_pham, ten_san_pham, gia, ton_kho, trang_thai FROM SanPham WHERE ma_san_pham = ? FOR UPDATE");

        foreach ($itemsInput as $it) {
            $pid = (int)($it['ma_san_pham'] ?? $it['id'] ?? 0);
            $qty = (int)($it['so_luong'] ?? $it['qty'] ?? 0);
            $variant = mb_substr(trim((string)($it['phan_loai'] ?? '')), 0, 250, 'UTF-8');
            if ($pid <= 0 || $qty <= 0) {
                $pdo->rollBack();
                json_error('Dữ liệu sản phẩm đặt hàng không hợp lệ.');
            }

            if (!isset($lockedProducts[$pid])) {
                $lockStmt->execute([$pid]);
                $prod = $lockStmt->fetch();
                if (!$prod || $prod['trang_thai'] !== 'active') {
                    $pdo->rollBack();
                    json_error('Một sản phẩm trong giỏ hiện đã ngừng kinh doanh.');
                }
                $lockedProducts[$pid] = $prod;
                $usedQtyByProduct[$pid] = 0;
            }
            $prod = $lockedProducts[$pid];
            $usedQtyByProduct[$pid] += $qty;
            if ((int)$prod['ton_kho'] < $usedQtyByProduct[$pid]) {
                $pdo->rollBack();
                json_error("Sản phẩm \"{$prod['ten_san_pham']}\" chỉ còn {$prod['ton_kho']} món trong kho, không đủ số lượng đặt ({$usedQtyByProduct[$pid]}).", 409);
            }

            $price = (float)$prod['gia'];
            $tongTien += $price * $qty;
            $verifiedItems[] = [
                'ma_san_pham' => $pid,
                'phan_loai' => $variant,
                'ten_san_pham' => $prod['ten_san_pham'],
                'so_luong' => $qty,
                'don_gia' => $price,
                'ton_con_lai' => (int)$prod['ton_kho'] - $usedQtyByProduct[$pid],
            ];
        }

        // Tính phí vận chuyển an toàn phía máy chủ
        $tamTinh = $tongTien;
        if ($isAdminCreate) {
            $phiVanChuyen = 0.0;
        } elseif ($vanChuyen === 'express') {
            $phiVanChuyen = 35000.0;
        } else {
            $phiVanChuyen = $tamTinh >= 500000 ? 0.0 : 20000.0;
        }
        $tongTien = $tamTinh + $phiVanChuyen;

        // Sinh mã đơn duy nhất GN-XXXX
        $maxId = (int)$pdo->query('SELECT COALESCE(MAX(ma_don_hang), 0) FROM DonHang')->fetchColumn();
        $code = 'GN-' . (1001 + $maxId);
        // Tránh trùng nếu đã seed
        $chk = $pdo->prepare('SELECT COUNT(*) FROM DonHang WHERE ma_don_code = ?');
        $chk->execute([$code]);
        if ((int)$chk->fetchColumn() > 0) {
            $code = 'GN-' . (1001 + $maxId + random_int(10, 99));
        }

        if ($isPosSale) {
            $pdo->prepare(
                "INSERT INTO DonHang (ma_don_code, ma_khach_hang, ma_nhan_vien_xu_ly, ten_nguoi_nhan, so_dien_thoai, dia_chi_nhan, ghi_chu, phuong_thuc_van_chuyen, phi_van_chuyen, tong_tien, trang_thai, ngay_giao)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'done', NOW())"
            )->execute([$code, $customerId, $user['ma_nhan_vien'] ?? null, $tenNguoiNhan, $soDienThoai, $diaChiNhan, $ghiChu, $vanChuyen, $phiVanChuyen, $tongTien]);
        } else {
            $pdo->prepare(
                "INSERT INTO DonHang (ma_don_code, ma_khach_hang, ten_nguoi_nhan, so_dien_thoai, dia_chi_nhan, ghi_chu, phuong_thuc_van_chuyen, phi_van_chuyen, tong_tien, trang_thai)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')"
            )->execute([$code, $customerId, $tenNguoiNhan, $soDienThoai, $diaChiNhan, $ghiChu, $vanChuyen, $phiVanChuyen, $tongTien]);
        }
        $orderId = (int)$pdo->lastInsertId();

        $insDetail = $pdo->prepare('INSERT INTO ChiTietDonHang (ma_don_hang, ma_san_pham, phan_loai, so_luong, don_gia) VALUES (?, ?, ?, ?, ?)');
        $updStock = $pdo->prepare('UPDATE SanPham SET ton_kho = ton_kho - ? WHERE ma_san_pham = ?');

        foreach ($verifiedItems as $vi) {
            $insDetail->execute([$orderId, $vi['ma_san_pham'], $vi['phan_loai'], $vi['so_luong'], $vi['don_gia']]);
            $updStock->execute([$vi['so_luong'], $vi['ma_san_pham']]);
            if ($vi['ton_con_lai'] <= 5) {
                create_notification(
                    $pdo,
                    'Cảnh báo tồn kho thấp',
                    "Sản phẩm \"{$vi['ten_san_pham']}\" chỉ còn {$vi['ton_con_lai']} món sau đơn #{$code}.",
                    'stock',
                    null
                );
            }
        }

        $payStatus = $isPosSale
            ? 'paid'
            : (($phuongThuc === 'bank_transfer' && !empty($in['da_chuyen_khoan'])) ? 'paid' : 'unpaid');
        $pdo->prepare(
            "INSERT INTO ThanhToan (ma_don_hang, phuong_thuc, so_tien, trang_thai)
             VALUES (?, ?, ?, ?)"
        )->execute([$orderId, $phuongThuc, $tongTien, $payStatus]);

        // Chỉ xóa những sản phẩm đã chọn đặt mua khỏi giỏ hàng active (không xóa nếu khách dùng nút "Mua ngay")
        $isBuyNow = !empty($in['is_buy_now']);
        if (!$isAdminCreate && !$isBuyNow && $user && $user['ma_khach_hang']) {
            $cartIdRow = $pdo->prepare("SELECT ma_gio_hang FROM GioHang WHERE ma_khach_hang = ? AND trang_thai = 'active' ORDER BY ma_gio_hang DESC LIMIT 1");
            $cartIdRow->execute([$user['ma_khach_hang']]);
            $activeCartId = (int)$cartIdRow->fetchColumn();

            if ($activeCartId > 0) {
                $purchasedDetailIds = [];
                foreach ($itemsInput as $it) {
                    if (!empty($it['ma_chi_tiet'])) {
                        $purchasedDetailIds[] = (int)$it['ma_chi_tiet'];
                    }
                }
                if ($purchasedDetailIds) {
                    $ph = implode(',', array_fill(0, count($purchasedDetailIds), '?'));
                    $delStmt = $pdo->prepare("DELETE FROM ChiTietGioHang WHERE ma_gio_hang = ? AND ma_chi_tiet IN ($ph)");
                    $delStmt->execute(array_merge([$activeCartId], $purchasedDetailIds));
                } elseif (is_array($in['items'] ?? null) && count($in['items']) > 0) {
                    $delByPair = $pdo->prepare('DELETE FROM ChiTietGioHang WHERE ma_gio_hang = ? AND ma_san_pham = ? AND phan_loai = ?');
                    foreach ($verifiedItems as $vi) {
                        $delByPair->execute([$activeCartId, $vi['ma_san_pham'], $vi['phan_loai']]);
                    }
                } else {
                    $pdo->prepare('DELETE FROM ChiTietGioHang WHERE ma_gio_hang = ?')->execute([$activeCartId]);
                }
            }
        }

        create_notification(
            $pdo,
            $isPosSale ? "Bán tại quầy #{$code}" : "Đơn hàng mới #{$code}",
            $isPosSale
                ? "Nhân viên {$user['ho_ten']} vừa hoàn tất đơn tại quầy #{$code} cho {$tenNguoiNhan} (" . format_vnd($tongTien) . ').'
                : "Khách hàng {$tenNguoiNhan} vừa đặt đơn hàng trị giá " . format_vnd($tongTien) . '.',
            'order',
            null
        );

        $invoiceRecord = null;
        if ($isPosSale) {
            $cashGivenIn = isset($in['tien_khach_dua']) && $in['tien_khach_dua'] !== '' && $in['tien_khach_dua'] !== null
                ? (float)$in['tien_khach_dua']
                : null;
            $invoiceRecord = ensure_invoice_for_order($pdo, $orderId, [
                'kenh_ban' => 'tai_quay',
                'ma_nhan_vien_lap' => $user['ma_nhan_vien'] ?? null,
                'ten_nguoi_lap' => $user['ho_ten'] ?? 'Thu ngân',
                'tien_khach_dua' => $cashGivenIn,
            ]);
        } elseif ($payStatus === 'paid') {
            $invoiceRecord = ensure_invoice_for_order($pdo, $orderId, [
                'kenh_ban' => 'online',
                'ma_nhan_vien_lap' => null,
                'ten_nguoi_lap' => 'Hệ thống Online',
            ]);
        }

        $pdo->commit();

        $invCode = $invoiceRecord['ma_hoa_don_code'] ?? $code;

        json_response([
            'message' => $isPosSale
                ? "Thanh toán thành công! Mã hóa đơn #{$invCode}."
                : "Đặt hàng thành công! Mã đơn hàng của bạn là #{$code}.",
            'ma_don_hang' => $orderId,
            'ma_don_code' => $code,
            'ma_hoa_don_code' => $invoiceRecord['ma_hoa_don_code'] ?? null,
            'tong_tien' => $tongTien,
            'order' => [
                'ma_don_hang' => $orderId,
                'ma_don_code' => $code,
                'ma_hoa_don_code' => $invoiceRecord['ma_hoa_don_code'] ?? null,
                'kenh_ban' => $isPosSale ? 'tai_quay' : 'online',
                'ten_nguoi_lap' => $invoiceRecord['ten_nguoi_lap'] ?? ($user['ho_ten'] ?? 'Nhân viên'),
                'ngay_dat' => date('Y-m-d H:i:s'),
                'ten_nguoi_nhan' => $tenNguoiNhan,
                'so_dien_thoai' => $soDienThoai,
                'phuong_thuc' => $phuongThuc,
                'tam_tinh' => $tamTinh,
                'phi_van_chuyen' => $phiVanChuyen,
                'ghi_chu' => $ghiChu,
                'tong_tien' => $tongTien,
                'items' => $verifiedItems,
            ],
        ], 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_error('Không thể tạo đơn hàng: ' . $e->getMessage(), 500);
    }
}

if ($method === 'PUT') {
    $user = require_auth($pdo);
    $in = get_json_input();
    $orderId = (int)($in['ma_don_hang'] ?? 0);
    $action = trim((string)($in['action'] ?? ''));
    $newStatus = trim((string)($in['trang_thai'] ?? ''));
    $lyDo = trim((string)($in['ly_do'] ?? ''));

    // Xác nhận đã chuyển khoản QR -> chuyển đơn từ "Chờ thanh toán" sang "Chờ vận chuyển (Đang chờ xử lý)"
    if ($action === 'confirm_payment') {
        if ($orderId <= 0) {
            json_error('Thiếu mã đơn hàng.');
        }
        $stmt = $pdo->prepare('SELECT * FROM DonHang WHERE ma_don_hang = ?');
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) {
            json_error('Không tìm thấy đơn hàng.', 404);
        }
        if ($user['role'] === 'khach_hang' && (int)$order['ma_khach_hang'] !== (int)$user['ma_khach_hang']) {
            json_error('Bạn không có quyền xác nhận thanh toán cho đơn hàng này.', 403);
        }
        if ($order['trang_thai'] === 'cancelled') {
            json_error('Đơn hàng đã bị hủy, không thể xác nhận thanh toán.', 400);
        }
        $pdo->prepare("UPDATE ThanhToan SET trang_thai = 'paid', thoi_gian = NOW() WHERE ma_don_hang = ?")
            ->execute([$orderId]);
        ensure_invoice_for_order($pdo, $orderId, [
            'kenh_ban' => detect_order_channel($order),
            'ten_nguoi_lap' => 'Hệ thống Online',
        ]);

        create_notification(
            $pdo,
            "Đã thanh toán QR đơn #{$order['ma_don_code']}",
            "Khách hàng {$order['ten_nguoi_nhan']} đã xác nhận chuyển khoản QR cho đơn #{$order['ma_don_code']}. Vui lòng kiểm tra và xét duyệt giao hàng.",
            'order',
            null
        );
        json_response(['message' => "Đã xác nhận thanh toán QR cho đơn #{$order['ma_don_code']}! Đơn đã chuyển sang mục Chờ xác nhận."]);
    }

    // Khách hàng xác nhận không có nhu cầu trả hàng -> ẩn nút Trả hàng cho đơn này
    if ($action === 'dismiss_return') {
        if ($orderId <= 0) {
            json_error('Thiếu mã đơn hàng.');
        }
        $stmt = $pdo->prepare('SELECT * FROM DonHang WHERE ma_don_hang = ?');
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) {
            json_error('Không tìm thấy đơn hàng.', 404);
        }
        if ($user['role'] === 'khach_hang' && (int)$order['ma_khach_hang'] !== (int)$user['ma_khach_hang']) {
            json_error('Bạn không có quyền thao tác trên đơn hàng này.', 403);
        }
        if ($order['trang_thai'] !== 'done') {
            json_error('Chỉ áp dụng cho đơn hàng đã giao thành công.', 400);
        }
        $pdo->prepare('UPDATE DonHang SET khong_tra_hang = 1 WHERE ma_don_hang = ?')->execute([$orderId]);
        json_response(['message' => "Đã ẩn nút trả hàng cho đơn #{$order['ma_don_code']}."]);
    }

    // Khách hàng gửi yêu cầu trả hàng trong vòng 3 ngày kể từ khi nhận hàng
    if ($action === 'return_order') {
        if ($orderId <= 0) {
            json_error('Thiếu mã đơn hàng.');
        }
        $hoTen = trim((string)($in['ho_ten'] ?? ''));
        $sdt = trim((string)($in['so_dien_thoai'] ?? ''));
        $diaChi = trim((string)($in['dia_chi_lay_hang'] ?? ''));
        $hoanTien = trim((string)($in['phuong_thuc_hoan_tien'] ?? ''));
        $lyDoTra = trim((string)($in['ly_do'] ?? ''));
        $hinhAnh = trim((string)($in['hinh_anh'] ?? ''));

        if ($hoTen === '' || strlen(clean_phone($sdt)) < 9 || $diaChi === '') {
            json_error('Vui lòng điền đầy đủ họ tên, số điện thoại (tối thiểu 9 số) và địa chỉ lấy hàng hoàn.');
        }
        if ($lyDoTra === '') {
            json_error('Vui lòng nêu rõ lí do trả hàng.');
        }
        if ($hinhAnh === '' || !str_starts_with($hinhAnh, 'uploads/returns/')) {
            json_error('Vui lòng chụp hoặc chọn ảnh sản phẩm trước khi xác nhận trả hàng.');
        }

        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare('SELECT * FROM DonHang WHERE ma_don_hang = ? FOR UPDATE');
            $stmt->execute([$orderId]);
            $order = $stmt->fetch();
            if (!$order) {
                $pdo->rollBack();
                json_error('Không tìm thấy đơn hàng.', 404);
            }
            if ($user['role'] === 'khach_hang' && (int)$order['ma_khach_hang'] !== (int)$user['ma_khach_hang']) {
                $pdo->rollBack();
                json_error('Bạn không có quyền trả hàng cho đơn này.', 403);
            }
            if ($order['trang_thai'] !== 'done') {
                $pdo->rollBack();
                json_error('Chỉ có thể trả hàng cho đơn đã giao thành công.', 400);
            }
            if (!empty($order['khong_tra_hang'])) {
                $pdo->rollBack();
                json_error('Bạn đã chọn không có nhu cầu trả hàng cho đơn này.', 400);
            }

            $doneRef = !empty($order['ngay_giao'])
                ? (string)$order['ngay_giao']
                : (!empty($order['updated_at']) ? (string)$order['updated_at'] : (string)$order['ngay_dat']);
            $doneTs = strtotime($doneRef) ?: time();
            if (time() > ($doneTs + 3 * 86400)) {
                $pdo->rollBack();
                json_error('Đã quá thời hạn trả hàng (3 ngày kể từ khi nhận hàng).', 400);
            }

            $pdo->prepare(
                "INSERT INTO TraHang (ma_don_hang, ma_khach_hang, ho_ten, so_dien_thoai, dia_chi_lay_hang, phuong_thuc_hoan_tien, ly_do, hinh_anh, trang_thai)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')"
            )->execute([
                $orderId,
                $order['ma_khach_hang'] ? (int)$order['ma_khach_hang'] : null,
                $hoTen,
                $sdt,
                $diaChi,
                $hoanTien !== '' ? $hoanTien : null,
                $lyDoTra,
                $hinhAnh,
            ]);

            // Hoàn tồn kho & hoàn tiền
            $itStmt = $pdo->prepare('SELECT ma_san_pham, so_luong FROM ChiTietDonHang WHERE ma_don_hang = ?');
            $itStmt->execute([$orderId]);
            $restore = $pdo->prepare('UPDATE SanPham SET ton_kho = ton_kho + ? WHERE ma_san_pham = ?');
            foreach ($itStmt->fetchAll() as $it) {
                $restore->execute([(int)$it['so_luong'], (int)$it['ma_san_pham']]);
            }
            $pdo->prepare("UPDATE ThanhToan SET trang_thai = 'refunded' WHERE ma_don_hang = ? AND trang_thai = 'paid'")->execute([$orderId]);
            $pdo->prepare("UPDATE DonHang SET trang_thai = 'returned' WHERE ma_don_hang = ?")->execute([$orderId]);

            create_notification(
                $pdo,
                "Trả hàng đơn #{$order['ma_don_code']}",
                "Khách hàng {$hoTen} ({$sdt}) đã trả hàng đơn #{$order['ma_don_code']}. Lí do: {$lyDoTra}",
                'order',
                null
            );

            $pdo->commit();
            json_response([
                'message' => "Đã trả hàng thành công cho đơn #{$order['ma_don_code']}! Đơn đã chuyển sang mục Trả hàng.",
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            json_error('Không thể xử lý trả hàng: ' . $e->getMessage(), 500);
        }
    }

    if ($orderId <= 0 || !in_array($newStatus, ['pending', 'confirmed', 'shipping', 'done', 'returned', 'cancelled'], true)) {
        json_error('Thiếu mã đơn hàng hoặc trạng thái không hợp lệ.');
    }

    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT * FROM DonHang WHERE ma_don_hang = ? FOR UPDATE');
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) {
            $pdo->rollBack();
            json_error('Không tìm thấy đơn hàng.', 404);
        }

        // Phân quyền cho khách hàng:
        // 1) Hủy đơn của chính mình khi đang ở trạng thái pending
        // 2) Bấm "Đã nhận" (done) khi đơn đang giao hàng (shipping / confirmed)
        if ($user['role'] === 'khach_hang') {
            $isOwner = (int)$order['ma_khach_hang'] === (int)$user['ma_khach_hang'];
            $canCancel = $isOwner && $newStatus === 'cancelled' && $order['trang_thai'] === 'pending';
            $canConfirmReceived = $isOwner && $newStatus === 'done' && in_array($order['trang_thai'], ['shipping', 'confirmed'], true);
            if (!$canCancel && !$canConfirmReceived) {
                $pdo->rollBack();
                json_error('Bạn chỉ có thể hủy đơn khi đang chờ xác nhận hoặc xác nhận Đã nhận khi đơn đang giao hàng.', 403);
            }
        }

        $oldStatus = $order['trang_thai'];
        if (in_array($oldStatus, ['cancelled', 'returned'], true) && $newStatus !== $oldStatus) {
            $pdo->rollBack();
            json_error('Không thể khôi phục đơn hàng đã hủy hoặc đã trả hàng.', 400);
        }

        // Hoàn lại tồn kho nếu chuyển sang trạng thái cancelled hoặc returned
        if (in_array($newStatus, ['cancelled', 'returned'], true) && !in_array($oldStatus, ['cancelled', 'returned'], true)) {
            $itStmt = $pdo->prepare('SELECT ma_san_pham, so_luong FROM ChiTietDonHang WHERE ma_don_hang = ?');
            $itStmt->execute([$orderId]);
            $restore = $pdo->prepare('UPDATE SanPham SET ton_kho = ton_kho + ? WHERE ma_san_pham = ?');
            foreach ($itStmt->fetchAll() as $it) {
                $restore->execute([(int)$it['so_luong'], (int)$it['ma_san_pham']]);
            }
            $pdo->prepare("UPDATE ThanhToan SET trang_thai = 'refunded' WHERE ma_don_hang = ? AND trang_thai = 'paid'")->execute([$orderId]);
        }

        $isStaffUpdater = in_array($user['role'], ['admin', 'nhan_vien'], true);
        if ($isStaffUpdater && !empty($user['ma_nhan_vien'])) {
            $pdo->prepare('UPDATE DonHang SET ma_nhan_vien_xu_ly = ? WHERE ma_don_hang = ?')
                ->execute([(int)$user['ma_nhan_vien'], $orderId]);
            // Nếu hóa đơn đã được lập trước đó dưới tên "Hệ thống Online" (ví dụ đơn QR trả trước) -> cập nhật sang đúng tên nhân viên/quản trị duyệt đơn
            $pdo->prepare(
                "UPDATE HoaDon SET ma_nhan_vien_lap = ?, ten_nguoi_lap = ?
                 WHERE ma_don_hang = ? AND ten_nguoi_lap IN ('Hệ thống', 'Hệ thống Online', 'Thu ngân', '')"
            )->execute([(int)$user['ma_nhan_vien'], $user['ho_ten'] ?? 'Nhân viên', $orderId]);
        }

        if ($newStatus === 'done') {
            $pdo->prepare("UPDATE ThanhToan SET trang_thai = 'paid' WHERE ma_don_hang = ?")->execute([$orderId]);
            $pdo->prepare("UPDATE DonHang SET trang_thai = 'done', ngay_giao = COALESCE(ngay_giao, NOW()) WHERE ma_don_hang = ?")->execute([$orderId]);
            ensure_invoice_for_order($pdo, $orderId, [
                'kenh_ban' => detect_order_channel($order),
                'ma_nhan_vien_lap' => $isStaffUpdater ? ($user['ma_nhan_vien'] ?? null) : null,
                'ten_nguoi_lap' => $isStaffUpdater ? ($user['ho_ten'] ?? 'Nhân viên') : '',
            ]);
        } else {
            $pdo->prepare('UPDATE DonHang SET trang_thai = ? WHERE ma_don_hang = ?')->execute([$newStatus, $orderId]);
        }

        $statusLabels = [
            'pending' => 'Chờ xác nhận',
            'confirmed' => 'Chờ giao hàng',
            'shipping' => 'Chờ giao hàng',
            'done' => 'Đã giao',
            'returned' => 'Trả hàng',
            'cancelled' => 'Đã hủy',
        ];
        if ($user['role'] === 'khach_hang' && $newStatus === 'done') {
            create_notification(
                $pdo,
                "Khách đã nhận đơn #{$order['ma_don_code']}",
                "Khách hàng {$order['ten_nguoi_nhan']} đã xác nhận nhận được đơn hàng #{$order['ma_don_code']}.",
                'order',
                null
            );
        } elseif ($order['ma_khach_hang']) {
            $accStmt = $pdo->prepare('SELECT ma_tai_khoan FROM KhachHang WHERE ma_khach_hang = ?');
            $accStmt->execute([$order['ma_khach_hang']]);
            $accId = $accStmt->fetchColumn();
            if ($accId) {
                create_notification(
                    $pdo,
                    "Cập nhật đơn #{$order['ma_don_code']}",
                    "Đơn hàng #{$order['ma_don_code']} đã chuyển sang trạng thái: {$statusLabels[$newStatus]}.",
                    'order',
                    (int)$accId
                );
            }
        }

        $pdo->commit();

        // Tự động gửi Email thông báo cho khách hàng khi nhân viên/Admin duyệt đơn hoặc không duyệt đơn
        $emailResult = null;
        $isStaffAction = in_array($user['role'], ['admin', 'nhan_vien'], true);
        if ($isStaffAction) {
            if (in_array($newStatus, ['confirmed', 'shipping'], true) && $oldStatus === 'pending') {
                $emailResult = send_order_status_email($pdo, $orderId, 'order_approved', '');
            } elseif ($newStatus === 'cancelled' && $oldStatus !== 'cancelled') {
                $emailResult = send_order_status_email($pdo, $orderId, 'order_rejected', $lyDo);
            }
        }

        $msg = ($user['role'] === 'khach_hang' && $newStatus === 'done')
            ? "Đã xác nhận nhận hàng đơn #{$order['ma_don_code']}! Đơn đã chuyển sang mục Đã giao."
            : 'Đã cập nhật trạng thái đơn hàng thành: ' . $statusLabels[$newStatus];

        if ($emailResult && !empty($emailResult['email'])) {
            if ($emailResult['status'] === 'sent_smtp') {
                $msg .= " · Đã gửi email thông báo tới {$emailResult['email']}.";
            } elseif ($emailResult['status'] === 'logged_local') {
                $msg .= " · Đã gửi thông báo email tới {$emailResult['email']} (hiển thị trong Hộp thư Email).";
            } else {
                $msg .= " · Đã lưu thư tới {$emailResult['email']} (SMTP: {$emailResult['note']}).";
            }
        }

        json_response(['message' => $msg, 'email' => $emailResult]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_error('Lỗi cập nhật đơn hàng: ' . $e->getMessage(), 500);
    }
}

json_error('Phương thức không được hỗ trợ.', 405);
