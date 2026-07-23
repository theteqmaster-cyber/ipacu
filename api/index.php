<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($uri === '/api/seed' || $uri === '/api/seed/') {
    echo json_encode([
        'status' => 'success',
        'seed' => rand(100000, 999999),
        'grid_dimensions' => ['width' => 19, 'height' => 13],
        'specter_count' => 3,
        'timestamp' => time()
    ]);
    exit;
}

if ($uri === '/api/validate-score' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $score = $input['score'] ?? 0;
    $timeSeconds = $input['timeSeconds'] ?? 1;

    // Validate score rate (max theoretical points per second = 5000)
    $isValid = ($score / max(1, $timeSeconds)) <= 5000;

    echo json_encode([
        'status' => $isValid ? 'validated' : 'rejected',
        'score' => $score,
        'timestamp' => time()
    ]);
    exit;
}

if (($uri === '/api/groq' || $uri === '/api/groq/') && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $apiKey = getenv('VITE_GROQ_API_KEY') ?: getenv('GROQ_API_KEY');
    
    $fallbacks = [
        ['commentary' => "THE DEMON LORD SENSES YOUR PRESENCE IN THE LABYRINTH.", 'actionType' => null],
        ['commentary' => "HIGH KNIGHTS, DEFEND THE HOLY CHURCH AT ALL COSTS!", 'actionType' => 'SUMMON_MINION'],
        ['commentary' => "YOU MAY CAPTURE UNDEAD, HUNTER, BUT THE VOID AWAITS YOU.", 'actionType' => null],
        ['commentary' => "THE DARKNESS IN IPACU SURGES FOR YOUR XP!", 'actionType' => 'AURA_SURGE']
    ];

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$apiKey) {
        echo json_encode($fallbacks[array_rand($fallbacks)]);
        exit;
    }

    $prompt = $input['prompt'] ?? 'Give a 1-sentence dramatic taunt.';
    $model = getenv('VITE_GROQ_MODEL') ?: 'llama-3.3-70b-versatile';

    $ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . trim($apiKey),
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'model' => $model,
        'messages' => [
            ['role' => 'system', 'content' => 'You are the Demon Lord Puppet Master of Labyrinth Ipacu. Keep responses dramatic, concise, under 20 words, strictly no emojis.'],
            ['role' => 'user', 'content' => $prompt]
        ],
        'temperature' => 0.8,
        'max_tokens' => 60
    ]));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        $text = $data['choices'][0]['message']['content'] ?? "THE DEMON LORD WATCHES YOUR EVERY STEP IN THE DARKNESS.";
        $zone = $input['zone'] ?? '';
        $actionType = null;
        if ($zone === 'HOLY CHURCH (SAINT)' || $zone === 'DARK VOID (LORD GENERAL)') {
            $actionType = (rand(1, 10) > 4) ? 'SUMMON_MINION' : 'AURA_SURGE';
        }
        echo json_encode(['commentary' => trim($text), 'actionType' => $actionType]);
    } else {
        echo json_encode($fallbacks[array_rand($fallbacks)]);
    }
    exit;
}

echo json_encode([
    'status' => 'online',
    'app' => 'IPACU :: Tactical Specter Hunt PHP Backend',
    'version' => '1.0.0'
]);
