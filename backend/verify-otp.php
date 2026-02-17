<?php
// backend/verify-otp.php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/jwt.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['error' => 'Method not allowed'], 405);
}

$config = require __DIR__ . '/config.php';

$input = json_input();
$email = strtolower(trim((string) ($input['email'] ?? '')));
$otp = trim((string) ($input['otp'] ?? ''));

if ($email === '' || $otp === '') {
    respond(['error' => 'Email and OTP are required'], 422);
}

$stmt = $pdo->prepare(
    'SELECT id, restaurant_id, status, otp_code, otp_expires_at
     FROM merchant_accounts
     WHERE email = ?
     LIMIT 1'
);
$stmt->execute([$email]);
$account = $stmt->fetch();

if (!$account) {
    respond(['error' => 'Account not found'], 404);
}

if (($account['status'] ?? '') !== 'pending_otp') {
    respond(['error' => 'OTP is already verified or account is not eligible.'], 409);
}

if (($account['otp_code'] ?? '') !== $otp) {
    respond(['error' => 'Invalid OTP'], 422);
}

$expiresAt = strtotime((string) ($account['otp_expires_at'] ?? ''));
if (!$expiresAt || $expiresAt < time()) {
    respond(['error' => 'OTP expired. Please register again.'], 422);
}

$updateStmt = $pdo->prepare(
    'UPDATE merchant_accounts
     SET otp_code = NULL,
         otp_expires_at = NULL,
         email_verified_at = ?,
         status = ?,
         updated_at = ?
     WHERE id = ?'
);
$now = now_utc();
$updateStmt->execute([$now, 'pending_approval', $now, $account['id']]);

$payload = [
    'sub' => (int) $account['id'],
    'role' => 'owner',
    'restaurant_id' => (int) $account['restaurant_id'],
    'status' => 'pending_approval',
    'iss' => $config['jwt']['issuer'],
    'iat' => time(),
    'exp' => time() + $config['jwt']['ttl']
];
$token = jwt_encode($payload, $config['jwt']['secret']);

respond([
    'success' => true,
    'message' => 'OTP verified. Waiting for admin approval.',
    'token' => $token,
    'user' => [
        'role' => 'owner',
        'restaurant_id' => (int) $account['restaurant_id'],
        'status' => 'pending_approval'
    ]
]);
