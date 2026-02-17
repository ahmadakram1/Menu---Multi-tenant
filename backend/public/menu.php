<?php
// backend/public/menu.php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../utils.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$restaurantId = isset($_GET['restaurant_id']) ? (int) $_GET['restaurant_id'] : 0;
$restaurantSlug = slugify(trim((string) ($_GET['restaurant_slug'] ?? '')));

if ($restaurantId > 0) {
    $stmt = $pdo->prepare('SELECT * FROM restaurants WHERE id = ?');
    $stmt->execute([$restaurantId]);
} elseif ($restaurantSlug !== '') {
    $stmt = $pdo->prepare('SELECT * FROM restaurants WHERE LOWER(menu_slug) = LOWER(?)');
    $stmt->execute([$restaurantSlug]);
    $restaurant = $stmt->fetch();
    if (!$restaurant) {
        $fallbackStmt = $pdo->prepare(
            'SELECT * FROM restaurants
             WHERE LOWER(name_en) = LOWER(?) OR LOWER(name_ar) = LOWER(?)
             LIMIT 1'
        );
        $fallbackStmt->execute([$restaurantSlug, $restaurantSlug]);
        $restaurant = $fallbackStmt->fetch();
    }
} else {
    respond(['error' => 'Missing restaurant_id or restaurant_slug'], 400);
}

if (!isset($restaurant)) {
    $restaurant = $stmt->fetch();
}

if (!$restaurant) {
    respond(['error' => 'Restaurant not found'], 404);
}

$now = time();
$isEnabled = (int) ($restaurant['menu_enabled'] ?? 1) === 1;
$startAtRaw = (string) ($restaurant['access_start_at'] ?? '');
$endAtRaw = (string) ($restaurant['access_end_at'] ?? '');
$startAt = $startAtRaw !== '' ? strtotime($startAtRaw) : null;
$endAt = $endAtRaw !== '' ? strtotime($endAtRaw) : null;

if (!$isEnabled) {
    respond(['error' => 'This menu is currently unavailable.'], 403);
}
if ($startAt && $now < $startAt) {
    respond(['error' => 'This menu is not active yet.'], 403);
}
if ($endAt && $now > $endAt) {
    respond(['error' => 'This menu subscription has expired.'], 403);
}


$restaurantId = (int) $restaurant['id'];
$categoriesStmt = $pdo->prepare('SELECT * FROM categories WHERE restaurant_id = ?');
$categoriesStmt->execute([$restaurantId]);
$categories = $categoriesStmt->fetchAll();

$itemsStmt = $pdo->prepare('SELECT * FROM items WHERE restaurant_id = ?');
$itemsStmt->execute([$restaurantId]);
$items = $itemsStmt->fetchAll();

respond([
    'restaurant' => $restaurant,
    'categories' => $categories,
    'items' => $items
]);
