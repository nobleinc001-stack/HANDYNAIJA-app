/**
 * Minimal static file server for the HandyNaija frontend.
 *
 * Two things make this necessary:
 *
 *  1. The app is plain HTML + native ES modules. Browsers refuse to load
 *     `<script type="module">` over `file://`, because module fetches are
 *     subject to CORS and `file://` has no origin to satisfy it. Opening a
 *     page by double-clicking it gives a blank white page.
 *
 *  2. The server MUST be rooted at the project root, not at `frontend/`.
 *     Modules under `frontend/js/` import `../../shared/constants.js`, which
 *     resolves *outside* `frontend/`. Rooting the server at `frontend/` makes
 *     every page fail to load its constants and renders nothing.
 *
 * Usage:
 *   node serve.mjs                 # serves the project root on :4173
 *   node serve.mjs 8080            # different port
 *
 * Then open http://localhost:4173/ (redirects to /frontend/).
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve(process.argv[2] ?? '.');
const PORT = Number(process.argv[3]) || 4173;
const APP = join(ROOT, 'frontend');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

const server = createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    send(res, 400, 'Bad request');
    return;
  }

  // Convenience: the site lives in frontend/, so send "/" there.
  if (pathname === '/') {
    res.writeHead(302, { location: '/frontend/' }).end();
    return;
  }

  if (pathname.endsWith('/')) pathname += 'index.html';

  // Contain every request inside ROOT.
  const target = resolve(join(ROOT, normalize(pathname)));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) {
    send(res, 403, 'Forbidden');
    return;
  }

  let stats;
  try {
    stats = statSync(target);
  } catch {
    send(res, 404, `Not found: ${pathname}`);
    return;
  }

  if (stats.isDirectory()) {
    res.writeHead(302, { location: `${pathname.replace(/\/?$/, '/')}index.html` }).end();
    return;
  }

  res.writeHead(200, {
    'content-type': TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'content-length': stats.size,
    // The app is developed live; stale modules are a confusing failure mode.
    'cache-control': 'no-cache',
  });
  createReadStream(target).pipe(res);
});

server.listen(PORT, () => {
  console.log(`HandyNaija  →  http://localhost:${PORT}/`);
  console.log(`serving project root: ${ROOT}`);
  console.log(`app root: ${APP}`);
});