<?php
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');

$configFile = __DIR__ . '/data/nowpayments-config.php';
$paymentsFile = __DIR__ . '/data/crypto-payments.json';

function json_response(array $payload, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function load_config(string $file): array {
    if (!is_file($file)) return [];
    $cfg = require $file;
    return is_array($cfg) ? $cfg : [];
}

function current_base_url(): string {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    $scheme = $https ? 'https' : 'http';
    $host = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
    $dir = str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/crypto.php')));
    $dir = ($dir === '/' || $dir === '.') ? '' : rtrim($dir, '/');
    return $scheme . '://' . $host . $dir;
}

function is_public_url(string $url): bool {
    $host = strtolower((string)parse_url($url, PHP_URL_HOST));
    return $host !== '' && !in_array($host, ['localhost', '127.0.0.1', '::1'], true);
}

function np_request(string $method, string $endpoint, string $apiKey, ?array $body = null): array {
    if (!function_exists('curl_init')) {
        throw new RuntimeException('PHP cURL is not enabled. Enable the curl extension in PHP before using NOWPayments.');
    }
    $ch = curl_init('https://api.nowpayments.io/v1' . $endpoint);
    $headers = ['x-api-key: ' . $apiKey, 'Content-Type: application/json', 'Accept: application/json'];
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CONNECTTIMEOUT => 12,
        CURLOPT_TIMEOUT => 30,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_SLASHES));
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false) throw new RuntimeException('Could not connect to NOWPayments: ' . $err);
    $data = json_decode($raw, true);
    if (!is_array($data)) $data = ['raw' => $raw];
    if ($status < 200 || $status >= 300) {
        $message = (string)($data['message'] ?? $data['error'] ?? 'NOWPayments returned an error.');
        throw new RuntimeException($message);
    }
    return $data;
}

function sort_recursive(array &$value): void {
    ksort($value);
    foreach ($value as &$item) if (is_array($item)) sort_recursive($item);
}

function save_payment_event(string $file, array $event): void {
    $all = [];
    if (is_file($file)) {
        $decoded = json_decode((string)file_get_contents($file), true);
        if (is_array($decoded)) $all = $decoded;
    }
    $paymentId = (string)($event['payment_id'] ?? $event['invoice_id'] ?? $event['order_id'] ?? uniqid('event_', true));
    $all[$paymentId] = array_merge($all[$paymentId] ?? [], $event, ['updated_at' => gmdate('c')]);
    file_put_contents($file, json_encode($all, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

$action = (string)($_GET['action'] ?? '');
$config = load_config($configFile);

if ($action === 'ipn') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['ok' => false], 405);
    $secret = (string)($config['ipn_secret'] ?? '');
    if ($secret === '') json_response(['ok' => false], 503);
    $raw = (string)file_get_contents('php://input');
    $payload = json_decode($raw, true);
    if (!is_array($payload)) json_response(['ok' => false], 400);
    $received = strtolower(trim((string)($_SERVER['HTTP_X_NOWPAYMENTS_SIG'] ?? '')));
    $signed = $payload;
    sort_recursive($signed);
    $canonical = json_encode($signed, JSON_UNESCAPED_SLASHES);
    $expected = hash_hmac('sha512', $canonical, $secret);
    if ($received === '' || !hash_equals($expected, $received)) json_response(['ok' => false], 401);
    save_payment_event($paymentsFile, $payload);
    json_response(['ok' => true]);
}

if ($action !== 'create-invoice' || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'error' => 'Not found.'], 404);
}

$apiKey = (string)($config['api_key'] ?? '');
if ($apiKey === '') {
    json_response(['ok' => false, 'error' => 'Crypto payments are not configured yet. Open setup-payments.php first.'], 503);
}

if (session_status() !== PHP_SESSION_ACTIVE) session_start();
$last = (float)($_SESSION['crypto_invoice_at'] ?? 0);
if (microtime(true) - $last < 3) json_response(['ok' => false, 'error' => 'Please wait a moment before trying again.'], 429);
$_SESSION['crypto_invoice_at'] = microtime(true);

$input = json_decode((string)file_get_contents('php://input'), true);
$amount = is_array($input) ? (float)($input['amount'] ?? 0) : 0;
if ($amount < 1 || $amount > 10000) {
    json_response(['ok' => false, 'error' => 'Donation amount must be between $1 and $10,000.'], 422);
}

$configuredBase = rtrim((string)($config['public_url'] ?? ''), '/');
$base = $configuredBase !== '' ? $configuredBase : current_base_url();
$orderId = 'DON-' . gmdate('Ymd-His') . '-' . strtoupper(bin2hex(random_bytes(3)));
$payload = [
    'price_amount' => round($amount, 2),
    'price_currency' => 'usd',
    'order_id' => $orderId,
    'order_description' => 'Village Family Support donation',
    'success_url' => $base . '/index.html?crypto=success&order_id=' . rawurlencode($orderId),
    'cancel_url' => $base . '/index.html?crypto=cancel',
];
if (is_public_url($base)) $payload['ipn_callback_url'] = $base . '/crypto.php?action=ipn';

try {
    $invoice = np_request('POST', '/invoice', $apiKey, $payload);
    $invoiceUrl = (string)($invoice['invoice_url'] ?? '');
    if ($invoiceUrl === '') throw new RuntimeException('NOWPayments did not return an invoice URL.');
    save_payment_event($paymentsFile, [
        'order_id' => $orderId,
        'invoice_id' => $invoice['id'] ?? null,
        'price_amount' => round($amount, 2),
        'price_currency' => 'usd',
        'payment_status' => 'invoice_created',
        'created_at' => gmdate('c'),
    ]);
    json_response(['ok' => true, 'invoice_url' => $invoiceUrl, 'order_id' => $orderId]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => $e->getMessage()], 502);
}
