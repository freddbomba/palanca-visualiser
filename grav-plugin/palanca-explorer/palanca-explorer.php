<?php
declare(strict_types=1);

namespace Grav\Plugin;

use Grav\Common\Plugin;
use RocketTheme\Toolbox\Event\Event;

/**
 * PalancaExplorerPlugin
 *
 * Adds a single POST endpoint:  /rete/save-snapshot
 *
 * Security:
 *   - Requires an active Grav session with the configured access key.
 *   - Requires the X-Requested-With: XMLHttpRequest header (CSRF guard).
 *   - Enforces a minimum interval between writes (rate limit).
 *   - Enforces a maximum payload size.
 *   - Validates JSON structure (must have nodes[] and edges[]).
 *   - Writes atomically via rename().
 */
class PalancaExplorerPlugin extends Plugin
{
    public static function getSubscribedEvents(): array
    {
        return [
            'onPluginsInitialized' => ['onPluginsInitialized', 0],
        ];
    }

    public function onPluginsInitialized(): void
    {
        // Never run in the Grav admin panel.
        if ($this->isAdmin()) {
            return;
        }

        $this->enable([
            'onPagesInitialized' => ['onPagesInitialized', 0],
        ]);
    }

    public function onPagesInitialized(Event $event): void
    {
        /** @var \Grav\Common\Uri $uri */
        $uri = $this->grav['uri'];

        if ($uri->path() !== '/rete/save-snapshot') {
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->sendJson(['error' => 'Method not allowed'], 405);
        }

        $this->handleSaveSnapshot();
    }

    // ── Request handler ───────────────────────────────────────────────

    private function handleSaveSnapshot(): void
    {
        // 1. CSRF guard — fetch() from our page sends this header; cross-site forms cannot.
        if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'XMLHttpRequest') {
            $this->sendJson(['error' => 'Forbidden'], 403);
        }

        // 2. Grav session authentication.
        /** @var \Grav\Common\User\Interfaces\UserInterface $user */
        $user = $this->grav['user'];
        if (!$user || !$user->authenticated) {
            $this->sendJson(['error' => 'Not authenticated'], 401);
        }

        $requiredAccess = $this->config->get(
            'plugins.palanca-explorer.required_access',
            'site.login'
        );
        if (!$user->authorize($requiredAccess)) {
            $this->sendJson(['error' => 'Forbidden'], 403);
        }

        // 3. Payload size check (Content-Length header, then actual body).
        $maxBytes = (int) $this->config->get(
            'plugins.palanca-explorer.max_payload_bytes',
            512000
        );
        $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > $maxBytes) {
            $this->sendJson(['error' => 'Payload too large'], 413);
        }

        $body = file_get_contents('php://input');
        if ($body === false || $body === '') {
            $this->sendJson(['error' => 'Empty body'], 400);
        }
        if (strlen($body) > $maxBytes) {
            $this->sendJson(['error' => 'Payload too large'], 413);
        }

        // 4. Validate JSON structure.
        $data = json_decode($body);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->sendJson(['error' => 'Invalid JSON: ' . json_last_error_msg()], 400);
        }
        if (!isset($data->nodes) || !is_array($data->nodes) ||
            !isset($data->edges) || !is_array($data->edges)) {
            $this->sendJson(['error' => 'Payload must contain nodes[] and edges[]'], 400);
        }

        // 5. Rate limit — check mtime of the existing snapshot file.
        $snapshotPath = $this->resolveSnapshotPath();
        $minInterval  = (int) $this->config->get(
            'plugins.palanca-explorer.min_write_interval',
            60
        );
        if (file_exists($snapshotPath)) {
            $age = time() - (int) filemtime($snapshotPath);
            if ($age < $minInterval) {
                $retryAfter = $minInterval - $age;
                header('Retry-After: ' . $retryAfter);
                $this->sendJson([
                    'error'       => 'Rate limited — wait ' . $retryAfter . 's before saving again',
                    'retry_after' => $retryAfter,
                ], 429);
            }
        }

        // 6. Atomic write: write to a temp file, then rename().
        $dir = dirname($snapshotPath);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            $this->sendJson(['error' => 'Cannot create snapshot directory'], 500);
        }

        $tmp     = $snapshotPath . '.tmp.' . getmypid();
        $written = file_put_contents(
            $tmp,
            json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );

        if ($written === false) {
            @unlink($tmp);
            $this->sendJson(['error' => 'Write failed — check file permissions on ' . $dir], 500);
        }

        if (!rename($tmp, $snapshotPath)) {
            @unlink($tmp);
            $this->sendJson(['error' => 'Atomic rename failed'], 500);
        }

        $this->sendJson([
            'ok'      => true,
            'bytes'   => $written,
            'nodes'   => count($data->nodes),
            'edges'   => count($data->edges),
            'savedAt' => date('c'),
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private function resolveSnapshotPath(): string
    {
        $configured = (string) $this->config->get(
            'plugins.palanca-explorer.snapshot_path',
            'rete/snapshot.json'
        );
        // Absolute path → use as-is.  Relative → relative to Grav root.
        if ($configured !== '' && $configured[0] === '/') {
            return $configured;
        }
        return rtrim(GRAV_ROOT, '/') . '/' . ltrim($configured, '/');
    }

    /** Send a JSON response and terminate. Never returns. */
    private function sendJson(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        header('X-Content-Type-Options: nosniff');
        echo json_encode($payload);
        exit;
    }
}
