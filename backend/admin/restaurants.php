<?php
// backend/admin/restaurants.php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../utils.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$config = require __DIR__ . '/../config.php';
$payload = require_auth($config);
$isAdmin = is_admin($payload);
$ownerRestaurantId = isset($payload['restaurant_id']) ? (int) $payload['restaurant_id'] : null;

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if ($isAdmin) {
        $queryRestaurantId = isset($_GET['restaurant_id']) ? (int) $_GET['restaurant_id'] : 0;
        if ($queryRestaurantId > 0) {
            $stmt = $pdo->prepare('SELECT * FROM restaurants WHERE id = ?');
            $stmt->execute([$queryRestaurantId]);
            respond($stmt->fetchAll());
        }
        $stmt = $pdo->query('SELECT * FROM restaurants');
        respond($stmt->fetchAll());
    }

    if (!$ownerRestaurantId) {
        respond(['error' => 'Restaurant scope missing'], 403);
    }
    $stmt = $pdo->prepare('SELECT * FROM restaurants WHERE id = ?');
    $stmt->execute([$ownerRestaurantId]);
    respond($stmt->fetchAll());
}

if ($method === 'POST') {
    $input = $_POST ?: json_input();
    $isUpdate = isset($input['_method']) && strtoupper($input['_method']) === 'PUT';
    if (!$isAdmin && !$isUpdate) {
        respond(['error' => 'Only admin can create restaurants directly'], 403);
    }
    $uploadRestaurantId = null;
    if ($isUpdate) {
        $uploadRestaurantId = isset($input['id']) ? (int) $input['id'] : null;
        if (!$isAdmin && $ownerRestaurantId) {
            $uploadRestaurantId = $ownerRestaurantId;
        }
    }
    $logoSubdir = $uploadRestaurantId
        ? 'restaurant_' . (int) $uploadRestaurantId . '/branding'
        : 'shared/branding';
    $logo = save_upload($_FILES['logo'] ?? null, $config['uploads_dir'], $logoSubdir);

    if ($isUpdate) {
        $id = $input['id'] ?? null;
        if (!$isAdmin && $ownerRestaurantId) {
            $id = $ownerRestaurantId;
        }
        if (!$id) {
            respond(['error' => 'Missing id'], 400);
        }
        if ($logo) {
            $stmt = $pdo->prepare('UPDATE restaurants SET name_ar=?, name_en=?, logo=?, phone=?, whatsapp=?, instagram=?, theme_bg=?, theme_card=?, theme_text=?, theme_muted=?, theme_accent=?, theme_accent2=?, theme_border=?, font_family=? WHERE id=?');
            $stmt->execute([
                $input['name_ar'] ?? '',
                $input['name_en'] ?? '',
                $logo,
                $input['phone'] ?? '',
                $input['whatsapp'] ?? '',
                $input['instagram'] ?? '',
                $input['theme_bg'] ?? null,
                $input['theme_card'] ?? null,
                $input['theme_text'] ?? null,
                $input['theme_muted'] ?? null,
                $input['theme_accent'] ?? null,
                $input['theme_accent2'] ?? null,
                $input['theme_border'] ?? null,
                $input['font_family'] ?? null,
                $id
            ]);
        } else {
            $stmt = $pdo->prepare('UPDATE restaurants SET name_ar=?, name_en=?, phone=?, whatsapp=?, instagram=?, theme_bg=?, theme_card=?, theme_text=?, theme_muted=?, theme_accent=?, theme_accent2=?, theme_border=?, font_family=? WHERE id=?');
            $stmt->execute([
                $input['name_ar'] ?? '',
                $input['name_en'] ?? '',
                $input['phone'] ?? '',
                $input['whatsapp'] ?? '',
                $input['instagram'] ?? '',
                $input['theme_bg'] ?? null,
                $input['theme_card'] ?? null,
                $input['theme_text'] ?? null,
                $input['theme_muted'] ?? null,
                $input['theme_accent'] ?? null,
                $input['theme_accent2'] ?? null,
                $input['theme_border'] ?? null,
                $input['font_family'] ?? null,
                $id
            ]);
        }
        respond(['success' => true]);
    }

    $baseSlug = slugify((string) ($input['name_en'] ?? $input['name_ar'] ?? 'business'));
    $menuSlug = $baseSlug;
    $slugCounter = 1;
    while (true) {
        $slugStmt = $pdo->prepare('SELECT id FROM restaurants WHERE menu_slug = ? LIMIT 1');
        $slugStmt->execute([$menuSlug]);
        if (!$slugStmt->fetch()) {
            break;
        }
        $slugCounter += 1;
        $menuSlug = $baseSlug . '-' . $slugCounter;
    }

    $stmt = $pdo->prepare('INSERT INTO restaurants (name_ar, name_en, menu_slug, menu_enabled, logo, phone, whatsapp, instagram, theme_bg, theme_card, theme_text, theme_muted, theme_accent, theme_accent2, theme_border, font_family) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $input['name_ar'] ?? '',
        $input['name_en'] ?? '',
        $menuSlug,
        $logo,
        $input['phone'] ?? '',
        $input['whatsapp'] ?? '',
        $input['instagram'] ?? '',
        $input['theme_bg'] ?? null,
        $input['theme_card'] ?? null,
        $input['theme_text'] ?? null,
        $input['theme_muted'] ?? null,
        $input['theme_accent'] ?? null,
        $input['theme_accent2'] ?? null,
        $input['theme_border'] ?? null,
        $input['font_family'] ?? null
    ]);
    respond(['id' => $pdo->lastInsertId()]);
}

if ($method === 'PUT') {
    $input = json_input();
    $id = $input['id'] ?? null;
    if (!$isAdmin && $ownerRestaurantId) {
        $id = $ownerRestaurantId;
    }
    if (!$id) {
        respond(['error' => 'Missing id'], 400);
    }
    $stmt = $pdo->prepare('UPDATE restaurants SET name_ar=?, name_en=?, phone=?, whatsapp=?, instagram=?, theme_bg=?, theme_card=?, theme_text=?, theme_muted=?, theme_accent=?, theme_accent2=?, theme_border=?, font_family=? WHERE id=?');
    $stmt->execute([
        $input['name_ar'] ?? '',
        $input['name_en'] ?? '',
        $input['phone'] ?? '',
        $input['whatsapp'] ?? '',
        $input['instagram'] ?? '',
        $input['theme_bg'] ?? null,
        $input['theme_card'] ?? null,
        $input['theme_text'] ?? null,
        $input['theme_muted'] ?? null,
        $input['theme_accent'] ?? null,
        $input['theme_accent2'] ?? null,
        $input['theme_border'] ?? null,
        $input['font_family'] ?? null,
        $id
    ]);
    respond(['success' => true]);
}

if ($method === 'DELETE') {
    if (!$isAdmin) {
        respond(['error' => 'Only admin can delete restaurants'], 403);
    }
    $input = json_input();
    $id = $input['id'] ?? null;
    if (!$id) {
        respond(['error' => 'Missing id'], 400);
    }
    $stmt = $pdo->prepare('DELETE FROM restaurants WHERE id=?');
    $stmt->execute([$id]);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
