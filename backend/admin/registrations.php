<?php
// backend/admin/registrations.php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../utils.php';
require_once __DIR__ . '/../mailer.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$config = require __DIR__ . '/../config.php';
$payload = require_auth($config);
require_admin($payload);

$method = $_SERVER['REQUEST_METHOD'];

function normalize_access_date(?string $value, bool $isEnd): ?string {
    if ($value === null) {
        return null;
    }
    $trimmed = trim($value);
    if ($trimmed === '') {
        return null;
    }

    if (preg_match('/^\d{4}-\d{2}$/', $trimmed) === 1) {
        [$yearRaw, $monthRaw] = explode('-', $trimmed);
        $year = (int) $yearRaw;
        $month = (int) $monthRaw;
        if ($year <= 0 || $month <= 0 || $month > 12) {
            return null;
        }
        if ($isEnd) {
            $lastDay = cal_days_in_month(CAL_GREGORIAN, $month, $year);
            return sprintf('%04d-%02d-%02d 23:59:59', $year, $month, $lastDay);
        }
        return sprintf('%04d-%02d-01 00:00:00', $year, $month);
    }

    return $trimmed;
}

if ($method === 'GET') {
    $stmt = $pdo->query(
        "SELECT
            ma.id,
            ma.restaurant_id,
            ma.email,
            ma.phone,
            ma.status,
            ma.email_verified_at,
            ma.created_at,
            r.name_ar,
            r.name_en,
            r.menu_slug,
            r.menu_enabled,
            r.access_start_at,
            r.access_end_at
         FROM merchant_accounts ma
         INNER JOIN restaurants r ON r.id = ma.restaurant_id
         ORDER BY ma.created_at DESC"
    );
    respond($stmt->fetchAll());
}

if ($method === 'POST') {
    $input = json_input();
    $accountId = (int) ($input['account_id'] ?? 0);
    $status = trim((string) ($input['status'] ?? ''));
    $emailTemplate = trim((string) ($input['email_template'] ?? 'bilingual'));
    $notifyMenuEmail = (bool) ($input['notify_menu_email'] ?? false);
    $menuEnabled = array_key_exists('menu_enabled', $input) ? (int) !!$input['menu_enabled'] : null;
    $accessStartAt = normalize_access_date(
        isset($input['access_start_at']) ? (string) $input['access_start_at'] : null,
        false
    );
    $accessEndAt = normalize_access_date(
        isset($input['access_end_at']) ? (string) $input['access_end_at'] : null,
        true
    );

    if ($accountId <= 0) {
        respond(['error' => 'Invalid payload'], 422);
    }

    if (!in_array($emailTemplate, ['bilingual', 'ar', 'en'], true)) {
        respond(['error' => 'Invalid email template'], 422);
    }

    $accountStmt = $pdo->prepare(
        'SELECT ma.restaurant_id, ma.email, r.name_ar, r.name_en, r.menu_slug, r.menu_enabled
         FROM merchant_accounts ma
         INNER JOIN restaurants r ON r.id = ma.restaurant_id
         WHERE ma.id = ?
         LIMIT 1'
    );
    $accountStmt->execute([$accountId]);
    $account = $accountStmt->fetch();
    if (!$account) {
        respond(['error' => 'Account not found'], 404);
    }

    $emailSent = null;
    if ($status !== '') {
        if (!in_array($status, ['approved', 'rejected'], true)) {
            respond(['error' => 'Invalid status'], 422);
        }
        $stmt = $pdo->prepare('UPDATE merchant_accounts SET status = ?, updated_at = ? WHERE id = ?');
        $stmt->execute([$status, now_utc(), $accountId]);

        if ($status === 'approved') {
            $stmt = $pdo->prepare('UPDATE restaurants SET menu_enabled = 1 WHERE id = ?');
            $stmt->execute([(int) $account['restaurant_id']]);
        } elseif ($status === 'rejected') {
            $stmt = $pdo->prepare('UPDATE restaurants SET menu_enabled = 0 WHERE id = ?');
            $stmt->execute([(int) $account['restaurant_id']]);
        }

        $businessName = trim((string) ($account['name_en'] ?? '')) !== ''
            ? (string) $account['name_en']
            : (string) ($account['name_ar'] ?? '');
        $menuSlug = (string) ($account['menu_slug'] ?? '');
        $menuUrl = $menuSlug !== '' ? 'http://localhost/Menu/' . $menuSlug : '';
        $emailSent = send_registration_decision_email(
            $config,
            (string) $account['email'],
            $businessName,
            $status,
            $emailTemplate,
            $menuUrl
        );
    }

    $previousMenuEnabled = (int) ($account['menu_enabled'] ?? 0);
    if ($menuEnabled !== null || $accessStartAt !== null || $accessEndAt !== null) {
        $stmt = $pdo->prepare(
            'UPDATE restaurants
             SET menu_enabled = COALESCE(?, menu_enabled),
                 access_start_at = ?,
                 access_end_at = ?
             WHERE id = ?'
        );
        $stmt->execute([
            $menuEnabled,
            $accessStartAt,
            $accessEndAt,
            (int) $account['restaurant_id']
        ]);

        $newMenuEnabled = $menuEnabled !== null ? (int) $menuEnabled : $previousMenuEnabled;
        $statusChangeRequest = $status !== '';
        if (!$statusChangeRequest && $menuEnabled !== null && $newMenuEnabled !== $previousMenuEnabled && $notifyMenuEmail) {
            $businessName = trim((string) ($account['name_en'] ?? '')) !== ''
                ? (string) $account['name_en']
                : (string) ($account['name_ar'] ?? '');
            $menuSlug = (string) ($account['menu_slug'] ?? '');
            $menuUrl = $menuSlug !== '' ? 'http://localhost/Menu/' . $menuSlug : '';
            $emailSent = send_menu_access_changed_email(
                $config,
                (string) $account['email'],
                $businessName,
                $newMenuEnabled === 1,
                $emailTemplate,
                $menuUrl
            );
        }
    }

    respond([
        'success' => true,
        'email_sent' => $emailSent
    ]);
}

respond(['error' => 'Method not allowed'], 405);
