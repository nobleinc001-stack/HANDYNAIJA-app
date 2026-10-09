/**
 * Boot guard — explains itself instead of showing a white screen.
 *
 * This is a CLASSIC script on purpose. Every other script on the page is an
 * ES module, and a module that fails to load takes the whole page with it,
 * silently. A classic script always runs, so it is the only thing that can
 * tell the user *why* nothing appeared.
 *
 * Two ways this app legitimately ends up blank:
 *
 *   1. Opened as a file (`file://...`). Browsers block `<script type="module">`
 *      over file:// because module fetches are CORS-checked and file:// has no
 *      origin. The app must be served over HTTP.
 *
 *   2. Served with `frontend/` as the web root. Modules under `frontend/js/`
 *      import `../../shared/constants.js`, which lives *outside* `frontend/`,
 *      so every page fails to resolve its constants.
 *
 * In both cases the module never runs, so this replaces the empty page with
 * the actual fix. It styles itself inline and stays out of the way entirely
 * once the app has booted.
 */
(function bootGuard() {
  'use strict';

  var doc = document.documentElement;

  /* Already booting — nothing to do. */
  if (doc.dataset.appBooted === 'true') return;

  var reason = '';
  var failures = [];

  function bail(headline, detail, commands) {
    if (doc.dataset.appGuardShown === 'true') return;
    doc.dataset.appGuardShown = 'true';

    var host = doc.querySelector('body');
    if (!host) return;

    host.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.setAttribute('role', 'alert');
    wrap.style.cssText = [
      'max-width:44rem',
      'margin:0 auto',
      'padding:2.5rem 1.5rem',
      'font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'color:#1c2321',
      'background:#fbfaf7'
    ].join(';');

    var badge = document.createElement('p');
    badge.textContent = 'HandyNaija';
    badge.style.cssText = 'margin:0 0 .35rem;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:#0b6e4f;font-weight:700';

    var title = document.createElement('h1');
    title.textContent = headline;
    title.style.cssText = 'margin:0 0 .75rem;font-size:1.6rem;line-height:1.25';

    var body = document.createElement('p');
    body.textContent = detail;
    body.style.cssText = 'margin:0 0 1.25rem;color:#4a5552';

    wrap.appendChild(badge);
    wrap.appendChild(title);
    wrap.appendChild(body);

    commands.forEach(function (line) {
      var pre = document.createElement('pre');
      pre.textContent = line;
      pre.style.cssText = 'margin:0 0 .5rem;padding:.75rem 1rem;overflow-x:auto;background:#0f1a17;color:#d8f3e6;border-radius:.5rem;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
      wrap.appendChild(pre);
    });

    if (failures.length) {
      var details = document.createElement('details');
      details.style.cssText = 'margin-top:1.25rem';

      var summary = document.createElement('summary');
      summary.textContent = 'Technical details';
      summary.style.cssText = 'cursor:pointer;font-weight:600;color:#0b6e4f';

      var list = document.createElement('ul');
      list.style.cssText = 'margin:.6rem 0 0;padding-left:1.2rem;color:#4a5552;font-size:.9rem';

      failures.forEach(function (message) {
        var item = document.createElement('li');
        item.textContent = message;
        list.appendChild(item);
      });

      details.appendChild(summary);
      details.appendChild(list);
      wrap.appendChild(details);
    }

    host.appendChild(wrap);
  }

  /* Case 1: opened straight off disk. Diagnose before waiting on a timer. */
  if (window.location.protocol === 'file:') {
    bail(
      'This page needs to be served over HTTP',
      'HandyNaija is built from native ES modules. Browsers refuse to load them from a file:// address because module requests are checked against CORS rules and a local file has no origin. Opening the HTML directly will always show a blank page — this is a browser rule, not a fault in the app.',
      [
        'From the project folder, run:',
        '  node serve.mjs',
        '',
        'Then open:',
        '  http://localhost:4173/'
      ]
    );
    return;
  }

  /* Collect module/network errors so the message is specific, not generic. */
  window.addEventListener('error', function (event) {
    var target = event && event.target;
    if (target && target !== window && target.src) {
      failures.push('Failed to load: ' + target.src);
    } else if (event && event.message) {
      failures.push(event.message);
    }
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event && event.reason;
    failures.push('Unhandled promise rejection: ' + (reason && reason.message ? reason.message : String(reason)));
  });

  /* Case 2: served, but the app never booted. */
  window.setTimeout(function () {
    if (doc.dataset.appBooted === 'true') return;

    var missing = failures.some(function (message) {
      return message.indexOf('shared/') !== -1;
    });

    if (missing) {
      bail(
        'Shared files could not be loaded',
        'The pages import constants and validators from the shared/ folder, which sits beside frontend/ rather than inside it. The server is almost certainly using frontend/ as its web root, so those imports resolve to a 404 and no page can start.',
        [
          'Serve the PROJECT ROOT, not the frontend folder:',
          '  node serve.mjs',
          '',
          'Then open:',
          '  http://localhost:4173/   (redirects to /frontend/)'
        ]
      );
      return;
    }

    if (reason) {
      bail('HandyNaija could not start', reason, ['Serve the project root:', '  node serve.mjs']);
    }
  }, 4000);
})();