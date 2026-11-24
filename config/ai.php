<?php
declare(strict_types=1);

/**
 * Cấu hình gọi AI phía máy chủ (KHÔNG BAO GIỜ đặt API key ở frontend HTML/JS).
 *
 * Bạn có thể cấu hình bằng biến môi trường hoặc tạo file `backend/config/ai.local.php`:
 * <?php
 * return [
 *     'provider' => 'gemini', // hoặc 'openai'
 *     'gemini_api_key' => 'AIza...',
 *     'gemini_model' => 'gemini-2.0-flash',
 *     'openai_api_key' => '',
 *     'openai_model' => 'gpt-4o-mini',
 * ];
 */
function get_ai_config(): array
{
    $localFile = __DIR__ . '/ai.local.php';
    $local = is_file($localFile) ? (require $localFile) : [];
    if (!is_array($local)) {
        $local = [];
    }

    $geminiKey = $local['gemini_api_key'] ?? (getenv('GEMINI_API_KEY') ?: '');
    $openaiKey = $local['openai_api_key'] ?? (getenv('OPENAI_API_KEY') ?: '');
    $provider = $local['provider'] ?? (getenv('AI_PROVIDER') ?: ($geminiKey ? 'gemini' : ($openaiKey ? 'openai' : 'local')));

    return [
        'provider' => $provider,
        'gemini_api_key' => (string)$geminiKey,
        'gemini_model' => (string)($local['gemini_model'] ?? (getenv('GEMINI_MODEL') ?: 'gemini-2.0-flash')),
        'openai_api_key' => (string)$openaiKey,
        'openai_model' => (string)($local['openai_model'] ?? (getenv('OPENAI_MODEL') ?: 'gpt-4o-mini')),
        'openai_base_url' => (string)($local['openai_base_url'] ?? (getenv('OPENAI_BASE_URL') ?: 'https://api.openai.com/v1/chat/completions')),
    ];
}

/**
 * Gọi dịch vụ AI ngoài (Gemini hoặc OpenAI) từ PHP server.
 * Luôn bắt lỗi an toàn để hệ thống tự động fallback nếu API lỗi hoặc chưa cấu hình key.
 */
function call_external_ai(string $systemPrompt, array $history, string $userMessage): array
{
    $cfg = get_ai_config();

    if (!function_exists('curl_init')) {
        return ['ok' => false, 'reason' => 'no_curl'];
    }

    if ($cfg['provider'] === 'gemini' && $cfg['gemini_api_key'] !== '') {
        $url = sprintf(
            'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
            rawurlencode($cfg['gemini_model']),
            rawurlencode($cfg['gemini_api_key'])
        );

        $contents = [];
        foreach (array_slice($history, -6) as $msg) {
            $contents[] = [
                'role' => $msg['vai_tro'] === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => (string)$msg['noi_dung']]],
            ];
        }
        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $userMessage]],
        ];

        $payload = [
            'systemInstruction' => [
                'parts' => [['text' => $systemPrompt]],
            ],
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => 0.5,
                'maxOutputTokens' => 700,
            ],
        ];

        $res = ai_http_post_json($url, $payload, []);
        if (!$res['ok']) {
            return $res;
        }

        $text = $res['data']['candidates'][0]['content']['parts'][0]['text'] ?? '';
        if (trim($text) === '') {
            return ['ok' => false, 'reason' => 'empty_response'];
        }
        return ['ok' => true, 'reply' => trim($text), 'source' => 'gemini'];
    }

    if ($cfg['provider'] === 'openai' && $cfg['openai_api_key'] !== '') {
        $messages = [['role' => 'system', 'content' => $systemPrompt]];
        foreach (array_slice($history, -6) as $msg) {
            $messages[] = [
                'role' => $msg['vai_tro'] === 'assistant' ? 'assistant' : 'user',
                'content' => (string)$msg['noi_dung'],
            ];
        }
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        $payload = [
            'model' => $cfg['openai_model'],
            'messages' => $messages,
            'temperature' => 0.5,
            'max_tokens' => 700,
        ];

        $res = ai_http_post_json($cfg['openai_base_url'], $payload, [
            'Authorization: Bearer ' . $cfg['openai_api_key'],
        ]);
        if (!$res['ok']) {
            return $res;
        }

        $text = $res['data']['choices'][0]['message']['content'] ?? '';
        if (trim($text) === '') {
            return ['ok' => false, 'reason' => 'empty_response'];
        }
        return ['ok' => true, 'reply' => trim($text), 'source' => 'openai'];
    }

    return ['ok' => false, 'reason' => 'not_configured'];
}

function ai_http_post_json(string $url, array $payload, array $extraHeaders): array
{
    $ch = curl_init($url);
    $headers = array_merge(['Content-Type: application/json'], $extraHeaders);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 12,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);

    $raw = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false || $err !== '') {
        return ['ok' => false, 'reason' => 'network_error', 'detail' => $err];
    }

    $data = json_decode($raw, true);
    if ($code < 200 || $code >= 300 || !is_array($data)) {
        return ['ok' => false, 'reason' => 'http_' . $code];
    }

    return ['ok' => true, 'data' => $data];
}
