<?php
// backend/register.php
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
$restaurantName = trim((string) ($input['restaurant_name'] ?? ''));
$email = strtolower(trim((string) ($input['email'] ?? '')));
$phone = trim((string) ($input['phone'] ?? ''));
$password = (string) ($input['password'] ?? '');

if ($restaurantName === '' || $email === '' || $phone === '' || $password === '') {
    respond(['error' => 'Missing required fields'], 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(['error' => 'Invalid email address'], 422);
}

if (strlen($password) < 6) {
    respond(['error' => 'Password must be at least 6 characters'], 422);
}

$baseSlug = slugify($restaurantName);
$slugStmt = $pdo->prepare('SELECT id FROM restaurants WHERE menu_slug = ? LIMIT 1');
$slugStmt->execute([$baseSlug]);
if ($slugStmt->fetch()) {
    respond(['error' => 'This business name is already registered.'], 409);
}
$menuSlug = $baseSlug;

$existsStmt = $pdo->prepare('SELECT id FROM merchant_accounts WHERE email = ? LIMIT 1');
$existsStmt->execute([$email]);
if ($existsStmt->fetch()) {
    respond(['error' => 'This email is already registered and cannot submit another request.'], 409);
}

try {
    $pdo->beginTransaction();

    $restaurantStmt = $pdo->prepare(
        'INSERT INTO restaurants (name_ar, name_en, menu_slug, menu_enabled, phone, whatsapp, instagram)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $restaurantStmt->execute(['', 'pending-' . $menuSlug, $menuSlug, 1, $phone, $phone, '']);
    $restaurantId = (int) $pdo->lastInsertId();

    $accountStmt = $pdo->prepare(
        'INSERT INTO merchant_accounts (
            restaurant_id, email, phone, password, otp_code, otp_expires_at, status, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $now = now_utc();
    $accountStmt->execute([
        $restaurantId,
        $email,
        $phone,
        password_hash($password, PASSWORD_BCRYPT),
        null,
        null,
        'pending_approval',
        $now,
        $now
    ]);

    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(['error' => 'Registration failed'], 500);
}

$publicMessage = 'Your registration request has been received. Approval usually takes 12 to 24 hours.';
$emailSent = send_registration_received_email($config, $email, $restaurantName, $publicMessage);
$adminAlertSent = send_admin_registration_alert($config, $restaurantName, $email, $phone);
$response = [
    'success' => true,
    'message' => $publicMessage,
    'email_sent' => $emailSent,
    'admin_alert_sent' => $adminAlertSent
];

if (is_local_request() && !$emailSent) {
    $response['mail_notice'] = 'Local environment detected: configure SMTP to send real emails.';
}

respond($response);
