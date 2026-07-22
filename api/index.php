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

echo json_encode([
    'status' => 'online',
    'app' => 'IPACU :: Tactical Specter Hunt PHP Backend',
    'version' => '1.0.0'
]);
