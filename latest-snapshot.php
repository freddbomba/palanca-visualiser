<?php
// Serve the most recently modified palanca-network-*.json in this directory.
// Falls back to snapshot.json if no timestamped file exists.

$files = glob(__DIR__ . '/palanca-network-*.json') ?: [];

if ($files) {
    usort($files, fn($a, $b) => filemtime($b) - filemtime($a));
    $path = $files[0];
} else {
    $path = __DIR__ . '/snapshot.json';
}

if (!is_readable($path)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'No snapshot found']);
    exit;
}

header('Content-Type: application/json');
header('Cache-Control: no-store');
readfile($path);
