import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import app from '../../backend/src/app.js';

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('health endpoint reports the API as available', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.service, 'handynaija-backend');
});

test('versioned API health endpoint is mounted', async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.status, 'ok');
});

test('CORS allows Vercel deployment and preview origins', async () => {
  const response = await fetch(`${baseUrl}/health`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://handynaija-git-preview-team.vercel.app',
      'Access-Control-Request-Method': 'GET',
    },
  });

  assert.equal(response.headers.get('access-control-allow-origin'), 'https://handynaija-git-preview-team.vercel.app');
});

test('CORS does not allow unrelated origins', async () => {
  const response = await fetch(`${baseUrl}/health`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://untrusted.example.com',
      'Access-Control-Request-Method': 'GET',
    },
  });

  assert.equal(response.headers.has('access-control-allow-origin'), false);
});
