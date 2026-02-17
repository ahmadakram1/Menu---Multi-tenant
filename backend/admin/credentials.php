<?php
// backend/admin/credentials.php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../utils.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$config = require __DIR__ . '/../config.php';
$payload = require_auth($config);
require_admin($payload);

function is_email_taken(PDO $pdo, string $email, string $target, int $excludeId): bool {
    if ($target === 'admin') {
        $stmt = $pdo->prepare('SELECT id FROM admins WHERE email = ? AND id <> ? LIMIT 1');
        $stmt->execute([$email, $excludeId]);
        if ($stmt->fetch()) {
            return true;
        }
        $merchantStmt = $pdo->prepare('SELECT id FROM merchant_accounts WHERE email = ? LIMIT 1');
        $merchantStmt->execute([$email]);
        return (bool) $merchantStmt->fetch();
    }

    $stmt = $pdo->prepare('SELECT id FROM merchant_accounts WHERE email = ? AND id <> ? LIMIT 1');
    $stmt->execute([$email, $excludeId]);
    if ($stmt->fetch()) {
        return true;
    }
    $adminStmt = $pdo->prepare('SELECT id FROM admins WHERE email = ? LIMIT 1');
    $adminStmt->execute([$email]);
    return (bool) $adminStmt->fetch();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $adminId = (int) ($payload['sub'] ?? 0);
    if ($adminId <= 0) {
        respond(['error' => 'Invalid admin context'], 403);
    }
    $stmt = $pdo->prepare('SELECT id, email FROM admins WHERE id = ? LIMIT 1');
    $stmt->execute([$adminId]);
    $admin = $stmt->fetch();
    if (!$admin) {
        respond(['error' => 'Admin not found'], 404);
    }
    respond(['admin' => $admin]);
}

if ($method === 'POST') {
    $input = json_input();
    $target = trim((string) ($input['target'] ?? ''));
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $password = (string) ($input['password'] ?? '');

    if (!in_array($target, ['admin', 'merchant'], true)) {
        respond(['error' => 'Invalid target'], 422);
    }

    if ($target === 'admin') {
        $adminId = (int) ($payload['sub'] ?? 0);
        if ($adminId <= 0) {
            respond(['error' => 'Invalid admin context'], 403);
        }

        $fields = [];
        $params = [];

        if ($email !== '') {
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                respond(['error' => 'Invalid email address'], 422);
            }
            if (is_email_taken($pdo, $email, 'admin', $adminId)) {
                respond(['error' => 'Email is already in use'], 409);
            }
            $fields[] = 'email = ?';
            $params[] = $email;
        }

        if ($password !== '') {
            if (strlen($password) < 6) {
                respond(['error' => 'Password must be at least 6 characters'], 422);
            }
            $fields[] = 'password = ?';
            $params[] = password_hash($password, PASSWORD_BCRYPT);
        }

        if (!$fields) {
            respond(['error' => 'Nothing to update'], 422);
        }

        $params[] = $adminId;
        $sql = 'UPDATE admins SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        respond(['success' => true]);
    }

    $accountId = (int) ($input['account_id'] ?? 0);
    if ($accountId <= 0) {
        respond(['error' => 'Missing account_id'], 422);
    }

    $accountStmt = $pdo->prepare('SELECT id FROM merchant_accounts WHERE id = ? LIMIT 1');
    $accountStmt->execute([$accountId]);
    $account = $accountStmt->fetch();
    if (!$account) {
        respond(['error' => 'Client account not found'], 404);
    }

    $fields = [];
    $params = [];

    if ($email !== '') {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(['error' => 'Invalid email address'], 422);
        }
        if (is_email_taken($pdo, $email, 'merchant', $accountId)) {
            respond(['error' => 'Email is already in use'], 409);
        }
        $fields[] = 'email = ?';
        $params[] = $email;
    }

    if ($password !== '') {
        if (strlen($password) < 6) {
            respond(['error' => 'Password must be at least 6 characters'], 422);
        }
        $fields[] = 'password = ?';
        $params[] = password_hash($password, PASSWORD_BCRYPT);
    }

    if (!$fields) {
        respond(['error' => 'Nothing to update'], 422);
    }

    $fields[] = 'updated_at = ?';
    $params[] = now_utc();
    $params[] = $accountId;
    $sql = 'UPDATE merchant_accounts SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
