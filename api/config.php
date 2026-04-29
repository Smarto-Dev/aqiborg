<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Token');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

define('CONFIG_FILE', __DIR__ . '/../data/config.json');
define('API_TOKEN',   'aqib-admin-2024');

function readConfig() {
    if (!file_exists(CONFIG_FILE)) {
        return ['default_resume' => '', 'hidden_resumes' => []];
    }
    $cfg = json_decode(file_get_contents(CONFIG_FILE), true);
    return is_array($cfg) ? $cfg : ['default_resume' => '', 'hidden_resumes' => []];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(readConfig());
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    if ($token !== API_TOKEN) {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    $cfg = json_decode(file_get_contents('php://input'), true);
    if (!is_array($cfg)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }
    $safe = [
        'default_resume' => isset($cfg['default_resume']) ? (string)$cfg['default_resume'] : '',
        'hidden_resumes' => isset($cfg['hidden_resumes']) && is_array($cfg['hidden_resumes'])
            ? array_values(array_map('strval', $cfg['hidden_resumes']))
            : [],
    ];
    $dir = dirname(CONFIG_FILE);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents(CONFIG_FILE, json_encode($safe, JSON_PRETTY_PRINT));
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
