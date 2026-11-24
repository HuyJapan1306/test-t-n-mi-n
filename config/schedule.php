<?php
declare(strict_types=1);

/**
 * Quy hoạch khung giờ đặt lịch cho "Góc nhỏ có em"
 * - Các dịch vụ Spa / Grooming có tính trùng lặp tài nguyên (bồn tắm, bàn vệ sinh, KTV)
 *   được phân bổ thành chu kỳ 4 tiếng 30 phút (07:00 - 20:30) hoàn toàn KHÔNG chồng lấn giờ:
 *     + Tắm & vệ sinh cơ bản (45p, ca 60p):        7h-8h, 11h30-12h30, 16h-17h
 *     + Chăm sóc móng & vệ sinh tai (25p, ca 30p): 8h-8h30, 12h30-13h, 17h-17h30
 *     + Gói Spa thư giãn toàn diện (75p, ca 90p):  8h30-10h, 13h-14h30, 17h30-19h
 *     + Cắt tỉa tạo kiểu lông (90p, ca 90p):       10h-11h30, 14h30-16h, 19h-20h30
 * - Dịch vụ Tiêm phòng vắc-xin (30p, phòng thú y riêng, không để giá):
 *     + Sáng: 8h-8h30, 9h-9h30, 10h-10h30, 11h-11h30
 *     + Chiều: 13h30-14h, 14h30-15h, 15h30-16h, 16h30-17h, 17h30-18h, 18h30-19h
 */

const SPA_MAX_PER_SLOT = 4;
const SPA_OPEN_HOUR = 7;
const SPA_CLOSE_HOUR = 20;

function schedule_normalize_text(string $s): string
{
    $s = mb_strtolower($s, 'UTF-8');
    $map = [
        'à'=>'a','á'=>'a','ạ'=>'a','ả'=>'a','ã'=>'a','â'=>'a','ầ'=>'a','ấ'=>'a','ậ'=>'a','ẩ'=>'a','ẫ'=>'a','ă'=>'a','ằ'=>'a','ắ'=>'a','ặ'=>'a','ẳ'=>'a','ẵ'=>'a',
        'è'=>'e','é'=>'e','ẹ'=>'e','ẻ'=>'e','ẽ'=>'e','ê'=>'e','ề'=>'e','ế'=>'e','ệ'=>'e','ể'=>'e','ễ'=>'e',
        'ì'=>'i','í'=>'i','ị'=>'i','ỉ'=>'i','ĩ'=>'i',
        'ò'=>'o','ó'=>'o','ọ'=>'o','ỏ'=>'o','õ'=>'o','ô'=>'o','ồ'=>'o','ố'=>'o','ộ'=>'o','ổ'=>'o','ỗ'=>'o','ơ'=>'o','ờ'=>'o','ớ'=>'o','ợ'=>'o','ở'=>'o','ỡ'=>'o',
        'ù'=>'u','ú'=>'u','ụ'=>'u','ủ'=>'u','ũ'=>'u','ư'=>'u','ừ'=>'u','ứ'=>'u','ự'=>'u','ử'=>'u','ữ'=>'u',
        'ỳ'=>'y','ý'=>'y','ỵ'=>'y','ỷ'=>'y','ỹ'=>'y','đ'=>'d',
    ];
    return strtr($s, $map);
}

function format_slot_hour(int $totalMinutes): string
{
    $h = intdiv($totalMinutes, 60);
    $m = $totalMinutes % 60;
    return $m === 0 ? "{$h}h" : sprintf('%dh%02d', $h, $m);
}

function calc_slot_step_minutes(int $duration): int
{
    if ($duration <= 30) {
        return 30;
    }
    if ($duration <= 60) {
        return 60;
    }
    if ($duration <= 90) {
        return 90;
    }
    return 120;
}

/**
 * Xác định nhóm dịch vụ & danh sách khung giờ [startMin, endMin] đã sắp xếp tránh trùng lặp
 */
function get_service_schedule_plan(array $service): array
{
    $name = schedule_normalize_text((string)($service['ten_dich_vu'] ?? ''));
    $duration = max(15, (int)($service['thoi_luong'] ?? 45));

    // 1. Tiêm phòng vắc-xin (phòng thú y riêng, đệm 30p theo dõi sau tiêm)
    if (str_contains($name, 'tiem phong') || str_contains($name, 'vac-xin') || str_contains($name, 'vacxin') || str_contains($name, 'vaccine')) {
        $pairs = [
            [480, 510],   // 8h - 8h30
            [540, 570],   // 9h - 9h30
            [600, 630],   // 10h - 10h30
            [660, 690],   // 11h - 11h30
            [810, 840],   // 13h30 - 14h
            [870, 900],   // 14h30 - 15h
            [930, 960],   // 15h30 - 16h
            [990, 1020],  // 16h30 - 17h
            [1050, 1080], // 17h30 - 18h
            [1110, 1140], // 18h30 - 19h
        ];
        return [
            'group' => 'vaccine',
            'group_label' => 'Phòng thú y · Tiêm phòng',
            'schedule_hint' => 'Khung 30p cách đều theo dõi sau tiêm (8h–11h30 & 13h30–19h)',
            'pairs' => $pairs,
        ];
    }

    // 2. Gói Spa thư giãn toàn diện (90p — không trùng Tắm, Móng/tai & Cắt tỉa)
    if (str_contains($name, 'spa') || str_contains($name, 'toan dien')) {
        $pairs = [
            [510, 600],   // 8h30 - 10h
            [780, 870],   // 13h - 14h30
            [1050, 1140], // 17h30 - 19h
        ];
        return [
            'group' => 'spa_full',
            'group_label' => 'Khu Spa & Tắm (Tách ca tránh trùng)',
            'schedule_hint' => 'Ca 90p tách biệt hoàn toàn với Tắm cơ bản, Móng/tai & Cắt tỉa (8h30 · 13h · 17h30)',
            'pairs' => $pairs,
        ];
    }

    // 3. Cắt tỉa tạo kiểu lông (90p — không trùng Tắm, Móng/tai & Spa toàn diện)
    if (str_contains($name, 'cat tia') || str_contains($name, 'tao kieu') || str_contains($name, 'grooming')) {
        $pairs = [
            [600, 690],   // 10h - 11h30
            [870, 960],   // 14h30 - 16h
            [1140, 1230], // 19h - 20h30
        ];
        return [
            'group' => 'grooming',
            'group_label' => 'Khu Grooming tạo kiểu (Tách ca tránh trùng)',
            'schedule_hint' => 'Ca 90p xếp riêng không trùng với Tắm & Spa toàn diện (10h · 14h30 · 19h)',
            'pairs' => $pairs,
        ];
    }

    // 4. Chăm sóc móng & vệ sinh tai (30p — nối tiếp sau ca Tắm cơ bản, không trùng Spa & Cắt tỉa)
    if (str_contains($name, 'mong') || str_contains($name, 've sinh tai')) {
        $pairs = [
            [480, 510],   // 8h - 8h30
            [750, 780],   // 12h30 - 13h
            [1020, 1050], // 17h - 17h30
        ];
        return [
            'group' => 'nail_ear',
            'group_label' => 'Khu vệ sinh nhanh (Tách ca tránh trùng)',
            'schedule_hint' => 'Ca 30p tách riêng sau ca Tắm cơ bản, tránh trùng Spa & Cắt tỉa (8h · 12h30 · 17h)',
            'pairs' => $pairs,
        ];
    }

    // 5. Tắm & vệ sinh cơ bản (60p — không trùng Móng/tai, Spa toàn diện & Cắt tỉa)
    if (str_contains($name, 'tam') || str_contains($name, 've sinh co ban')) {
        $pairs = [
            [420, 480],   // 7h - 8h
            [690, 750],   // 11h30 - 12h30
            [960, 1020],  // 16h - 17h
        ];
        return [
            'group' => 'bath_basic',
            'group_label' => 'Khu Tắm cơ bản (Tách ca tránh trùng)',
            'schedule_hint' => 'Ca 60p tách biệt với Móng/tai, Gói Spa toàn diện & Cắt tỉa (7h · 11h30 · 16h)',
            'pairs' => $pairs,
        ];
    }

    // 6. Dịch vụ mới do Admin tạo thêm -> tự động chia khung đều theo thời lượng
    $step = calc_slot_step_minutes($duration);
    $openMin = SPA_OPEN_HOUR * 60;
    $lastStartMin = SPA_CLOSE_HOUR * 60 - $step;
    if ($step === 90) {
        $lastStartMin = 19 * 60;
    }
    $pairs = [];
    for ($m = $openMin; $m <= $lastStartMin; $m += $step) {
        $pairs[] = [$m, $m + $step];
    }
    return [
        'group' => 'custom',
        'group_label' => 'Dịch vụ chăm sóc',
        'schedule_hint' => "Khung giờ linh hoạt mỗi {$step} phút (7h – 20h)",
        'pairs' => $pairs,
    ];
}

/**
 * Tìm khung giờ [startMin, endMin] ứng với 1 mốc thời gian (phút trong ngày)
 */
function find_matching_slot_pair(array $service, int $pickedMin): array
{
    $plan = get_service_schedule_plan($service);
    foreach ($plan['pairs'] as [$startMin, $endMin]) {
        if ($pickedMin >= $startMin && $pickedMin < $endMin) {
            return [$startMin, $endMin];
        }
    }
    $step = calc_slot_step_minutes((int)($service['thoi_luong'] ?? 45));
    return [$pickedMin, $pickedMin + $step];
}

/**
 * Kiểm tra lời khuyên/lưu ý khi đặt các dịch vụ liên quan trong cùng 1 ngày cho cùng 1 bé
 */
function build_same_day_advisory(string $targetGroup, array $existingGroups): ?string
{
    if (empty($existingGroups)) {
        return null;
    }
    $bathGroups = ['bath_basic', 'spa_full', 'grooming', 'nail_ear'];

    if ($targetGroup === 'vaccine' && array_intersect($bathGroups, $existingGroups)) {
        return 'Lưu ý thú y: Bé đã có lịch Tắm/Spa trong ngày này. Bạn nên tắm cho bé trước giờ tiêm và giữ bé khô ráo ít nhất 24–48 giờ sau khi tiêm phòng nhé!';
    }
    if (in_array($targetGroup, $bathGroups, true) && in_array('vaccine', $existingGroups, true)) {
        return 'Lưu ý thú y: Bé đã có lịch Tiêm phòng trong ngày này — bác sĩ khuyên không tắm cho bé ngay sau khi tiêm (nên cách ít nhất 24–48 giờ).';
    }
    if (in_array($targetGroup, ['bath_basic', 'nail_ear'], true) && in_array('spa_full', $existingGroups, true)) {
        return 'Gợi ý tiết kiệm: Bé đã có lịch Gói Spa thư giãn toàn diện trong ngày (đã bao gồm tắm gội và vệ sinh tai/móng), bạn cân nhắc để tránh đặt trùng bước chăm sóc nhé!';
    }
    if ($targetGroup === 'spa_full' && array_intersect(['bath_basic', 'nail_ear'], $existingGroups)) {
        return 'Gợi ý tiết kiệm: Gói Spa toàn diện đã bao gồm tắm & vệ sinh cơ bản, bạn cân nhắc nếu bé đã có lịch dịch vụ lẻ trong cùng ngày nhé!';
    }
    return null;
}
