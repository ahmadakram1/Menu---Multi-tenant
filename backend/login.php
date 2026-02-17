<?php
// backend/login.php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/utils.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$input = json_input();
$email = $input['email'] ?? '';
$password = $input['password'] ?? '';

$config = require __DIR__ . '/config.php';

$stmt = $pdo->prepare('SELECT id, password FROM admins WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$admin = $stmt->fetch();

if ($admin && password_verify($password, $admin['password'])) {
    $payload = [
        'sub' => (int) $admin['id'],
        'role' => 'admin',
        'iss' => $config['jwt']['issuer'],
        'iat' => time(),
        'exp' => time() + $config['jwt']['ttl']
    ];
    $token = jwt_encode($payload, $config['jwt']['secret']);
    respond([
        'token' => $token,
        'user' => ['role' => 'admin']
    ]);
}

$stmt = $pdo->prepare(
    'SELECT id, restaurant_id, password, status, email_verified_at
     FROM merchant_accounts
     WHERE email = ?
     LIMIT 1'
);
$stmt->execute([$email]);
$account = $stmt->fetch();

if (!$account || !password_verify($password, $account['password'])) {
    respond(['error' => 'Invalid credentials'], 401);
}

$status = $account['status'] ?? 'pending_approval';
if ($status === 'pending_otp') {
    respond(['error' => 'Your registration is still pending review.'], 403);
}
if ($status === 'pending_approval') {
    respond(['error' => 'Your registration is under review. Approval takes 12 to 24 hours.'], 403);
}
if ($status === 'rejected') {
    respond(['error' => 'Your registration was rejected by admin.'], 403);
}

$payload = [
    'sub' => (int) $account['id'],
    'role' => 'owner',
    'restaurant_id' => (int) $account['restaurant_id'],
    'status' => $status,
    'iss' => $config['jwt']['issuer'],
    'iat' => time(),
    'exp' => time() + $config['jwt']['ttl']
];
$token = jwt_encode($payload, $config['jwt']['secret']);

respond([
    'token' => $token,
    'user' => [
        'role' => 'owner',
        'restaurant_id' => (int) $account['restaurant_id'],
        'status' => $status
    ]
]);
