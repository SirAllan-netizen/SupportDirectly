<?php
declare(strict_types=1);

// Give-Directly blog API for PHP/XAMPP/Hostinger.
// Keeps admin authentication server-side and stores posts in data/stories.json.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_name('gd_admin');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $https,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

$ROOT = __DIR__;
$DATA_DIR = $ROOT . DIRECTORY_SEPARATOR . 'data';
$DATA_FILE = $DATA_DIR . DIRECTORY_SEPARATOR . 'stories.json';
$CONFIG_FILE = $DATA_DIR . DIRECTORY_SEPARATOR . 'admin-config.php';
$UPLOAD_DIR = $ROOT . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . 'stories';

if (!is_dir($DATA_DIR)) @mkdir($DATA_DIR, 0755, true);
if (!is_dir($UPLOAD_DIR)) @mkdir($UPLOAD_DIR, 0755, true);
if (!is_file($DATA_FILE)) @file_put_contents($DATA_FILE, "[]\n", LOCK_EX);

function respond(int $code, $data): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function json_body(int $maxBytes = 100000): array {
    $raw = file_get_contents('php://input');
    if ($raw === false) respond(400, ['error' => 'Could not read request.']);
    if (strlen($raw) > $maxBytes) respond(413, ['error' => 'Request is too large.']);
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) respond(400, ['error' => 'Invalid JSON request.']);
    return $data;
}

function load_config(string $file): ?array {
    if (!is_file($file)) return null;
    $cfg = require $file;
    return is_array($cfg) ? $cfg : null;
}

function require_admin(): void {
    if (empty($_SESSION['admin']) || $_SESSION['admin'] !== true) {
        respond(401, ['error' => 'Not signed in.']);
    }
}

function read_stories(string $file): array {
    if (!is_file($file)) return [];
    $raw = file_get_contents($file);
    if ($raw === false || trim($raw) === '') return [];
    $data = json_decode($raw, true);
    return is_array($data) ? array_values(array_filter($data, 'is_array')) : [];
}

function write_stories(string $file, array $stories): void {
    $json = json_encode(array_values($stories), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false) respond(500, ['error' => 'Could not encode post data.']);
    $tmp = $file . '.tmp';
    if (file_put_contents($tmp, $json . "\n", LOCK_EX) === false) {
        respond(500, ['error' => 'Could not save posts. Check write permissions on the data folder.']);
    }
    if (!@rename($tmp, $file)) {
        @unlink($tmp);
        respond(500, ['error' => 'Could not finish saving posts.']);
    }
}

function clean_text($value, int $max): string {
    $s = is_string($value) ? trim($value) : '';
    if (function_exists('mb_substr')) return mb_substr($s, 0, $max);
    return substr($s, 0, $max);
}

function normalize_story(array $x): array {
    if (empty($x['excerpt']) && !empty($x['update'])) $x['excerpt'] = $x['update'];
    if (empty($x['author'])) $x['author'] = 'Give-Directly Team';
    if (empty($x['category'])) $x['category'] = 'Community Stories';
    if (empty($x['status'])) $x['status'] = 'published';
    return $x;
}

function is_public_story(array $x): bool {
    $x = normalize_story($x);
    if (($x['status'] ?? 'published') !== 'published') return false;
    $t = strtotime((string)($x['date'] ?? ''));
    return $t !== false && $t <= time();
}

function clean_story(array $b, bool $requireConsent): array {
    $status = (($b['status'] ?? '') === 'draft') ? 'draft' : 'published';
    $story = [
        'title' => clean_text($b['title'] ?? '', 120),
        'excerpt' => clean_text($b['excerpt'] ?? ($b['update'] ?? ''), 320),
        'author' => clean_text($b['author'] ?? '', 80) ?: 'Give-Directly Team',
        'category' => clean_text($b['category'] ?? '', 60) ?: 'Community Stories',
        'location' => clean_text($b['location'] ?? '', 80),
        'date' => clean_text($b['date'] ?? '', 40),
        'image' => clean_text($b['image'] ?? '', 200),
        'body' => clean_text(str_replace("\r\n", "\n", (string)($b['body'] ?? '')), 30000),
        'status' => $status,
    ];
    if ($story['title'] === '') return ['error' => 'A post title is required.'];
    if (strlen($story['excerpt']) < 10) return ['error' => 'Add a short excerpt for the blog listing.'];
    if (strlen($story['body']) < 40) return ['error' => 'The article text is too short.'];
    $time = strtotime($story['date']);
    if ($time === false) return ['error' => 'A valid publication date is required.'];
    $story['date'] = gmdate('c', $time);
    if ($story['image'] !== '' && !preg_match('#^assets/images/stories/[A-Za-z0-9_-]+\.(jpg|png|webp)$#', $story['image'])) {
        return ['error' => 'Invalid photo path.'];
    }
    if ($requireConsent && (($b['consent'] ?? false) !== true)) return ['error' => 'Consent confirmation is required.'];
    return ['story' => $story];
}

function id12(): string {
    return bin2hex(random_bytes(6));
}

$action = $_GET['action'] ?? '';
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$config = load_config($CONFIG_FILE);

// Public endpoints
if ($action === 'stories' && $method === 'GET') {
    $list = array_map('normalize_story', read_stories($DATA_FILE));
    $list = array_values(array_filter($list, 'is_public_story'));
    usort($list, fn($a, $b) => strtotime((string)$b['date']) <=> strtotime((string)$a['date']));
    respond(200, $list);
}

if ($action === 'story' && $method === 'GET') {
    $id = preg_replace('/[^a-f0-9]/', '', (string)($_GET['id'] ?? ''));
    foreach (read_stories($DATA_FILE) as $x) {
        $x = normalize_story($x);
        if (($x['id'] ?? '') === $id && is_public_story($x)) respond(200, $x);
    }
    respond(404, ['error' => 'Story not found']);
}

// Admin session status is available even before setup.
if ($action === 'session' && $method === 'GET') {
    respond(200, [
        'admin' => !empty($_SESSION['admin']) && $_SESSION['admin'] === true,
        'needsSetup' => !$config || empty($config['password_hash']),
    ]);
}

if ($action === 'login' && $method === 'POST') {
    if (!$config || empty($config['password_hash'])) {
        respond(409, ['error' => 'Admin password has not been set yet. Open setup-admin.php first.']);
    }
    $now = time();
    $attempts = $_SESSION['login_attempts'] ?? ['count' => 0, 'reset' => $now + 600];
    if (($attempts['reset'] ?? 0) < $now) $attempts = ['count' => 0, 'reset' => $now + 600];
    if (($attempts['count'] ?? 0) >= 5) respond(429, ['error' => 'Too many attempts. Try again in a few minutes.']);
    $body = json_body(2000);
    if (password_verify((string)($body['password'] ?? ''), (string)$config['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        unset($_SESSION['login_attempts']);
        respond(200, ['ok' => true]);
    }
    $attempts['count'] = ($attempts['count'] ?? 0) + 1;
    $_SESSION['login_attempts'] = $attempts;
    respond(401, ['error' => 'Incorrect password.']);
}

require_admin();

if ($action === 'logout' && $method === 'POST') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'] ?? '', (bool)$p['secure'], (bool)$p['httponly']);
    }
    session_destroy();
    respond(200, ['ok' => true]);
}

if ($action === 'admin_stories' && $method === 'GET') {
    $list = array_map('normalize_story', read_stories($DATA_FILE));
    usort($list, fn($a, $b) => strtotime((string)$b['date']) <=> strtotime((string)$a['date']));
    respond(200, $list);
}

if ($action === 'create_story' && $method === 'POST') {
    $clean = clean_story(json_body(100000), true);
    if (isset($clean['error'])) respond(400, ['error' => $clean['error']]);
    $story = $clean['story'];
    $story['id'] = id12();
    $list = read_stories($DATA_FILE);
    $list[] = $story;
    write_stories($DATA_FILE, $list);
    respond(201, $story);
}

if ($action === 'update_story' && $method === 'POST') {
    $id = preg_replace('/[^a-f0-9]/', '', (string)($_GET['id'] ?? ''));
    $clean = clean_story(json_body(100000), false);
    if (isset($clean['error'])) respond(400, ['error' => $clean['error']]);
    $list = read_stories($DATA_FILE);
    foreach ($list as $i => $x) {
        if (($x['id'] ?? '') === $id) {
            $story = $clean['story'];
            $story['id'] = $id;
            $list[$i] = $story;
            write_stories($DATA_FILE, $list);
            respond(200, $story);
        }
    }
    respond(404, ['error' => 'Post not found.']);
}

if ($action === 'delete_story' && $method === 'POST') {
    $id = preg_replace('/[^a-f0-9]/', '', (string)($_GET['id'] ?? ''));
    $list = read_stories($DATA_FILE);
    $next = array_values(array_filter($list, fn($x) => ($x['id'] ?? '') !== $id));
    if (count($next) === count($list)) respond(404, ['error' => 'Post not found.']);
    write_stories($DATA_FILE, $next);
    respond(200, ['ok' => true]);
}

if ($action === 'upload' && $method === 'POST') {
    $body = json_body(8 * 1024 * 1024);
    $dataUrl = (string)($body['dataUrl'] ?? '');
    if (!preg_match('#^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$#', $dataUrl, $m)) {
        respond(400, ['error' => 'Use a JPG, PNG or WebP image.']);
    }
    $buf = base64_decode($m[2], true);
    if ($buf === false) respond(400, ['error' => 'Invalid image data.']);
    if (strlen($buf) > 5 * 1024 * 1024) respond(413, ['error' => 'Image must be under 5 MB.']);
    $info = @getimagesizefromstring($buf);
    if (!$info) respond(400, ['error' => "That file isn't a valid image."]);
    $mime = $info['mime'] ?? '';
    $extMap = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extMap[$mime])) respond(400, ['error' => 'Use a JPG, PNG or WebP image.']);
    $name = bin2hex(random_bytes(8)) . '.' . $extMap[$mime];
    if (file_put_contents($UPLOAD_DIR . DIRECTORY_SEPARATOR . $name, $buf, LOCK_EX) === false) {
        respond(500, ['error' => 'Could not save the image. Check write permissions on assets/images/stories.']);
    }
    respond(201, ['path' => 'assets/images/stories/' . $name]);
}

respond(404, ['error' => 'Not found']);
