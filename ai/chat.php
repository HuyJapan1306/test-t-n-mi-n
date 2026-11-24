<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/ai.php';
init_api();

$pdo = get_db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$user = current_user($pdo);

if ($method === 'GET') {
    $convId = (int)($_GET['conversation_id'] ?? 0);
    if ($convId <= 0) {
        json_response(['messages' => []]);
    }

    // Kiểm tra quyền xem lịch sử cuộc trò chuyện
    $cStmt = $pdo->prepare('SELECT * FROM CuocHoiThoaiAI WHERE ma_cuoc_hoi_thoai = ?');
    $cStmt->execute([$convId]);
    $conv = $cStmt->fetch();
    if (!$conv) {
        json_response(['messages' => []]);
    }
    if ($conv['loai_tro_ly'] === 'admin') {
        require_role(['admin', 'nhan_vien'], $pdo);
    } elseif ($conv['ma_tai_khoan'] && (!$user || (int)$conv['ma_tai_khoan'] !== (int)$user['ma_tai_khoan'])) {
        json_error('Không có quyền xem lịch sử hội thoại này.', 403);
    }

    $mStmt = $pdo->prepare('SELECT vai_tro, noi_dung, thoi_gian FROM TinNhanAI WHERE ma_cuoc_hoi_thoai = ? ORDER BY ma_tin_nhan ASC LIMIT 40');
    $mStmt->execute([$convId]);
    json_response(['conversation_id' => $convId, 'messages' => $mStmt->fetchAll()]);
}

if ($method !== 'POST') {
    json_error('Phương thức không được hỗ trợ.', 405);
}

check_rate_limit('ai_chat', 25, 60);

$in = get_json_input();
$mode = (string)($in['mode'] ?? 'customer');
$message = trim((string)($in['message'] ?? ''));
$convId = (int)($in['conversation_id'] ?? 0);
$saveHistory = ($in['save_history'] ?? true) !== false;

if ($mode === 'admin') {
    $user = require_role(['admin', 'nhan_vien'], $pdo);
} else {
    $mode = 'customer';
}

if ($message === '' || mb_strlen($message) > 600) {
    json_error('Vui lòng nhập câu hỏi (tối đa 600 ký tự).');
}

// Tạo hoặc lấy cuộc hội thoại trong DB
if ($saveHistory) {
    if ($convId > 0) {
        $chk = $pdo->prepare('SELECT ma_cuoc_hoi_thoai FROM CuocHoiThoaiAI WHERE ma_cuoc_hoi_thoai = ? AND loai_tro_ly = ?');
        $chk->execute([$convId, $mode]);
        if (!$chk->fetch()) {
            $convId = 0;
        }
    }
    if ($convId <= 0) {
        $pdo->prepare(
            "INSERT INTO CuocHoiThoaiAI (ma_khach_hang, ma_tai_khoan, loai_tro_ly)
             VALUES (?, ?, ?)"
        )->execute([
            $user['ma_khach_hang'] ?? null,
            $user['ma_tai_khoan'] ?? null,
            $mode,
        ]);
        $convId = (int)$pdo->lastInsertId();
    }
}

// Lấy lịch sử gần nhất để giữ ngữ cảnh
$history = [];
if ($convId > 0) {
    $hStmt = $pdo->prepare('SELECT vai_tro, noi_dung FROM TinNhanAI WHERE ma_cuoc_hoi_thoai = ? ORDER BY ma_tin_nhan DESC LIMIT 6');
    $hStmt->execute([$convId]);
    $history = array_reverse($hStmt->fetchAll());
}

$recommendedProducts = [];
$reply = '';
$aiSource = 'smart_db_engine';
$fallbackNotice = null;

if ($mode === 'customer') {
    // 1. Truy vấn dữ liệu thật từ MySQL (chỉ sản phẩm đang bán & còn hàng)
    $inStockProducts = $pdo->query(
        "SELECT sp.ma_san_pham, sp.ten_san_pham, sp.mo_ta, sp.loai_thu_cung, sp.gia, sp.ton_kho, sp.bieu_tuong,
                dm.slug AS danh_muc_slug, dm.ten_danh_muc,
                (SELECT ha.duong_dan FROM HinhAnhSanPham ha
                 WHERE ha.ma_san_pham = sp.ma_san_pham
                 ORDER BY ha.la_anh_chinh DESC, ha.ma_hinh_anh ASC LIMIT 1) AS anh_chinh
         FROM SanPham sp
         JOIN DanhMuc dm ON dm.ma_danh_muc = sp.ma_danh_muc
         WHERE sp.trang_thai = 'active' AND sp.ton_kho > 0
         ORDER BY sp.ton_kho DESC, sp.ma_san_pham ASC"
    )->fetchAll();

    $services = $pdo->query(
        "SELECT ma_dich_vu, ten_dich_vu, mo_ta, gia, thoi_luong, bieu_tuong
         FROM DichVu
         WHERE trang_thai = 'active'
         ORDER BY gia ASC"
    )->fetchAll();

    $settingsRows = $pdo->query('SELECT khoa, gia_tri FROM CaiDat')->fetchAll();
    $storeCfg = [];
    foreach ($settingsRows as $r) {
        $storeCfg[$r['khoa']] = $r['gia_tri'];
    }
    $storeName = $storeCfg['store_name'] ?? 'Góc nhỏ có em';
    $hotline = $storeCfg['store_hotline'] ?? '0901 234 567';
    $address = $storeCfg['store_address'] ?? '128 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh';

    // Lọc sẵn sản phẩm phù hợp với câu hỏi để gắn kèm gợi ý thực tế
    $recommendedProducts = match_customer_products($message, $inStockProducts);

    // Tạo ngữ cảnh an toàn (không chứa mật khẩu, không dữ liệu nhạy cảm)
    $productCatalogText = implode("\n", array_map(static fn($p) => sprintf(
        "- [ID:%d] %s | Danh mục: %s | Dành cho: %s | Giá: %s | Còn: %d",
        $p['ma_san_pham'],
        $p['ten_san_pham'],
        $p['ten_danh_muc'],
        $p['loai_thu_cung'],
        format_vnd($p['gia']),
        $p['ton_kho']
    ), array_slice($inStockProducts, 0, 20)));

    $serviceCatalogText = implode("\n", array_map(static fn($s) => sprintf(
        "- %s: %s (%d phút) — %s",
        $s['ten_dich_vu'],
        (float)$s['gia'] > 0 ? format_vnd($s['gia']) : 'Tư vấn theo loại vắc-xin tại cửa hàng (không niêm yết giá)',
        $s['thoi_luong'],
        $s['mo_ta']
    ), $services));

    $systemPrompt = <<<PROMPT
Bạn là Pawly AI — trợ lý tư vấn thân thiện của cửa hàng thú cưng "{$storeName}" (Địa chỉ: {$address}, Hotline: {$hotline}).
Quy tắc bắt buộc:
1. Trả lời bằng tiếng Việt ngắn gọn, ấm áp, dễ hiểu.
2. CHỈ gợi ý những sản phẩm CÓ THẬT và ĐANG CÒN HÀNG trong danh sách bên dưới. Không bịa tên sản phẩm hoặc giá.
3. Thông tin chăm sóc sức khỏe chỉ mang tính tham khảo phổ thông; nếu thú cưng có dấu hiệu bệnh, bỏ ăn, nôn ói, tiêu chảy hoặc bất thường, luôn khuyên khách hàng liên hệ bác sĩ thú y.
4. Không tự xác nhận đơn hàng hay thu thập thông tin thẻ ngân hàng.

DANH SÁCH SẢN PHẨM CÒN HÀNG HIỆN TẠI:
{$productCatalogText}

DANH SÁCH DỊCH VỤ SPA:
{$serviceCatalogText}
PROMPT;

    $ext = call_external_ai($systemPrompt, $history, $message);
    if ($ext['ok']) {
        $reply = $ext['reply'];
        $aiSource = $ext['source'];
    } else {
        if ($ext['reason'] !== 'not_configured') {
            $fallbackNotice = 'Dịch vụ AI trực tuyến tạm gián đoạn, hệ thống đã tự động chuyển sang trợ lý dữ liệu nội bộ.';
        }
        $reply = build_customer_fallback_reply($message, $inStockProducts, $recommendedProducts, $services, $storeName, $hotline, $address);
    }
} else {
    // ADMIN MODE: Truy vấn thống kê thực tế từ MySQL
    $stats = [
        'revenue_done' => (float)$pdo->query("SELECT COALESCE(SUM(tong_tien), 0) FROM DonHang WHERE trang_thai = 'done'")->fetchColumn(),
        'revenue_month' => (float)$pdo->query("SELECT COALESCE(SUM(tong_tien), 0) FROM DonHang WHERE trang_thai <> 'cancelled' AND YEAR(ngay_dat)=YEAR(NOW()) AND MONTH(ngay_dat)=MONTH(NOW())")->fetchColumn(),
        'orders_month' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang WHERE YEAR(ngay_dat)=YEAR(NOW()) AND MONTH(ngay_dat)=MONTH(NOW())")->fetchColumn(),
        'orders_total' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang")->fetchColumn(),
        'orders_pending' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang WHERE trang_thai = 'pending'")->fetchColumn(),
        'orders_shipping' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang WHERE trang_thai = 'shipping'")->fetchColumn(),
        'orders_done' => (int)$pdo->query("SELECT COUNT(*) FROM DonHang WHERE trang_thai = 'done'")->fetchColumn(),
        'customers_total' => (int)$pdo->query("SELECT COUNT(*) FROM KhachHang")->fetchColumn(),
        'appointments_upcoming' => (int)$pdo->query("SELECT COUNT(*) FROM LichHen WHERE ngay_gio >= NOW() AND trang_thai IN ('pending','confirmed')")->fetchColumn(),
    ];

    $lowStock = $pdo->query(
        "SELECT ten_san_pham, ton_kho, gia FROM SanPham WHERE trang_thai = 'active' AND ton_kho <= 10 ORDER BY ton_kho ASC LIMIT 10"
    )->fetchAll();

    $topSelling = $pdo->query(
        "SELECT sp.ten_san_pham, SUM(ct.so_luong) AS da_ban, SUM(ct.so_luong * ct.don_gia) AS doanh_thu
         FROM ChiTietDonHang ct
         JOIN DonHang dh ON dh.ma_don_hang = ct.ma_don_hang AND dh.trang_thai <> 'cancelled'
         JOIN SanPham sp ON sp.ma_san_pham = ct.ma_san_pham
         GROUP BY sp.ma_san_pham
         ORDER BY da_ban DESC LIMIT 5"
    )->fetchAll();

    $lowText = $lowStock
        ? implode("\n", array_map(static fn($p) => "- {$p['ten_san_pham']}: còn {$p['ton_kho']} món (" . format_vnd($p['gia']) . ")", $lowStock))
        : 'Không có sản phẩm nào dưới 10 món.';

    $topText = $topSelling
        ? implode("\n", array_map(static fn($p) => "- {$p['ten_san_pham']}: đã bán {$p['da_ban']} món (" . format_vnd($p['doanh_thu']) . ")", $topSelling))
        : 'Chưa có dữ liệu bán hàng.';

    $systemPrompt = <<<PROMPT
Bạn là Pawly AI Quản trị — trợ lý phân tích dữ liệu vận hành cho cửa hàng thú cưng "Góc nhỏ có em".
Quy tắc an toàn:
1. Chỉ phân tích và đề xuất dựa trên SỐ LIỆU THẬT bên dưới. Không tự sửa đơn hàng, giá hay tồn kho.
2. Trả lời rõ ràng, ngắn gọn, có gạch đầu dòng dễ đọc.
3. Có thể giúp nhân viên soạn mô tả sản phẩm hoặc tin nhắn chăm sóc khách hàng mẫu.

SỐ LIỆU THỰC TẾ HIỆN TẠI:
- Tổng đơn hàng: {$stats['orders_total']} (Trong tháng này: {$stats['orders_month']} đơn)
- Chờ xử lý: {$stats['orders_pending']} | Đang giao: {$stats['orders_shipping']} | Hoàn thành: {$stats['orders_done']}
- Doanh thu đơn hoàn thành: {$stats['revenue_done']} VND | Doanh thu tháng này (trừ đơn hủy): {$stats['revenue_month']} VND
- Tổng khách hàng: {$stats['customers_total']} | Lịch hẹn Spa sắp tới: {$stats['appointments_upcoming']}

SẢN PHẨM BÁN CHẠY:
{$topText}

SẢN PHẨM SẮP HẾT HÀNG (<= 10):
{$lowText}
PROMPT;

    $ext = call_external_ai($systemPrompt, $history, $message);
    if ($ext['ok']) {
        $reply = $ext['reply'];
        $aiSource = $ext['source'];
    } else {
        if ($ext['reason'] !== 'not_configured') {
            $fallbackNotice = 'Dịch vụ AI trực tuyến tạm không phản hồi, đã sử dụng bộ phân tích số liệu trực tiếp từ MySQL.';
        }
        $reply = build_admin_fallback_reply($message, $stats, $lowStock, $topSelling);
    }
}

// Lưu tin nhắn vào MySQL
if ($saveHistory && $convId > 0) {
    $insMsg = $pdo->prepare('INSERT INTO TinNhanAI (ma_cuoc_hoi_thoai, vai_tro, noi_dung) VALUES (?, ?, ?)');
    $insMsg->execute([$convId, 'user', $message]);
    $insMsg->execute([$convId, 'assistant', $reply]);
}

json_response([
    'conversation_id' => $convId,
    'reply' => $reply,
    'recommended_products' => $recommendedProducts,
    'ai_source' => $aiSource,
    'fallback_notice' => $fallbackNotice,
]);

// ============================================================================
// HÀM HỖ TRỢ GỢI Ý SẢN PHẨM & FALLBACK DỰA TRÊN DỮ LIỆU THẬT TỪ MYSQL
// ============================================================================

function match_customer_products(string $question, array $products): array
{
    $q = normalize_vi($question);
    $wantsProduct = (bool)preg_match('/(san pham|mua|goi y|de xuat|thuc an|hat|pate|do choi|phu kien|sua tam|luoc|nem|vong co|banh|gia|duoi |cho meo|cho cho|cho cun|meo con|cho con|tai|cao mong)/', $q);
    if (!$wantsProduct) {
        return [];
    }

    $petFilter = null;
    if (preg_match('/\b(meo|miu|kitten|cat)\b/', $q)) {
        $petFilter = 'meo';
    } elseif (preg_match('/\b(cho|cun|puppy|dog|poodle|corgi)\b/', $q)) {
        $petFilter = 'cho';
    }

    $catFilter = null;
    if (preg_match('/(thuc an|hat|pate|banh|an|dinh duong|snack)/', $q)) {
        $catFilter = 'food';
    } elseif (preg_match('/(do choi|bong|can cau|cao mong|choi)/', $q)) {
        $catFilter = 'toy';
    } elseif (preg_match('/(sua tam|luoc|ve sinh|tai|cham soc|tam|long)/', $q)) {
        $catFilter = 'care';
    } elseif (preg_match('/(vong co|nem|phu kien|day dat|chuong|no)/', $q)) {
        $catFilter = 'accessory';
    }

    $maxBudget = null;
    if (preg_match('/duoi\s*(\d+)\s*(k|nghin|ngan|000)?/', $q, $m)) {
        $num = (int)$m[1];
        $maxBudget = $num < 1000 ? $num * 1000 : $num;
    }

    $scored = [];
    foreach ($products as $p) {
        if ((int)$p['ton_kho'] <= 0) {
            continue;
        }
        if ($maxBudget !== null && (float)$p['gia'] > $maxBudget) {
            continue;
        }
        $score = 1;
        if ($petFilter !== null) {
            if ($p['loai_thu_cung'] === $petFilter) {
                $score += 4;
            } elseif ($p['loai_thu_cung'] === 'ca_hai') {
                $score += 2;
            } else {
                continue;
            }
        }
        if ($catFilter !== null) {
            if ($p['danh_muc_slug'] === $catFilter) {
                $score += 4;
            } else {
                $score -= 1;
            }
        }
        $nameNorm = normalize_vi($p['ten_san_pham'] . ' ' . ($p['mo_ta'] ?? ''));
        foreach (preg_split('/\s+/', $q) ?: [] as $w) {
            if (strlen($w) >= 3 && str_contains($nameNorm, $w)) {
                $score += 2;
            }
        }
        if ($score > 1 || ($petFilter === null && $catFilter === null)) {
            $scored[] = ['score' => $score, 'item' => $p];
        }
    }

    usort($scored, static fn($a, $b) => $b['score'] <=> $a['score']);
    $top = array_slice($scored, 0, 3);
    return array_map(static fn($x) => [
        'ma_san_pham' => (int)$x['item']['ma_san_pham'],
        'ten_san_pham' => $x['item']['ten_san_pham'],
        'gia' => (float)$x['item']['gia'],
        'ton_kho' => (int)$x['item']['ton_kho'],
        'bieu_tuong' => $x['item']['bieu_tuong'],
        'anh_chinh' => $x['item']['anh_chinh'] ?? null,
        'ten_danh_muc' => $x['item']['ten_danh_muc'],
    ], $top);
}

function build_customer_fallback_reply(
    string $question,
    array $allInStock,
    array $matched,
    array $services,
    string $storeName,
    string $hotline,
    string $address
): string {
    $q = normalize_vi($question);

    // Kiểm tra dấu hiệu bệnh lý -> luôn khuyến nghị bác sĩ thú y
    if (preg_match('/(benh|bo an|non|oi|tieu chay|sot|ho|ngua|viem|chay mau|cap cuu|thuoc|dau)/', $q)) {
        return "🩺 Lưu ý sức khỏe thú cưng:\n"
            . "Với các biểu hiện bất thường như bỏ ăn, nôn ói, tiêu chảy, sốt hoặc viêm da, thông tin từ Pawly AI chỉ mang tính tham khảo chung — bạn nên đưa bé đến **bác sĩ thú y** gần nhất để được thăm khám chính xác nhé!\n\n"
            . "Trong thời gian theo dõi, hãy giữ ấm cho bé, chuẩn bị sẵn nước sạch và không tự ý dùng thuốc của người cho thú cưng.";
    }

    if (!empty($matched)) {
        $lines = array_map(
            static fn($p) => "• {$p['bieu_tuong']} {$p['ten_san_pham']} — " . format_vnd($p['gia']) . " (Còn {$p['ton_kho']} món)",
            $matched
        );
        return "🛍️ Dựa trên kho hàng hiện có tại **{$storeName}**, Pawly gợi ý cho bé nhà bạn:\n"
            . implode("\n", $lines)
            . "\n\nBạn có thể nhấn nút \"+ Thêm giỏ\" ngay bên dưới hoặc cho Pawly biết thêm tuổi và cân nặng của bé để tư vấn kỹ hơn nhé!";
    }

    if (preg_match('/(spa|dich vu|tam|cat tia|ve sinh|dat lich|mong|tiem phong|vac-xin|vacxin|vaccine)/', $q)) {
        $lines = array_map(
            static fn($s) => (float)$s['gia'] > 0
                ? "• {$s['bieu_tuong']} {$s['ten_dich_vu']}: " . format_vnd($s['gia']) . " ({$s['thoi_luong']} phút)"
                : "• {$s['bieu_tuong']} {$s['ten_dich_vu']} ({$s['thoi_luong']} phút)",
            $services
        );
        return "🛁 Các dịch vụ Spa & Tiêm phòng tại **{$storeName}**:\n"
            . implode("\n", $lines)
            . "\n\nBạn vào mục **Dịch vụ** → chọn dịch vụ cần đặt → nhập thông tin bé & khung giờ còn trống để đặt lịch ngay nhé!";
    }

    if (preg_match('/(dia chi|lien he|hotline|so dien thoai|chinh sach|doi tra|giao hang|thanh toan|mo cua)/', $q)) {
        return "🏪 Thông tin cửa hàng **{$storeName}**:\n"
            . "• Địa chỉ: {$address}\n"
            . "• Hotline hỗ trợ: {$hotline}\n"
            . "• Thanh toán: Hỗ trợ thanh toán khi nhận hàng (COD) và chuyển khoản ngân hàng.\n"
            . "• Theo dõi đơn hàng: Vào mục **Đơn của tôi** trên thanh menu để xem trạng thái chi tiết.";
    }

    if (preg_match('/(cham soc|meo|cho|cun|dinh duong|tam bao lau|tiem phong|nuoi|ve sinh)/', $q)) {
        return "🐾 Mẹo chăm sóc cơ bản cho bé cưng:\n"
            . "• Dinh dưỡng: Chọn hạt/pate đúng độ tuổi và loài (chó con, mèo con cần khẩu phần dễ tiêu), luôn có nước sạch mỗi ngày.\n"
            . "• Vệ sinh: Tắm định kỳ 1–2 tuần/lần bằng sữa tắm chuyên dụng cho thú cưng, chải lông đều đặn và vệ sinh tai nhẹ nhàng.\n"
            . "• Sức khỏe: Tẩy giun và tiêm phòng định kỳ theo lịch bác sĩ thú y.\n\n"
            . "💡 Bạn muốn Pawly gợi ý sản phẩm phù hợp cho chó hay mèo (và ngân sách khoảng bao nhiêu)?";
    }

    $top3 = array_slice($allInStock, 0, 3);
    $sampleList = implode("\n", array_map(
        static fn($p) => "• {$p['bieu_tuong']} {$p['ten_san_pham']} — " . format_vnd($p['gia']),
        $top3
    ));

    return "💗 Chào bạn đến với **{$storeName}**! Mình là Pawly AI.\n"
        . "Bạn có thể hỏi mình về:\n"
        . "• Gợi ý sản phẩm cho mèo / chó (ví dụ: \"Gợi ý đồ cho mèo dưới 200k\")\n"
        . "• Tư vấn dịch vụ spa & cách đặt lịch\n"
        . "• Mẹo chăm sóc dinh dưỡng, vệ sinh cơ bản\n\n"
        . ($sampleList ? "Một số sản phẩm đang sẵn hàng:\n{$sampleList}" : '');
}

function build_admin_fallback_reply(string $question, array $stats, array $lowStock, array $topSelling): string
{
    $q = normalize_vi($question);

    if (preg_match('/(ton kho|sap het|het hang|nhap hang|kho)/', $q)) {
        if (!$lowStock) {
            return "📦 Tình hình tồn kho đang rất ổn! Hiện không có sản phẩm nào dưới ngưỡng 10 món.";
        }
        $lines = array_map(static fn($p) => "• {$p['ten_san_pham']}: còn **{$p['ton_kho']}** món (" . format_vnd($p['gia']) . ")", $lowStock);
        return "⚠️ Cảnh báo tồn kho thấp (<= 10 món) từ dữ liệu MySQL:\n"
            . implode("\n", $lines)
            . "\n\n👉 Đề xuất: Ưu tiên nhập bổ sung các sản phẩm còn dưới 5 món để tránh gián đoạn đơn hàng.";
    }

    if (preg_match('/(ban chay|top|pho bien|hot)/', $q)) {
        if (!$topSelling) {
            return "📊 Hiện chưa có dữ liệu sản phẩm bán chạy từ các đơn hàng.";
        }
        $lines = array_map(static fn($p) => "• {$p['ten_san_pham']}: đã bán **{$p['da_ban']}** món — " . format_vnd($p['doanh_thu']), $topSelling);
        return "🏆 Top sản phẩm bán chạy nhất tại Góc nhỏ có em:\n" . implode("\n", $lines);
    }

    if (preg_match('/(mo ta|viet bai|noi dung|cham soc khach|tin nhan|quang cao)/', $q)) {
        return "✍️ Mẫu nội dung gợi ý cho nhân viên tham khảo:\n\n"
            . "1) Tin nhắn cảm ơn sau đơn hàng:\n"
            . "\"Góc nhỏ có em cảm ơn bạn đã tin tưởng chọn đồ cho bé cưng 🐾 Hy vọng bé sẽ thật thích món quà này! Nếu cần tư vấn thêm về dinh dưỡng hoặc đặt lịch Spa, bạn nhắn tụi mình bất cứ lúc nào nhé 💗\"\n\n"
            . "2) Cấu trúc mô tả sản phẩm chuẩn:\n"
            . "• Đối tượng sử dụng (chó/mèo, độ tuổi)\n"
            . "• Thành phần / chất liệu an toàn\n"
            . "• Công dụng nổi bật & hướng dẫn bảo quản.";
    }

    if (preg_match('/(don hang|doanh thu|thang|thong ke|bao cao|tong quan)/', $q)) {
        return "📊 Thống kê thực tế cửa hàng Góc nhỏ có em:\n"
            . "• Tổng số đơn hàng: **{$stats['orders_total']}** (Trong tháng này: **{$stats['orders_month']}** đơn)\n"
            . "• Chờ xử lý: **{$stats['orders_pending']}** | Đang giao: **{$stats['orders_shipping']}** | Hoàn thành: **{$stats['orders_done']}**\n"
            . "• Doanh thu đơn hoàn thành: **" . format_vnd($stats['revenue_done']) . "**\n"
            . "• Doanh thu tháng này (trừ đơn hủy): **" . format_vnd($stats['revenue_month']) . "**\n"
            . "• Khách hàng: **{$stats['customers_total']}** | Lịch hẹn Spa sắp tới: **{$stats['appointments_upcoming']}**";
    }

    return "✨ Pawly AI Quản trị sẵn sàng hỗ trợ! Bạn có thể hỏi các thống kê từ dữ liệu thật như:\n"
        . "• \"Sản phẩm nào sắp hết hàng?\"\n"
        . "• \"Tổng quan đơn hàng và doanh thu tháng này\"\n"
        . "• \"Top sản phẩm bán chạy nhất\"\n"
        . "• \"Đề xuất tin nhắn chăm sóc khách hàng\"\n\n"
        . "Tóm tắt nhanh: Hiện có **{$stats['orders_pending']}** đơn chờ xử lý, **" . count($lowStock) . "** sản phẩm tồn kho thấp và **{$stats['appointments_upcoming']}** lịch hẹn Spa sắp tới.";
}
