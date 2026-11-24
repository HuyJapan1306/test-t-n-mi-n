<?php
declare(strict_types=1);

/**
 * Cấu hình phân loại sản phẩm (Size, Màu sắc, Khối lượng, Hương vị, Dung tích...)
 * hiển thị cho khách hàng lựa chọn trước khi thêm sản phẩm vào giỏ hàng.
 */

function prod_opt_normalize(string $s): string
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

function get_product_options_schema(array $product): array
{
    $name = prod_opt_normalize((string)($product['ten_san_pham'] ?? ''));
    $slug = (string)($product['danh_muc_slug'] ?? '');

    // 1. Vòng cổ nơ pastel kèm chuông khắc tên
    if (str_contains($name, 'vong co')) {
        return [
            'groups' => [
                [
                    'key' => 'size',
                    'label' => 'Kích cỡ (Size)',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'S (1–4kg · cổ 18–26cm)', 'label' => 'Size S (1–4kg)'],
                        ['value' => 'M (4–8kg · cổ 26–36cm)', 'label' => 'Size M (4–8kg)'],
                        ['value' => 'L (8–15kg · cổ 36–48cm)', 'label' => 'Size L (8–15kg)'],
                    ],
                ],
                [
                    'key' => 'color',
                    'label' => 'Màu sắc',
                    'type' => 'color',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Hồng phấn', 'label' => 'Hồng phấn', 'hex' => '#f49ab8'],
                        ['value' => 'Kem sữa', 'label' => 'Kem sữa', 'hex' => '#f5e6d0'],
                        ['value' => 'Xanh pastel', 'label' => 'Xanh pastel', 'hex' => '#9ecae1'],
                        ['value' => 'Tím lavender', 'label' => 'Tím lavender', 'hex' => '#c7b8ea'],
                    ],
                ],
            ],
            'note_field' => [
                'label' => 'Nội dung khắc trên thẻ chuông (tùy chọn)',
                'placeholder' => 'Ví dụ: Bông · 0901 234 567',
            ],
        ];
    }

    // 2. Nệm tròn bông mềm donut
    if (str_contains($name, 'nem') || str_contains($name, 'donut') || str_contains($name, 'giuong')) {
        return [
            'groups' => [
                [
                    'key' => 'size',
                    'label' => 'Kích cỡ (Size)',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Size S (40cm · dưới 4kg)', 'label' => 'Size S (40cm)'],
                        ['value' => 'Size M (55cm · 4–9kg)', 'label' => 'Size M (55cm)'],
                        ['value' => 'Size L (70cm · 9–18kg)', 'label' => 'Size L (70cm)'],
                    ],
                ],
                [
                    'key' => 'color',
                    'label' => 'Màu sắc',
                    'type' => 'color',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Hồng phấn', 'label' => 'Hồng phấn', 'hex' => '#f49ab8'],
                        ['value' => 'Kem be', 'label' => 'Kem be', 'hex' => '#efe1cc'],
                        ['value' => 'Xám tro', 'label' => 'Xám tro', 'hex' => '#b8b4be'],
                        ['value' => 'Nâu sữa', 'label' => 'Nâu sữa', 'hex' => '#c9a98d'],
                    ],
                ],
            ],
        ];
    }

    // 3. Cần câu lông vũ gắn chuông cho mèo
    if (str_contains($name, 'can cau')) {
        return [
            'groups' => [
                [
                    'key' => 'color',
                    'label' => 'Màu sắc',
                    'type' => 'color',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Hồng pastel', 'label' => 'Hồng pastel', 'hex' => '#f49ab8'],
                        ['value' => 'Xanh mint', 'label' => 'Xanh mint', 'hex' => '#9ad9c5'],
                        ['value' => 'Vàng kem', 'label' => 'Vàng kem', 'hex' => '#f5d78c'],
                    ],
                ],
                [
                    'key' => 'style',
                    'label' => 'Kiểu đầu đồ chơi',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Lông vũ + chuông', 'label' => 'Lông vũ + chuông'],
                        ['value' => 'Chuột bông + chuông', 'label' => 'Chuột bông + chuông'],
                        ['value' => 'Bướm lấp lánh', 'label' => 'Bướm lấp lánh'],
                    ],
                ],
            ],
        ];
    }

    // 4. Bóng cao su đàn hồi nhồi thưởng cho cún
    if (str_contains($name, 'bong cao su') || str_contains($name, 'qua bong')) {
        return [
            'groups' => [
                [
                    'key' => 'size',
                    'label' => 'Kích cỡ (Size)',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Size S (5cm · cún nhỏ)', 'label' => 'Size S (5cm)'],
                        ['value' => 'Size M (7cm · cún vừa)', 'label' => 'Size M (7cm)'],
                        ['value' => 'Size L (9cm · cún lớn)', 'label' => 'Size L (9cm)'],
                    ],
                ],
                [
                    'key' => 'color',
                    'label' => 'Màu sắc',
                    'type' => 'color',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Hồng san hô', 'label' => 'Hồng san hô', 'hex' => '#f276a3'],
                        ['value' => 'Xanh dương', 'label' => 'Xanh dương', 'hex' => '#7db8e8'],
                        ['value' => 'Xanh mint', 'label' => 'Xanh mint', 'hex' => '#7ecba5'],
                    ],
                ],
            ],
        ];
    }

    // 5. Trụ cào móng bọc dây thừng sisal
    if (str_contains($name, 'tru cao mong')) {
        return [
            'groups' => [
                [
                    'key' => 'size',
                    'label' => 'Chiều cao trụ',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Size S (Cao 40cm)', 'label' => 'Size S (40cm)'],
                        ['value' => 'Size M (Cao 55cm)', 'label' => 'Size M (55cm)'],
                        ['value' => 'Size L (Cao 75cm)', 'label' => 'Size L (75cm)'],
                    ],
                ],
                [
                    'key' => 'color',
                    'label' => 'Màu đế lông',
                    'type' => 'color',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Kem sữa', 'label' => 'Kem sữa', 'hex' => '#efe1cc'],
                        ['value' => 'Hồng pastel', 'label' => 'Hồng pastel', 'hex' => '#f4a7c0'],
                        ['value' => 'Xám nhạt', 'label' => 'Xám nhạt', 'hex' => '#c6c2ca'],
                    ],
                ],
            ],
        ];
    }

    // 6. Hạt cho mèo / chó
    if (str_contains($name, 'hat ') || str_contains($name, 'royal canin')) {
        $isCat = (($product['loai_thu_cung'] ?? '') === 'meo') || str_contains($name, 'meo');
        return [
            'groups' => [
                [
                    'key' => 'weight',
                    'label' => 'Khối lượng túi',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => $isCat
                        ? [
                            ['value' => 'Túi 400g', 'label' => 'Túi 400g'],
                            ['value' => 'Túi 1.5kg', 'label' => 'Túi 1.5kg'],
                            ['value' => 'Bao 4kg', 'label' => 'Bao 4kg'],
                        ]
                        : [
                            ['value' => 'Túi 500g', 'label' => 'Túi 500g'],
                            ['value' => 'Túi 1.2kg', 'label' => 'Túi 1.2kg'],
                            ['value' => 'Túi 3kg', 'label' => 'Túi 3kg'],
                        ],
                ],
                [
                    'key' => 'formula',
                    'label' => $isCat ? 'Dòng hạt phù hợp' : 'Kích thước hạt',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => $isCat
                        ? [
                            ['value' => 'Mèo trong nhà (Indoor)', 'label' => 'Mèo trong nhà (Indoor)'],
                            ['value' => 'Dưỡng lông mượt (Hair & Skin)', 'label' => 'Dưỡng lông mượt'],
                            ['value' => 'Mèo kén ăn (Savour)', 'label' => 'Mèo kén ăn'],
                        ]
                        : [
                            ['value' => 'Hạt nhỏ (Poodle/Phốc/Mini)', 'label' => 'Hạt nhỏ (Mini)'],
                            ['value' => 'Hạt vừa (Corgi/Shiba)', 'label' => 'Hạt vừa (Medium)'],
                        ],
                ],
            ],
        ];
    }

    // 7. Pate
    if (str_contains($name, 'pate')) {
        return [
            'groups' => [
                [
                    'key' => 'flavor',
                    'label' => 'Hương vị',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Cá hồi & bí đỏ', 'label' => 'Cá hồi & bí đỏ'],
                        ['value' => 'Cá ngừ & tôm', 'label' => 'Cá ngừ & tôm'],
                        ['value' => 'Ức gà & phô mai', 'label' => 'Ức gà & phô mai'],
                    ],
                ],
                [
                    'key' => 'pack',
                    'label' => 'Quy cách đóng gói',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Gói lẻ 85g', 'label' => 'Gói lẻ 85g'],
                        ['value' => 'Combo 5 gói', 'label' => 'Combo 5 gói'],
                        ['value' => 'Hộp 12 gói', 'label' => 'Hộp 12 gói'],
                    ],
                ],
            ],
        ];
    }

    // 8. Bánh thưởng gặm sạch răng
    if (str_contains($name, 'banh thuong') || str_contains($name, 'xuong gam')) {
        return [
            'groups' => [
                [
                    'key' => 'size',
                    'label' => 'Kích cỡ thanh gặm',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Size S (Cún dưới 5kg)', 'label' => 'Size S (< 5kg)'],
                        ['value' => 'Size M (Cún 5–12kg)', 'label' => 'Size M (5–12kg)'],
                        ['value' => 'Size L (Cún trên 12kg)', 'label' => 'Size L (> 12kg)'],
                    ],
                ],
                [
                    'key' => 'flavor',
                    'label' => 'Hương vị',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Bạc hà thơm miệng', 'label' => 'Bạc hà'],
                        ['value' => 'Thịt bò & sữa', 'label' => 'Bò & sữa'],
                        ['value' => 'Trà xanh khử mùi', 'label' => 'Trà xanh'],
                    ],
                ],
            ],
        ];
    }

    // 9. Sữa tắm
    if (str_contains($name, 'sua tam')) {
        return [
            'groups' => [
                [
                    'key' => 'volume',
                    'label' => 'Dung tích chai',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Chai 250ml', 'label' => '250ml'],
                        ['value' => 'Chai 500ml', 'label' => '500ml'],
                        ['value' => 'Chai 1000ml', 'label' => '1000ml'],
                    ],
                ],
                [
                    'key' => 'scent',
                    'label' => 'Mùi hương / Công thức',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Yến mạch dịu nhẹ', 'label' => 'Yến mạch dịu nhẹ'],
                        ['value' => 'Hoa hồng phấn mềm lông', 'label' => 'Hoa hồng phấn'],
                        ['value' => 'Trà xanh khử mùi', 'label' => 'Trà xanh'],
                    ],
                ],
            ],
        ];
    }

    // 10. Lược chải lông
    if (str_contains($name, 'luoc chai')) {
        return [
            'groups' => [
                [
                    'key' => 'size',
                    'label' => 'Kích cỡ đầu lược',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Size S (Mèo & cún nhỏ)', 'label' => 'Size S (Nhỏ)'],
                        ['value' => 'Size M (Lông dày / cún vừa)', 'label' => 'Size M (Vừa)'],
                    ],
                ],
                [
                    'key' => 'color',
                    'label' => 'Màu sắc',
                    'type' => 'color',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Hồng pastel', 'label' => 'Hồng pastel', 'hex' => '#f49ab8'],
                        ['value' => 'Xanh bạc hà', 'label' => 'Xanh bạc hà', 'hex' => '#9ad9c5'],
                        ['value' => 'Trắng kem', 'label' => 'Trắng kem', 'hex' => '#f3ece4'],
                    ],
                ],
            ],
        ];
    }

    // 11. Dung dịch vệ sinh tai
    if (str_contains($name, 've sinh tai') || str_contains($name, 'dung dich')) {
        return [
            'groups' => [
                [
                    'key' => 'volume',
                    'label' => 'Dung tích',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Chai 60ml', 'label' => 'Chai 60ml'],
                        ['value' => 'Chai 120ml', 'label' => 'Chai 120ml'],
                    ],
                ],
                [
                    'key' => 'pet_target',
                    'label' => 'Phù hợp cho bé',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Dành cho Mèo', 'label' => 'Dành cho Mèo'],
                        ['value' => 'Dành cho Chó', 'label' => 'Dành cho Chó'],
                        ['value' => 'Dùng chung Chó & Mèo', 'label' => 'Chó & Mèo'],
                    ],
                ],
            ],
        ];
    }

    // Fallback theo danh mục cho các sản phẩm mới Admin thêm
    if ($slug === 'food') {
        return [
            'groups' => [
                [
                    'key' => 'weight',
                    'label' => 'Khối lượng / Quy cách',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Gói nhỏ', 'label' => 'Gói nhỏ'],
                        ['value' => 'Gói tiêu chuẩn', 'label' => 'Gói tiêu chuẩn'],
                        ['value' => 'Gói tiết kiệm lớn', 'label' => 'Gói lớn'],
                    ],
                ],
                [
                    'key' => 'flavor',
                    'label' => 'Hương vị',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Vị Gà', 'label' => 'Vị Gà'],
                        ['value' => 'Vị Cá hồi', 'label' => 'Vị Cá hồi'],
                        ['value' => 'Vị Bò & rau củ', 'label' => 'Vị Bò & rau củ'],
                    ],
                ],
            ],
        ];
    }

    if ($slug === 'care') {
        return [
            'groups' => [
                [
                    'key' => 'size',
                    'label' => 'Kích cỡ / Dung tích',
                    'type' => 'pill',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Size S / Nhỏ', 'label' => 'Nhỏ (S)'],
                        ['value' => 'Size M / Tiêu chuẩn', 'label' => 'Tiêu chuẩn (M)'],
                        ['value' => 'Size L / Lớn', 'label' => 'Lớn (L)'],
                    ],
                ],
                [
                    'key' => 'color',
                    'label' => 'Phân loại / Màu sắc',
                    'type' => 'color',
                    'required' => true,
                    'choices' => [
                        ['value' => 'Hồng pastel', 'label' => 'Hồng pastel', 'hex' => '#f49ab8'],
                        ['value' => 'Xanh mint', 'label' => 'Xanh mint', 'hex' => '#9ad9c5'],
                        ['value' => 'Trắng kem', 'label' => 'Trắng kem', 'hex' => '#f3ece4'],
                    ],
                ],
            ],
        ];
    }

    // Mặc định (accessory / toy / khác): Size + Màu sắc
    return [
        'groups' => [
            [
                'key' => 'size',
                'label' => 'Kích cỡ (Size)',
                'type' => 'pill',
                'required' => true,
                'choices' => [
                    ['value' => 'Size S', 'label' => 'Size S'],
                    ['value' => 'Size M', 'label' => 'Size M'],
                    ['value' => 'Size L', 'label' => 'Size L'],
                ],
            ],
            [
                'key' => 'color',
                'label' => 'Màu sắc',
                'type' => 'color',
                'required' => true,
                'choices' => [
                    ['value' => 'Hồng phấn', 'label' => 'Hồng phấn', 'hex' => '#f49ab8'],
                    ['value' => 'Kem sữa', 'label' => 'Kem sữa', 'hex' => '#f5e6d0'],
                    ['value' => 'Xanh pastel', 'label' => 'Xanh pastel', 'hex' => '#9ecae1'],
                ],
            ],
        ],
    ];
}
