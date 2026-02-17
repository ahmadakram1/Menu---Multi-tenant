<?php
// backend/admin/categories.php
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

function resolve_restaurant_id(array $payload, bool $isAdmin): ?int {
    if (!$isAdmin) {
        return isset($payload['restaurant_id']) ? (int) $payload['restaurant_id'] : null;
    }
    $queryRestaurantId = isset($_GET['restaurant_id']) ? (int) $_GET['restaurant_id'] : 0;
    if ($queryRestaurantId > 0) {
        return $queryRestaurantId;
    }
    return null;
}

if ($method === 'GET') {
    $restaurantId = resolve_restaurant_id($payload, $isAdmin);
    if ($restaurantId) {
        $stmt = $pdo->prepare('SELECT * FROM categories WHERE restaurant_id = ?');
        $stmt->execute([$restaurantId]);
        respond($stmt->fetchAll());
    }
    if ($isAdmin) {
        $stmt = $pdo->query('SELECT * FROM categories');
        respond($stmt->fetchAll());
    }
    respond(['error' => 'Restaurant scope missing'], 403);
}

if ($method === 'POST') {
    $input = $_POST ?: json_input();
    $isUpdate = isset($input['_method']) && strtoupper($input['_method']) === 'PUT';
    $restaurantId = $isAdmin
        ? ((int) ($input['restaurant_id'] ?? 0) ?: resolve_restaurant_id($payload, $isAdmin))
        : $ownerRestaurantId;

    if (!$restaurantId) {
        respond(['error' => 'Missing restaurant_id'], 422);
    }
    $image = save_upload(
        $_FILES['image'] ?? null,
        $config['uploads_dir'],
        'restaurant_' . (int) $restaurantId . '/categories'
    );

    if ($isUpdate) {
        $id = $input['id'] ?? null;
        if (!$id) {
            respond(['error' => 'Missing id'], 400);
        }
        if ($image) {
            $sql = 'UPDATE categories SET name_ar=?, name_en=?, description_ar=?, description_en=?, image=? WHERE id=?';
            if (!$isAdmin) {
                $sql .= ' AND restaurant_id=?';
            }
            $stmt = $pdo->prepare($sql);
            $params = [
                $input['name_ar'] ?? '',
                $input['name_en'] ?? '',
                $input['description_ar'] ?? '',
                $input['description_en'] ?? '',
                $image,
                $id
            ];
            if (!$isAdmin) {
                $params[] = $restaurantId;
            }
            $stmt->execute($params);
        } else {
            $sql = 'UPDATE categories SET name_ar=?, name_en=?, description_ar=?, description_en=? WHERE id=?';
            if (!$isAdmin) {
                $sql .= ' AND restaurant_id=?';
            }
            $stmt = $pdo->prepare($sql);
            $params = [
                $input['name_ar'] ?? '',
                $input['name_en'] ?? '',
                $input['description_ar'] ?? '',
                $input['description_en'] ?? '',
                $id
            ];
            if (!$isAdmin) {
                $params[] = $restaurantId;
            }
            $stmt->execute($params);
        }
        respond(['success' => true]);
    }

    $stmt = $pdo->prepare('INSERT INTO categories (restaurant_id, name_ar, name_en, description_ar, description_en, image) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $restaurantId,
        $input['name_ar'] ?? '',
        $input['name_en'] ?? '',
        $input['description_ar'] ?? '',
        $input['description_en'] ?? '',
        $image
    ]);
    respond(['id' => $pdo->lastInsertId()]);
}

if ($method === 'PUT') {
    $input = json_input();
    $id = $input['id'] ?? null;
    if (!$id) {
        respond(['error' => 'Missing id'], 400);
    }
    $sql = 'UPDATE categories SET name_ar=?, name_en=?, description_ar=?, description_en=? WHERE id=?';
    $params = [
        $input['name_ar'] ?? '',
        $input['name_en'] ?? '',
        $input['description_ar'] ?? '',
        $input['description_en'] ?? '',
        $id
    ];
    if (!$isAdmin && $ownerRestaurantId) {
        $sql .= ' AND restaurant_id=?';
        $params[] = $ownerRestaurantId;
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    respond(['success' => true]);
}

if ($method === 'DELETE') {
    $input = json_input();
    $id = $input['id'] ?? null;
    if (!$id) {
        respond(['error' => 'Missing id'], 400);
    }
    if ($isAdmin) {
        $stmt = $pdo->prepare('DELETE FROM categories WHERE id=?');
        $stmt->execute([$id]);
    } else {
        $stmt = $pdo->prepare('DELETE FROM categories WHERE id=? AND restaurant_id=?');
        $stmt->execute([$id, $ownerRestaurantId]);
    }
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
