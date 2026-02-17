<?php
// backend/reset-password.php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['error' => 'Method not allowed'], 405);
}

$input = json_input();
$email = strtolower(trim((string) ($input['email'] ?? '')));
$otp = trim((string) ($input['otp'] ?? ''));
$password = (string) ($input['password'] ?? '');

if ($email === '' || $otp === '' || $password === '') {
    respond(['error' => 'Missing required fields'], 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(['error' => 'Invalid email'], 422);
}
if (strlen($password) < 6) {
    respond(['error' => 'Password must be at least 6 characters'], 422);
}

$stmt = $pdo->prepare(
    'SELECT id, otp_code, otp_expires_at
     FROM merchant_accounts
     WHERE email = ?
     LIMIT 1'
);
$stmt->execute([$email]);
$account = $stmt->fetch();
if (!$account) {
    respond(['error' => 'Email not found'], 404);
}

$savedOtp = (string) ($account['otp_code'] ?? '');
$savedExpiry = (string) ($account['otp_expires_at'] ?? '');
if ($savedOtp === '' || $savedExpiry === '') {
    respond(['error' => 'No valid OTP found. Please request a new OTP.'], 422);
}

$nowTs = time();
$expiryTs = strtotime($savedExpiry . ' UTC');
if ($expiryTs === false || $expiryTs < $nowTs) {
    respond(['error' => 'OTP expired. Please request a new OTP.'], 422);
}
if (!hash_equals($savedOtp, $otp)) {
    respond(['error' => 'Invalid OTP code'], 422);
}

$update = $pdo->prepare(
    'UPDATE merchant_accounts
     SET password = ?, otp_code = NULL, otp_expires_at = NULL, updated_at = ?
     WHERE id = ?'
);
$update->execute([
    password_hash($password, PASSWORD_BCRYPT),
    now_utc(),
    (int) $account['id']
]);

respond(['success' => true, 'message' => 'Password reset successful']);
