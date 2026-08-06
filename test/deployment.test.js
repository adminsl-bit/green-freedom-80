import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('Vercel routes the static campaign and same-origin API gateway', () => {
  const config = JSON.parse(fs.readFileSync(new URL('vercel.json', root), 'utf8'));

  assert.ok(config.rewrites.some((rule) => rule.source === '/api/:route' && rule.destination.includes('/api/gateway')));
  assert.ok(config.rewrites.some((rule) => rule.source === '/' && rule.destination === '/public/index.html'));
  assert.ok(config.headers.some((rule) => rule.source === '/api/(.*)' && rule.headers.some((header) => header.key === 'Cache-Control' && header.value === 'no-store')));

  const manifest = JSON.parse(fs.readFileSync(new URL('apps-script/appsscript.json', root), 'utf8'));
  assert.equal(manifest.timeZone, 'Asia/Kolkata');
  assert.equal(manifest.runtimeVersion, 'V8');
});

test('public form collects address, uses the fixed tree pledge, and accurately discloses Sheet access', () => {
  assert.equal(fs.existsSync(new URL('public/admin.html', root)), false);
  assert.equal(fs.existsSync(new URL('public/admin.js', root)), false);
  const publicHtml = fs.readFileSync(new URL('public/index.html', root), 'utf8');
  const publicJs = fs.readFileSync(new URL('public/app.js', root), 'utf8');

  assert.match(publicHtml, /name="addressDetail"[^>]*required[^>]*maxlength="220"/i);
  assert.match(publicHtml, /I pledge to plant and nurture one tree\./i);
  assert.doesNotMatch(publicHtml, /id="pledge-options"|name="pledgeId"/i);
  assert.match(publicJs, /addressDetail:\s*data\.get\('addressDetail'\)/);
  assert.match(publicJs, /pledgeId:\s*'plant-tree'/);
  assert.match(publicHtml, /anyone who obtains the Sheet link can view/i);
  assert.doesNotMatch(publicHtml, /Your details stay private|mobile number will not be shown publicly/i);
});

test('certificate uses browser-held participant details without server identifiers', () => {
  const publicHtml = fs.readFileSync(new URL('public/index.html', root), 'utf8');
  const publicJs = fs.readFileSync(new URL('public/app.js', root), 'utf8');

  assert.doesNotMatch(publicJs, /result\.(?:certificateId|participant|submittedAt)/);
  assert.match(publicJs, /name:\s*String\(data\.get\('name'\)\)\.trim\(\)/);
  assert.match(publicJs, /locality:\s*locality\.name/);
  assert.doesNotMatch(publicHtml, /Certificate ID:/i);
  assert.doesNotMatch(publicJs, /Certificate ID:/i);
});

test('new-tree animation preserves the SVG locality translation', () => {
  const css = fs.readFileSync(new URL('public/styles.css', root), 'utf8');
  assert.doesNotMatch(
    css,
    /@keyframes treePop\{from\{[^}]*transform:/,
    'CSS transform animation overrides the SVG transform attribute and moves a new tree to the map origin'
  );
});
