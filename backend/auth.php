<?php
// backend/auth.php
require_once __DIR__ . '/jwt.php';

function require_auth($config) {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    $token = $matches[1];
    $payload = jwt_decode($token, $config['jwt']['secret']);
    if (!$payload || ($payload['exp'] ?? 0) < time()) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid token']);
        exit;
    }
    return $payload;
}

function require_admin(array $payload): void {
    if (($payload['role'] ?? '') !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Admin access required']);
        exit;
    }
}

function is_admin(array $payload): bool {
    return ($payload['role'] ?? '') === 'admin';
}
