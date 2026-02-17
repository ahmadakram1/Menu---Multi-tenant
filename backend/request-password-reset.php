<?php
// backend/request-password-reset.php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/mailer.php';

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
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(['error' => 'Please enter a valid email'], 422);
}

$stmt = $pdo->prepare(
    'SELECT ma.id, ma.email, r.name_en, r.name_ar
     FROM merchant_accounts ma
     INNER JOIN restaurants r ON r.id = ma.restaurant_id
     WHERE ma.email = ?
     LIMIT 1'
);
$stmt->execute([$email]);
$account = $stmt->fetch();
if (!$account) {
    respond(['error' => 'Email not found'], 404);
}

$otp = random_otp(6);
$expiresAt = gmdate('Y-m-d H:i:s', time() + 300);
$updateStmt = $pdo->prepare(
    'UPDATE merchant_accounts
     SET otp_code = ?, otp_expires_at = ?, updated_at = ?
     WHERE id = ?'
);
$updateStmt->execute([$otp, $expiresAt, now_utc(), (int) $account['id']]);

$businessName = trim((string) ($account['name_en'] ?? '')) !== ''
    ? (string) $account['name_en']
    : (string) ($account['name_ar'] ?? '');
$sent = send_password_reset_otp_email($config, $email, $businessName, $otp, 5);

respond([
    'success' => true,
    'email_sent' => $sent,
    'expires_in' => 300,
    'message' => 'OTP sent. It expires in 5 minutes.'
]);
