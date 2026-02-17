<?php
// backend/utils.php
function json_input() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond($data, int $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function now_utc(): string {
    return gmdate('Y-m-d H:i:s');
}

function random_otp(int $length = 6): string {
    $min = (int) str_pad('1', $length, '0');
    $max = (int) str_pad('', $length, '9');
    return (string) random_int($min, $max);
}

function is_local_request(): bool {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    return stripos($host, 'localhost') !== false || stripos($host, '127.0.0.1') !== false;
}

function slugify(string $text): string {
    $value = trim($text);
    if ($value === '') {
        return 'business';
    }
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    $value = trim($value, '-');
    return $value !== '' ? $value : 'business';
}

function normalize_upload_subdir(?string $subdir): string {
    $raw = trim((string) $subdir);
    if ($raw === '') {
        return '';
    }
    $raw = str_replace('\\', '/', $raw);
    $parts = explode('/', $raw);
    $safeParts = [];
    foreach ($parts as $part) {
        $clean = preg_replace('/[^A-Za-z0-9_-]/', '', $part) ?? '';
        if ($clean !== '') {
            $safeParts[] = $clean;
        }
    }
    return implode('/', $safeParts);
}

function save_upload($file, $uploads_dir, ?string $subdir = null) {
    $normalizedSubdir = normalize_upload_subdir($subdir);
    $baseDir = rtrim($uploads_dir, '/\\');
    $targetDir = $normalizedSubdir !== ''
        ? $baseDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $normalizedSubdir)
        : $baseDir;

    if (!is_dir($targetDir)) {
        @mkdir($targetDir, 0777, true);
    }
    if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
        return null;
    }
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('img_', true) . ($ext !== '' ? '.' . $ext : '');
    $target = $targetDir . DIRECTORY_SEPARATOR . $filename;
    if (!move_uploaded_file($file['tmp_name'], $target)) {
        return null;
    }
    if ($normalizedSubdir === '') {
        return $filename;
    }
    return str_replace('\\', '/', $normalizedSubdir . '/' . $filename);
}
