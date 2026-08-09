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

test('public form collects address, supports other-area detail, uses the fixed tree pledge with sapling-care messaging, and accurately discloses Sheet access', () => {
  assert.equal(fs.existsSync(new URL('public/admin.html', root)), false);
  assert.equal(fs.existsSync(new URL('public/admin.js', root)), false);
  const publicHtml = fs.readFileSync(new URL('public/index.html', root), 'utf8');
  const publicJs = fs.readFileSync(new URL('public/app.js', root), 'utf8');

  assert.match(publicHtml, /name="addressDetail"[^>]*required[^>]*maxlength="220"/i);
  assert.match(publicHtml, /name="otherLocality"[^>]*maxlength="60"/i);
  assert.match(publicHtml, /I pledge to plant, nurture, and take care of one tree sapling delivered through this campaign\./i);
  assert.doesNotMatch(publicHtml, /id="pledge-options"|name="pledgeId"/i);
  assert.match(publicJs, /data\.get\('otherLocality'\)/);
  assert.match(publicJs, /localityId === 'other-madurai-area'/);
  assert.match(publicJs, /pledgeId:\s*'plant-tree'/);
  assert.match(publicHtml, /I consent to Young Indians storing my name, mobile number, address, locality for this campaign/i);
  assert.doesNotMatch(publicHtml, /tree pledge in the campaign Google Sheet/i);
  assert.match(publicHtml, /Anyone who obtains the campaign Google Sheet link can view submitted details/i);
  assert.doesNotMatch(publicHtml, /Your details stay private|mobile number will not be shown publicly/i);
});

test('public page links to separate terms and privacy pages, includes delivery messaging, and carries partner logos in the footer', () => {
  const publicHtml = fs.readFileSync(new URL('public/index.html', root), 'utf8');
  const termsHtml = fs.readFileSync(new URL('public/terms.html', root), 'utf8');
  const privacyHtml = fs.readFileSync(new URL('public/privacy.html', root), 'utf8');

  assert.doesNotMatch(publicHtml, /<section class="legal-section" id="terms"/i);
  assert.doesNotMatch(publicHtml, /<section class="legal-section" id="privacy"/i);
  assert.match(publicHtml, /href="\/terms\.html"/i);
  assert.match(publicHtml, /href="\/privacy\.html"/i);
  assert.match(publicHtml, /Young Indians will deliver a tree sapling to your home after your digital pledge/i);
  assert.match(publicHtml, /You are expected to nurture and care for the sapling/i);
  assert.match(publicHtml, /logo-strawlabs\.png/i);
  assert.match(publicHtml, /logo-cii\.png/i);
  assert.match(publicHtml, /logo-yi\.png/i);
  assert.match(publicHtml, /logo-yi-climate\.png/i);
  assert.match(termsHtml, /Terms &amp; Conditions|Terms and Conditions/i);
  assert.match(privacyHtml, /Privacy Policy/i);
  assert.match(termsHtml, /two-week Green Freedom 80 campaign/i);
  assert.match(privacyHtml, /public views show only aggregate counts and privacy-safe tree positions/i);
});

test('public page uses the expanded map experience, autoplay campaign journey, hero plant-growth motion, and simplified footer layout', () => {
  const publicHtml = fs.readFileSync(new URL('public/index.html', root), 'utf8');
  const publicJs = fs.readFileSync(new URL('public/app.js', root), 'utf8');
  const publicCss = fs.readFileSync(new URL('public/styles.css', root), 'utf8');

  assert.match(publicHtml, /id="participation-hotspots"/i);
  assert.match(publicHtml, /id="map-summary"/i);
  assert.match(publicHtml, /class="journey-section"/i);
  assert.match(publicHtml, /Mission to make Madurai green/i);
  assert.doesNotMatch(publicHtml, /Instead of static text alone, each step now becomes active as people scroll/i);
  assert.match(publicHtml, /class="hero-growth"/i);
  assert.match(publicHtml, /class="hero-growth-pot"/i);
  assert.match(publicHtml, /class="hero-growth-tree"/i);
  assert.match(publicHtml, /data-journey-step="register"/i);
  assert.match(publicHtml, /data-journey-step="delivery"/i);
  assert.match(publicHtml, /data-journey-step="nurture"/i);
  assert.match(publicHtml, /id="journey-progress"/i);
  assert.match(publicHtml, /id="journey-visual-title"/i);
  assert.match(publicJs, /function renderMapSummary\(/);
  assert.match(publicJs, /function renderParticipationHotspots\(/);
  assert.match(publicJs, /function startJourneyAutoplay\(/);
  assert.match(publicJs, /setInterval\(/);
  assert.doesNotMatch(publicJs, /function setupJourneyScroll\(/);
  assert.match(publicJs, /journeyProgress\.style\.setProperty\('--journey-progress'/);
  assert.match(publicJs, /journeyVisualTitle\.textContent = step\.dataset\.title/);
  assert.match(publicJs, /const localityCounts = countsByLocality\(\)/);
  assert.match(publicJs, /const activeCount = localityCounts\.get\(tree\.localityId\) \|\| 1/);
  assert.match(publicCss, /\.map-shell/);
  assert.match(publicCss, /\.journey-section/);
  assert.match(publicCss, /\.journey-step-card\.is-active/);
  assert.match(publicCss, /\.journey-visual/);
  assert.match(publicCss, /\.hero-growth/);
  assert.match(publicCss, /@keyframes heroTreeGrow/);
  assert.match(publicCss, /\.footer-logos/);
  assert.match(publicCss, /\.site-footer/);
  assert.doesNotMatch(publicCss, /\.logo-card/);
  assert.match(publicHtml, /©\s*Green Freedom 80/i);
});

test('certificate uses browser-held participant details without server identifiers', () => {
  const publicHtml = fs.readFileSync(new URL('public/index.html', root), 'utf8');
  const publicJs = fs.readFileSync(new URL('public/app.js', root), 'utf8');

  assert.doesNotMatch(publicJs, /result\.(?:certificateId|participant|submittedAt)/);
  assert.match(publicJs, /name:\s*String\(data\.get\('name'\)\)\.trim\(\)/);
  assert.match(publicJs, /locality:\s*localityName/);
  assert.doesNotMatch(publicHtml, /Certificate ID:/i);
  assert.doesNotMatch(publicJs, /Certificate ID:/i);
});

test('map labels include active localities so live trees are not visually misattributed to nearby static labels', () => {
  const publicJs = fs.readFileSync(new URL('public/app.js', root), 'utf8');

  assert.match(publicJs, /state\.dashboard\?\.areaParticipation/);
  assert.match(publicJs, /state\.trees\.map\(\(tree\) => tree\.localityId\)/);
  assert.match(publicJs, /featured\.add\(localityId\)/);
  assert.match(publicJs, /renderLabels\(\); renderDashboard\(dashboard\); renderMap\(state\.trees\);/);
});

test('new-tree animation preserves the SVG locality translation', () => {
  const css = fs.readFileSync(new URL('public/styles.css', root), 'utf8');
  assert.doesNotMatch(
    css,
    /@keyframes treePop\{from\{[^}]*transform:/,
    'CSS transform animation overrides the SVG transform attribute and moves a new tree to the map origin'
  );
});
