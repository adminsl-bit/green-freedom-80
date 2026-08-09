const state = { config: null, dashboard: null, trees: [], latest: null };
const form = document.querySelector('#pledge-form');
const errorBox = document.querySelector('#form-error');
const dialog = document.querySelector('#success-dialog');
const treeStatus = document.querySelector('#tree-status');
const otherLocalityField = document.querySelector('#other-locality-field');
const journeySteps = [...document.querySelectorAll('[data-journey-step]')];
const journeyVisualTitle = document.querySelector('#journey-visual-title');
const journeyVisualCopy = document.querySelector('#journey-visual-copy');
const journeyProgressLabel = document.querySelector('#journey-progress-label');
const journeyScenes = [...document.querySelectorAll('.journey-scene')];

async function api(path, options) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
  return body;
}

function countsByLocality() {
  return state.trees.reduce((counts, tree) => {
    counts.set(tree.localityId, (counts.get(tree.localityId) || 0) + 1);
    return counts;
  }, new Map());
}

function summarizeActiveLocalities() {
  const configById = new Map((state.config?.localities || []).map((locality) => [locality.id, locality]));
  const counts = countsByLocality();
  return [...counts.entries()]
    .map(([localityId, count]) => ({ localityId, count, locality: configById.get(localityId) }))
    .filter((entry) => entry.locality)
    .sort((left, right) => right.count - left.count || left.locality.name.localeCompare(right.locality.name));
}

function renderMapSummary() {
  const summary = document.querySelector('#map-summary');
  if (!summary) return;
  const hotspots = summarizeActiveLocalities();
  if (!hotspots.length) {
    summary.textContent = 'Waiting for the first pledge to activate Madurai’s digital map.';
    return;
  }
  const top = hotspots[0];
  summary.textContent = `${hotspots.length} active localities are visible right now. ${top.locality.name} currently leads with ${top.count} digital ${top.count === 1 ? 'tree' : 'trees'}.`;
}

function renderLabels() {
  const labels = document.querySelector('#locality-labels');
  const participating = new Set();
  for (const localityId of state.dashboard?.areaParticipation?.map((area) => area.localityId) ?? []) {
    participating.add(localityId);
  }
  for (const localityId of state.trees.map((tree) => tree.localityId)) {
    participating.add(localityId);
  }
  labels.replaceChildren(...state.config.localities.filter((place) => participating.has(place.id)).map((place) => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'locality-label');
    text.setAttribute('x', place.x + 4.6);
    text.setAttribute('y', place.y + 1.1);
    text.textContent = place.name;
    return text;
  }));
}

function buildHotspotNode(tree, activeCount, isLatest = false) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'tree-hotspot');
  group.setAttribute('transform', `translate(${tree.x} ${tree.y})`);
  group.setAttribute('aria-hidden', 'true');

  const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  glow.setAttribute('class', `tree-glow${isLatest ? ' is-latest' : ''}`);
  glow.setAttribute('r', String(Math.min(7.6, 2.6 + activeCount * 0.45)));
  group.appendChild(glow);

  const radius = Math.min(3.4, 1.45 + activeCount * 0.14);
  const trunk = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  trunk.setAttribute('class', `tree-trunk${isLatest ? ' is-latest' : ''}`);
  trunk.setAttribute('x', String(-radius * 0.13));
  trunk.setAttribute('y', String(radius * 0.25));
  trunk.setAttribute('width', String(radius * 0.26));
  trunk.setAttribute('height', String(radius * 0.6));
  group.appendChild(trunk);

  const canopy = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  canopy.setAttribute('class', `tree-canopy${isLatest ? ' is-latest' : ''}`);
  for (const leaf of [
    { cx: 0, cy: -radius * 0.15, r: radius * 0.72 },
    { cx: -radius * 0.5, cy: radius * 0.05, r: radius * 0.55 },
    { cx: radius * 0.5, cy: radius * 0.05, r: radius * 0.55 }
  ]) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(leaf.cx));
    circle.setAttribute('cy', String(leaf.cy));
    circle.setAttribute('r', String(leaf.r));
    canopy.appendChild(circle);
  }
  group.appendChild(canopy);

  const badge = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  badge.setAttribute('class', 'tree-badge');
  badge.setAttribute('x', '-2.8');
  badge.setAttribute('y', '-8');
  badge.setAttribute('rx', '2');
  badge.setAttribute('ry', '2');
  badge.setAttribute('width', '5.6');
  badge.setAttribute('height', '3.7');
  group.appendChild(badge);

  const countText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  countText.setAttribute('class', 'tree-count');
  countText.setAttribute('x', '0');
  countText.setAttribute('y', '-6.13');
  countText.textContent = String(activeCount);
  group.appendChild(countText);

  return group;
}

function renderMap(trees, latest = state.latest) {
  const layer = document.querySelector('#trees-layer');
  const latestTree = latest?.tree;
  const nodes = [];
  const rendered = new Set();
  const localityCounts = countsByLocality();
  for (const tree of trees) {
    if (rendered.has(tree.localityId)) continue;
    rendered.add(tree.localityId);
    const activeCount = localityCounts.get(tree.localityId) || 1;
    const isLatest = latestTree?.localityId === tree.localityId;
    nodes.push(buildHotspotNode(tree, activeCount, isLatest));
  }
  if (latestTree && latest?.participant) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'tree-callout');
    text.setAttribute('x', Math.min(88, latestTree.x + 4.4));
    text.setAttribute('y', Math.max(8, latestTree.y - 5));
    text.textContent = `${latest.participant.locality} just grew`;
    nodes.push(text);
  }
  layer.replaceChildren(...nodes);
}

function renderTreeStatus() {
  if (!treeStatus) return;
  if (!state.latest?.participant) {
    treeStatus.textContent = 'Choose your locality and take the pledge to see your latest tree on the map.';
    return;
  }
  treeStatus.textContent = `${state.latest.participant.name} activated ${state.latest.participant.locality} on the digital map. Their locality hotspot will keep growing as more people from that area register.`;
}

function renderDashboard(dashboard) {
  state.dashboard = dashboard;
  renderLabels();
  document.querySelector('#total-pledges').textContent = dashboard.totalPledges.toLocaleString('en-IN');
  document.querySelector('#total-trees').textContent = dashboard.totalDigitalTrees.toLocaleString('en-IN');
  document.querySelector('#active-areas').textContent = dashboard.areaParticipation.length.toLocaleString('en-IN');
  document.querySelector('#top-area').textContent = dashboard.topLocalities[0]?.locality ?? 'Be first';
  renderMapSummary();
}

function populateForm() {
  const localitySelect = form.elements.localityId;
  for (const locality of state.config.localities) {
    localitySelect.add(new Option(locality.name, locality.id));
  }
}

function toggleOtherLocalityField() {
  const showingOther = form.elements.localityId.value === 'other-madurai-area';
  otherLocalityField.hidden = !showingOther;
  form.elements.otherLocality.required = showingOther;
  if (!showingOther) form.elements.otherLocality.value = '';
}

function drawCertificate(participant) {
  const canvas = document.querySelector('#certificate');
  const context = canvas.getContext('2d');
  const pledge = state.config.pledges.find((item) => item.id === participant.pledgeId);
  context.fillStyle = '#f7f3e8';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#173f2a';
  context.fillRect(0, 0, 38, canvas.height);
  context.fillStyle = '#79c56c';
  context.beginPath(); context.arc(1035, 115, 170, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#236241';
  context.beginPath(); context.arc(1115, 220, 120, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#b8ec86';
  context.font = '900 30px system-ui';
  context.fillText('GREEN FREEDOM 80', 90, 92);
  context.fillStyle = '#102a1c';
  context.font = '900 72px system-ui';
  context.fillText('I pledged for a', 90, 190);
  context.fillStyle = '#236241';
  context.fillText('Greener Madurai.', 90, 270);
  context.fillStyle = '#102a1c';
  context.font = '700 34px system-ui';
  context.fillText(participant.name, 90, 360);
  context.fillStyle = '#607266';
  context.font = '500 23px system-ui';
  const pledgeText = `${pledge?.icon ?? '🌱'} ${participant.pledge}`;
  const words = pledgeText.split(' ');
  let line = '', y = 414;
  for (const word of words) {
    const next = `${line}${word} `;
    if (context.measureText(next).width > 760 && line) { context.fillText(line, 90, y); line = `${word} `; y += 34; } else line = next;
  }
  context.fillText(line, 90, y);
  context.fillStyle = '#173f2a';
  context.font = '800 18px system-ui';
  context.fillText(`${participant.locality.toUpperCase()} · ${new Date(participant.submittedAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 90, 535);
  context.fillStyle = '#607266';
  context.font = '600 15px system-ui';
  context.fillText('PERSONALIZED DIGITAL TREE CERTIFICATE', 90, 575);
  context.fillStyle = '#173f2a';
  context.font = '900 52px system-ui';
  context.fillText('80', 1030, 145);
}

function certificateBlob() {
  return new Promise((resolve) => document.querySelector('#certificate').toBlob(resolve, 'image/png'));
}

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 2400);
}

function clearToast() {
  const element = document.querySelector('#toast');
  element.textContent = '';
  element.classList.remove('show');
}

function activateJourneyStep(step) {
  if (!step || !journeyVisualTitle || !journeyVisualCopy) return;
  journeySteps.forEach((card) => {
    const isActive = card === step;
    card.classList.toggle('is-active', isActive);
    card.setAttribute('aria-pressed', String(isActive));
  });
  journeyScenes.forEach((scene) => scene.classList.toggle('is-visible', scene.dataset.scene === step.dataset.journeyStep));
  journeyVisualTitle.textContent = step.dataset.title;
  journeyVisualCopy.textContent = step.dataset.copy;
  if (journeyProgressLabel) {
    journeyProgressLabel.textContent = `${step.dataset.accent} step active`;
  }
}

let journeyAutoplayTimer = null;
const JOURNEY_AUTOPLAY_INTERVAL = 3200;

function restartJourneyAutoplay() {
  if (!journeySteps.length) return;
  clearInterval(journeyAutoplayTimer);
  journeyAutoplayTimer = setInterval(() => {
    const currentIndex = journeySteps.findIndex((card) => card.classList.contains('is-active'));
    const nextIndex = (currentIndex + 1) % journeySteps.length;
    activateJourneyStep(journeySteps[nextIndex]);
  }, JOURNEY_AUTOPLAY_INTERVAL);
}

function selectJourneyStep(card) {
  activateJourneyStep(card);
  restartJourneyAutoplay();
}

function initJourneySteps() {
  if (!journeySteps.length) return;
  journeySteps.forEach((card) => {
    card.addEventListener('click', () => selectJourneyStep(card));
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      selectJourneyStep(card);
    });
  });
  activateJourneyStep(journeySteps.find((card) => card.classList.contains('is-active')) || journeySteps[0]);
  restartJourneyAutoplay();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  if (!form.reportValidity()) return;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.firstChild.textContent = 'Recording your pledge… ';
  const data = new FormData(form);
  try {
    const localityId = String(data.get('localityId') || '');
    const locality = state.config.localities.find((item) => item.id === localityId);
    const otherLocality = String(data.get('otherLocality') || '').trim().replace(/\s+/g, ' ');
    const addressDetail = String(data.get('addressDetail') || '').trim().replace(/\s+/g, ' ');
    const localityName = localityId === 'other-madurai-area' && otherLocality ? otherLocality : locality?.name;
    const storedAddressDetail = localityId === 'other-madurai-area' && otherLocality
      ? `${otherLocality} — ${addressDetail}`
      : addressDetail;
    if (localityId === 'other-madurai-area' && !otherLocality) {
      throw new Error('Please enter your area name if you choose Other Madurai area.');
    }
    if (storedAddressDetail.length > 220) {
      throw new Error('Please shorten the area name or address so the details fit within 220 characters.');
    }
    const result = await api('/api/pledges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'), phone: data.get('phone'), localityId,
        addressDetail: storedAddressDetail, pledgeId: 'plant-tree', consent: data.get('consent') === 'on',
        source: new URLSearchParams(location.search).get('utm_source') || 'direct'
      })
    });
    const pledge = state.config.pledges.find((item) => item.id === 'plant-tree');
    const participant = {
      name: String(data.get('name')).trim(),
      locality: localityName,
      pledgeId: pledge.id,
      pledge: pledge.text,
      submittedAt: new Date().toISOString()
    };
    const latestTree = { ...result.tree };
    state.latest = { participant, tree: latestTree };
    state.trees.push(latestTree);
    renderDashboard(result.impact);
    renderMap(state.trees);
    renderTreeStatus();
    drawCertificate(participant);
    document.querySelector('#certificate-id').textContent = 'Personalized digital tree certificate';
    dialog.showModal();
    form.reset();
    toggleOtherLocalityField();
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
    errorBox.focus();
  } finally {
    button.disabled = false;
    button.firstChild.textContent = 'Take My Pledge ';
  }
});

form.elements.localityId.addEventListener('change', toggleOtherLocalityField);
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
document.querySelector('#download-certificate').addEventListener('click', async () => {
  const blob = await certificateBlob();
  const link = document.createElement('a');
  link.download = 'green-freedom-80-certificate.png';
  link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href);
});
document.querySelector('#share-certificate').addEventListener('click', async () => {
  const blob = await certificateBlob();
  const file = new File([blob], 'green-freedom-80-certificate.png', { type: 'image/png' });
  const share = { title: 'Green Freedom 80', text: 'I pledged for a Greener Madurai under Green Freedom 80. Join me and let’s make Madurai greener together.', url: location.origin, files: [file] };
  try {
    if (navigator.canShare?.({ files: [file] })) await navigator.share(share);
    else if (navigator.share) await navigator.share({ title: share.title, text: share.text, url: share.url });
    else { await navigator.clipboard.writeText(`${share.text} ${share.url}`); toast('Share message copied'); }
  } catch (error) { if (error.name !== 'AbortError') toast('Download the certificate to share it'); }
});

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function buildHeroCanopy() {
  const group = document.querySelector('#hero-canopy-leaves');
  if (!group) return;
  const rand = seededRandom(42);
  const palette = ['#123322', '#1c4a2e', '#236241', '#2f7a4a', '#3f8a52', '#5aa752', '#79c56c'];
  const centerX = 120, centerY = 92, radiusX = 114, radiusY = 98;
  const leaves = [];
  for (let i = 0; i < 260; i += 1) {
    const angle = rand() * Math.PI * 2;
    const spread = Math.sqrt(rand());
    const x = centerX + Math.cos(angle) * radiusX * spread;
    const y = centerY + Math.sin(angle) * radiusY * spread;
    const sunBias = Math.max(0, Math.min(1, ((x - centerX) / radiusX + (centerY - y) / radiusY) / 2 + .5));
    const colorIndex = Math.min(palette.length - 1, Math.max(0, Math.round(sunBias * (palette.length - 1) + (rand() - .5) * 2)));
    leaves.push({
      x, y,
      rotation: Math.round(rand() * 360),
      scale: (0.55 + rand() * 0.65).toFixed(2),
      color: palette[colorIndex],
      delay: (rand() * 0.9).toFixed(2)
    });
  }
  group.replaceChildren(...leaves.map(({ x, y, rotation, scale, color, delay }) => {
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#heroLeafShape');
    use.setAttribute('fill', color);
    use.setAttribute('class', 'hero-leaf');
    use.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation}) scale(${scale})`);
    use.style.setProperty('--leaf-delay', `${delay}s`);
    return use;
  }));
}

async function init() {
  try {
    const [config, dashboard, trees] = await Promise.all([api('/api/config'), api('/api/dashboard'), api('/api/trees')]);
    state.config = config;
    state.trees = trees.trees;
    clearToast();
    populateForm();
    toggleOtherLocalityField();
    renderLabels(); renderDashboard(dashboard); renderMap(state.trees); renderTreeStatus();
  } catch {
    toast('Live impact is temporarily unavailable');
  }
}

buildHeroCanopy();
initJourneySteps();
init();
