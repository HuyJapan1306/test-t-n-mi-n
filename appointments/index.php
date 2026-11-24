<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/schedule.php';
init_api();

/**
 * Lấy toàn bộ lịch hẹn chưa hủy trong ngày của một thú cưng (theo ma_thu_cung hoặc tên thú cưng của khách)
 */
function fetch_pet_day_appointments(
    PDO $pdo,
    string $dateStr,
    ?int $customerId,
    ?int $petId,
    string $petName,
    string $phone = ''
): array {
    $petName = trim($petName);
    if (!$petId && $petName === '') {
        return [];
    }

    $conds = [];
    $params = [$dateStr];

    if ($customerId) {
        if ($petId && $petName !== '') {
            $conds[] = '(lh.ma_thu_cung = ? OR (lh.ma_khach_hang = ? AND LOWER(lh.ten_thu_cung) = LOWER(?)))';
            $params[] = $petId;
            $params[] = $customerId;
            $params[] = $petName;
        } elseif ($petId) {
            $conds[] = 'lh.ma_thu_cung = ?';
            $params[] = $petId;
        } else {
            $conds[] = '(lh.ma_khach_hang = ? AND LOWER(lh.ten_thu_cung) = LOWER(?))';
            $params[] = $customerId;
            $params[] = $petName;
        }
    } elseif ($phone !== '' && $petName !== '') {
        $conds[] = '(lh.so_dien_thoai = ? AND LOWER(lh.ten_thu_cung) = LOWER(?))';
        $params[] = $phone;
        $params[] = $petName;
    } else {
        return [];
    }

    $sql = "SELECT lh.ma_lich_hen, lh.ma_dich_vu, lh.ten_thu_cung, lh.ngay_gio,
                   dv.ten_dich_vu, dv.thoi_luong
            FROM LichHen lh
            JOIN DichVu dv ON dv.ma_dich_vu = lh.ma_dich_vu
            WHERE DATE(lh.ngay_gio) = ?
              AND lh.trang_thai <> 'cancelled'
              AND (" . implode(' OR ', $conds) . ')
            ORDER BY lh.ngay_gio ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $intervals = [];
    foreach ($rows as $row) {
        $ts = strtotime((string)$row['ngay_gio']);
        if ($ts === false) {
            continue;
        }
        $pickedMin = ((int)date('H', $ts)) * 60 + ((int)date('i', $ts));
        [$sMin, $eMin] = find_matching_slot_pair($row, $pickedMin);
        $plan = get_service_schedule_plan($row);
        $intervals[] = [
            'ma_lich_hen' => (int)$row['ma_lich_hen'],
            'ma_dich_vu' => (int)$row['ma_dich_vu'],
            'ten_dich_vu' => (string)$row['ten_dich_vu'],
            'group' => $plan['group'],
            'start_min' => $sMin,
            'end_min' => $eMin,
            'label' => format_slot_hour($sMin) . ' - ' . format_slot_hour($eMin),
        ];
    }

    return $intervals;
}

/**
 * Xây dựng danh sách khung giờ trong ngày kèm số lượt đã đặt + phát hiện trùng lịch cho bé
 */
function build_service_slots(
    PDO $pdo,
    int $serviceId,
    string $dateStr,
    ?int $customerId = null,
    ?int $petId = null,
    string $petName = '',
    string $phone = ''
): array {
    $dvStmt = $pdo->prepare('SELECT ma_dich_vu, ten_dich_vu, thoi_luong, gia FROM DichVu WHERE ma_dich_vu = ? LIMIT 1');
    $dvStmt->execute([$serviceId]);
    $service = $dvStmt->fetch();
    if (!$service) {
        json_error('Không tìm thấy dịch vụ.', 404);
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr)) {
        $dateStr = date('Y-m-d');
    }

    $duration = (int)$service['thoi_luong'];
    $plan = get_service_schedule_plan($service);
    $pairs = $plan['pairs'];

    // Lấy toàn bộ lịch hẹn chưa hủy của dịch vụ này trong ngày
    $bStmt = $pdo->prepare(
        "SELECT ngay_gio FROM LichHen
         WHERE ma_dich_vu = ?
           AND DATE(ngay_gio) = ?
           AND trang_thai <> 'cancelled'"
    );
    $bStmt->execute([$serviceId, $dateStr]);
    $bookedTimes = $bStmt->fetchAll(PDO::FETCH_COLUMN);

    $bookedMinutes = [];
    foreach ($bookedTimes as $dt) {
        $ts = strtotime((string)$dt);
        if ($ts !== false) {
            $bookedMinutes[] = ((int)date('H', $ts)) * 60 + ((int)date('i', $ts));
        }
    }

    // Kiểm tra các lịch hẹn khác trong ngày của CÙNG BÉ THÚ CƯNG để chống đặt trùng giờ
    $petDayAppointments = fetch_pet_day_appointments($pdo, $dateStr, $customerId, $petId, $petName, $phone);
    $existingGroups = array_values(array_unique(array_column($petDayAppointments, 'group')));
    $advisory = build_same_day_advisory($plan['group'], $existingGroups);

    $nowTs = time();
    $slots = [];

    foreach ($pairs as [$startMin, $endMin]) {
        $startTime = sprintf('%02d:%02d', intdiv($startMin, 60), $startMin % 60);
        $endTime = sprintf('%02d:%02d', intdiv($endMin, 60), $endMin % 60);
        $slotDatetime = "{$dateStr} {$startTime}:00";
        $slotStartTs = strtotime($slotDatetime);

        // Đếm số lượt đã đặt rơi vào khung giờ [startMin, endMin)
        $booked = 0;
        foreach ($bookedMinutes as $bm) {
            if ($bm >= $startMin && $bm < $endMin) {
                $booked++;
            }
        }

        // Kiểm tra xem bé thú cưng có lịch khác bị giao thời gian với [startMin, endMin) không
        $conflict = null;
        foreach ($petDayAppointments as $appt) {
            if ($startMin < $appt['end_min'] && $appt['start_min'] < $endMin) {
                $conflict = $appt;
                break;
            }
        }

        $remaining = max(0, SPA_MAX_PER_SLOT - $booked);
        $isPast = $slotStartTs !== false && $slotStartTs <= $nowTs;

        if ($isPast) {
            $status = 'past';
            $statusText = 'Đã qua giờ';
        } elseif ($conflict !== null) {
            $status = 'conflict';
            $statusText = 'Trùng lịch của bé';
        } elseif ($remaining <= 0) {
            $status = 'full';
            $statusText = 'Không còn trống';
        } else {
            $status = 'available';
            $statusText = 'Còn trống';
        }

        $slots[] = [
            'start' => $startTime,
            'end' => $endTime,
            'label' => format_slot_hour($startMin) . ' - ' . format_slot_hour($endMin),
            'datetime' => $slotDatetime,
            'booked' => $booked,
            'max' => SPA_MAX_PER_SLOT,
            'remaining' => $remaining,
            'status' => $status,
            'status_text' => $statusText,
            'conflict_reason' => $conflict
                ? "Bé đã có lịch {$conflict['ten_dich_vu']} ({$conflict['label']})"
                : null,
        ];
    }

    return [
        'date' => $dateStr,
        'service' => [
            'ma_dich_vu' => (int)$service['ma_dich_vu'],
            'ten_dich_vu' => $service['ten_dich_vu'],
            'thoi_luong' => $duration,
            'gia' => (float)$service['gia'],
            'group' => $plan['group'],
            'group_label' => $plan['group_label'],
            'schedule_hint' => $plan['schedule_hint'],
            'max_per_slot' => SPA_MAX_PER_SLOT,
        ],
        'advisory' => $advisory,
        'slots' => $slots,
    ];
}

$pdo = get_db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    // Tra cứu khung giờ trống cho dịch vụ theo ngày (+ kiểm tra trùng lịch theo thú cưng)
    if (($_GET['action'] ?? '') === 'slots') {
        $serviceId = (int)($_GET['ma_dich_vu'] ?? 0);
        if ($serviceId <= 0) {
            $serviceId = (int)$pdo->query("SELECT ma_dich_vu FROM DichVu WHERE trang_thai = 'active' ORDER BY ma_dich_vu ASC LIMIT 1")->fetchColumn();
        }
        $dateStr = trim((string)($_GET['date'] ?? date('Y-m-d')));
        $user = current_user($pdo);
        $customerId = ($user && !empty($user['ma_khach_hang'])) ? (int)$user['ma_khach_hang'] : null;
        $petId = !empty($_GET['ma_thu_cung']) ? (int)$_GET['ma_thu_cung'] : null;
        $petName = trim((string)($_GET['ten_thu_cung'] ?? ''));
        $phone = trim((string)($_GET['so_dien_thoai'] ?? ''));

        json_response(build_service_slots($pdo, $serviceId, $dateStr, $customerId, $petId, $petName, $phone));
    }

    $user = current_user($pdo);
    $scope = $_GET['scope'] ?? '';

    if ($scope === 'admin') {
        require_role(['admin', 'nhan_vien'], $pdo);
        $stmt = $pdo->query(
            "SELECT lh.*, dv.ten_dich_vu, dv.gia, dv.thoi_luong
             FROM LichHen lh
             JOIN DichVu dv ON dv.ma_dich_vu = lh.ma_dich_vu
             ORDER BY lh.ngay_gio ASC"
        );
        json_response(['appointments' => $stmt->fetchAll()]);
    }

    if ($user && $user['ma_khach_hang']) {
        $stmt = $pdo->prepare(
            "SELECT lh.*, dv.ten_dich_vu, dv.gia, dv.thoi_luong
             FROM LichHen lh
             JOIN DichVu dv ON dv.ma_dich_vu = lh.ma_dich_vu
             WHERE lh.ma_khach_hang = ?
             ORDER BY lh.ngay_gio DESC"
        );
        $stmt->execute([$user['ma_khach_hang']]);
        json_response(['appointments' => $stmt->fetchAll()]);
    }

    json_response(['appointments' => []]);
}

if ($method === 'POST') {
    $user = current_user($pdo);
    if (!$user) {
        json_error('Vui lòng đăng nhập hoặc đăng ký tài khoản để đặt lịch dịch vụ.', 401, ['require_auth' => true]);
    }
    $in = get_json_input();

    $maDichVu = (int)($in['ma_dich_vu'] ?? 0);
    $tenDichVu = trim((string)($in['ten_dich_vu'] ?? ''));
    if ($maDichVu <= 0 && $tenDichVu !== '') {
        $sStmt = $pdo->prepare('SELECT ma_dich_vu FROM DichVu WHERE ten_dich_vu = ? LIMIT 1');
        $sStmt->execute([$tenDichVu]);
        $maDichVu = (int)$sStmt->fetchColumn();
    }
    if ($maDichVu <= 0) {
        $maDichVu = (int)$pdo->query("SELECT ma_dich_vu FROM DichVu WHERE trang_thai = 'active' ORDER BY ma_dich_vu ASC LIMIT 1")->fetchColumn();
    }

    $dvStmt = $pdo->prepare('SELECT ma_dich_vu, ten_dich_vu, thoi_luong, gia FROM DichVu WHERE ma_dich_vu = ?');
    $dvStmt->execute([$maDichVu]);
    $dichVu = $dvStmt->fetch();
    if (!$dichVu) {
        json_error('Dịch vụ không tồn tại.');
    }

    $isAdminCreate = !empty($in['from_admin']) && in_array($user['role'], ['admin', 'nhan_vien'], true);
    $tenChu = $isAdminCreate
        ? trim((string)($in['ten_chu_nuoi'] ?? ''))
        : trim((string)($user['ho_ten'] ?? $user['ten_dang_nhap']));
    $phone = $isAdminCreate
        ? trim((string)($in['so_dien_thoai'] ?? ''))
        : trim((string)($user['so_dien_thoai'] ?? ''));
    if ($phone === '') {
        $phone = '0900000000';
    }

    $tenPet = trim((string)($in['ten_thu_cung'] ?? ''));
    $bieuTuong = trim((string)($in['bieu_tuong'] ?? '🐶')) ?: '🐶';
    $ngayGioRaw = trim((string)($in['ngay_gio'] ?? ''));
    $ghiChu = trim((string)($in['ghi_chu'] ?? ''));
    $maThuCung = !empty($in['ma_thu_cung']) ? (int)$in['ma_thu_cung'] : null;

    if ($tenChu === '' || $tenPet === '' || $ngayGioRaw === '') {
        json_error('Vui lòng nhập tên thú cưng và chọn khung giờ hẹn.');
    }

    $ts = strtotime($ngayGioRaw);
    if ($ts === false || $ts < time() - 60) {
        json_error('Vui lòng chọn khung giờ trong tương lai.');
    }
    $ngayGio = date('Y-m-d H:i:s', $ts);
    $dateOnly = date('Y-m-d', $ts);
    $pickedMin = ((int)date('H', $ts)) * 60 + ((int)date('i', $ts));

    // Xác định khung giờ hợp lệ của dịch vụ từ bảng quy hoạch không trùng lặp
    $plan = get_service_schedule_plan($dichVu);
    $matchedPair = null;
    foreach ($plan['pairs'] as [$sMin, $eMin]) {
        if ($pickedMin >= $sMin && $pickedMin < $eMin) {
            $matchedPair = [$sMin, $eMin];
            break;
        }
    }
    if (!$matchedPair) {
        json_error('Khung giờ bạn chọn không nằm trong lịch phục vụ của dịch vụ này. Vui lòng chọn một khung giờ hiển thị trên lịch.', 422);
    }

    [$slotStartMin, $slotEndMin] = $matchedPair;
    $slotStartStr = sprintf('%s %02d:%02d:00', $dateOnly, intdiv($slotStartMin, 60), $slotStartMin % 60);
    $slotEndStr = sprintf('%s %02d:%02d:00', $dateOnly, intdiv($slotEndMin, 60), $slotEndMin % 60);
    $slotLabel = format_slot_hour($slotStartMin) . ' - ' . format_slot_hour($slotEndMin);

    $customerId = (!$isAdminCreate && $user && $user['ma_khach_hang']) ? (int)$user['ma_khach_hang'] : null;

    try {
        $pdo->beginTransaction();

        // Khóa dịch vụ để chống đặt vượt quá 4 lượt trong cùng khung giờ
        $pdo->prepare('SELECT ma_dich_vu FROM DichVu WHERE ma_dich_vu = ? FOR UPDATE')->execute([$maDichVu]);

        // 1. Kiểm tra giới hạn tối đa 4 lượt / khung giờ của dịch vụ
        $cntStmt = $pdo->prepare(
            "SELECT COUNT(*) FROM LichHen
             WHERE ma_dich_vu = ?
               AND ngay_gio >= ?
               AND ngay_gio < ?
               AND trang_thai <> 'cancelled'"
        );
        $cntStmt->execute([$maDichVu, $slotStartStr, $slotEndStr]);
        $currentBooked = (int)$cntStmt->fetchColumn();

        if ($currentBooked >= SPA_MAX_PER_SLOT) {
            $pdo->rollBack();
            json_error(
                "Khung giờ {$slotLabel} ngày " . date('d/m/Y', $ts) . " đã không còn trống (đủ " . SPA_MAX_PER_SLOT . '/' . SPA_MAX_PER_SLOT . ' lượt). Vui lòng chọn khung giờ khác nhé!',
                409
            );
        }

        // 2. Kiểm tra chống đặt TRÙNG GIỜ cho cùng một bé thú cưng giữa các dịch vụ
        $petDayAppointments = fetch_pet_day_appointments($pdo, $dateOnly, $customerId, $maThuCung, $tenPet, $phone);
        foreach ($petDayAppointments as $appt) {
            if ($slotStartMin < $appt['end_min'] && $appt['start_min'] < $slotEndMin) {
                $pdo->rollBack();
                json_error(
                    "Bé {$tenPet} đã có lịch {$appt['ten_dich_vu']} khung giờ {$appt['label']} ngày " . date('d/m/Y', $ts) . ". Vui lòng chọn khung giờ khác để tránh trùng lịch nhé!",
                    409
                );
            }
        }

        // Nếu khách đã đăng nhập đặt lịch cho bé mới chưa có trong ThuCung -> lưu luôn vào ThuCung
        if ($customerId && !$maThuCung) {
            $loaiMap = ['🐶' => 'Chó', '🐱' => 'Mèo', '🐰' => 'Thỏ', '🐹' => 'Thú cưng khác'];
            $loai = $loaiMap[$bieuTuong] ?? 'Thú cưng';
            $pChk = $pdo->prepare('SELECT ma_thu_cung FROM ThuCung WHERE ma_khach_hang = ? AND LOWER(ten_thu_cung) = LOWER(?) LIMIT 1');
            $pChk->execute([$customerId, $tenPet]);
            $foundPet = $pChk->fetchColumn();
            if ($foundPet) {
                $maThuCung = (int)$foundPet;
            } else {
                $pdo->prepare('INSERT INTO ThuCung (ma_khach_hang, ten_thu_cung, loai, bieu_tuong, ghi_chu) VALUES (?, ?, ?, ?, ?)')
                    ->execute([$customerId, $tenPet, $loai, $bieuTuong, $ghiChu]);
                $maThuCung = (int)$pdo->lastInsertId();
            }
        }

        $stmt = $pdo->prepare(
            "INSERT INTO LichHen (ma_khach_hang, ma_thu_cung, ma_dich_vu, ten_chu_nuoi, so_dien_thoai, ten_thu_cung, bieu_tuong, ngay_gio, ghi_chu, trang_thai)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')"
        );
        $stmt->execute([$customerId, $maThuCung, $maDichVu, $tenChu, $phone, $tenPet, $bieuTuong, $ngayGio, $ghiChu]);
        $newId = (int)$pdo->lastInsertId();

        create_notification(
            $pdo,
            "Lịch hẹn mới cho bé {$tenPet}",
            "{$tenChu} đặt lịch {$dichVu['ten_dich_vu']} khung giờ {$slotLabel} ngày " . date('d/m/Y', $ts) . '.',
            'appointment',
            null
        );

        $pdo->commit();

        json_response([
            'message' => "🐾 Đã đặt lịch {$dichVu['ten_dich_vu']} ({$slotLabel}, ngày " . date('d/m/Y', $ts) . ") cho bé {$tenPet} thành công!",
            'ma_lich_hen' => $newId,
            'slot_label' => $slotLabel,
            'booked_in_slot' => $currentBooked + 1,
            'max_per_slot' => SPA_MAX_PER_SLOT,
        ], 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_error('Không thể lưu lịch hẹn: ' . $e->getMessage(), 500);
    }
}

if ($method === 'PUT') {
    $user = require_auth($pdo);
    $in = get_json_input();
    $id = (int)($in['ma_lich_hen'] ?? 0);
    $status = trim((string)($in['trang_thai'] ?? ''));

    if ($id <= 0 || !in_array($status, ['pending', 'confirmed', 'done', 'cancelled'], true)) {
        json_error('Thông tin cập nhật lịch hẹn không hợp lệ.');
    }

    $stmt = $pdo->prepare('SELECT * FROM LichHen WHERE ma_lich_hen = ?');
    $stmt->execute([$id]);
    $app = $stmt->fetch();
    if (!$app) {
        json_error('Không tìm thấy lịch hẹn.', 404);
    }

    if ($user['role'] === 'khach_hang') {
        if ((int)$app['ma_khach_hang'] !== (int)$user['ma_khach_hang'] || $status !== 'cancelled' || $app['trang_thai'] !== 'pending') {
            json_error('Bạn chỉ có thể hủy lịch hẹn của mình khi chưa được xác nhận.', 403);
        }
    }

    $pdo->prepare('UPDATE LichHen SET trang_thai = ? WHERE ma_lich_hen = ?')->execute([$status, $id]);
    json_response(['message' => 'Đã cập nhật trạng thái lịch hẹn.']);
}

json_error('Phương thức không được hỗ trợ.', 405);
