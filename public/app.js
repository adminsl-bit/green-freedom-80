const state = { config: null, dashboard: null, trees: [], latest: null };
const form = document.querySelector('#pledge-form');
const errorBox = document.querySelector('#form-error');
const dialog = document.querySelector('#success-dialog');

async function api(path, options) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
  return body;
}

function treeNode(tree, isNew = false) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', `tree-marker${isNew ? ' new' : ''}`);
  group.setAttribute('transform', `translate(${tree.x} ${tree.y})`);
  group.setAttribute('aria-hidden', 'true');
  group.innerHTML = '<line class="trunk" x1="0" y1="1" x2="0" y2="4"/><circle class="crown" cx="0" cy="0" r="2.15"/><circle class="crown" cx="-1.4" cy=".5" r="1.35"/><circle class="crown" cx="1.4" cy=".5" r="1.35"/>';
  return group;
}

function renderMap(trees, latestTree) {
  const layer = document.querySelector('#trees-layer');
  layer.replaceChildren(...trees.map((tree) => treeNode(tree, tree === latestTree)));
}

function renderLabels() {
  const labels = document.querySelector('#locality-labels');
  const featured = new Set(['anna-nagar', 'teppakulam', 'simmakkal', 'thirunagar', 'mattuthavani', 'avaniyapuram']);
  labels.replaceChildren(...state.config.localities.filter((place) => featured.has(place.id)).map((place) => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'locality-label');
    text.setAttribute('x', place.x);
    text.setAttribute('y', place.y - 3.2);
    text.textContent = place.name;
    return text;
  }));
}

function renderDashboard(dashboard) {
  state.dashboard = dashboard;
  document.querySelector('#total-pledges').textContent = dashboard.totalPledges.toLocaleString('en-IN');
  document.querySelector('#total-trees').textContent = dashboard.totalDigitalTrees.toLocaleString('en-IN');
  document.querySelector('#active-areas').textContent = dashboard.areaParticipation.length.toLocaleString('en-IN');
  document.querySelector('#top-area').textContent = dashboard.topLocalities[0]?.locality ?? 'Be first';
  const list = document.querySelector('#leaderboard');
  if (!dashboard.topLocalities.length) {
    list.innerHTML = '<li class="empty-state">The first locality is waiting to grow.</li>';
    return;
  }
  list.replaceChildren(...dashboard.topLocalities.map((area, index) => {
    const item = document.createElement('li');
    item.innerHTML = `<span class="rank">${index + 1}</span><strong></strong><span class="area-count">${area.count}</span>`;
    item.querySelector('strong').textContent = area.locality;
    return item;
  }));
}

function populateForm() {
  const localitySelect = form.elements.localityId;
  for (const locality of state.config.localities) {
    localitySelect.add(new Option(locality.name, locality.id));
  }
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

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  if (!form.reportValidity()) return;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.firstChild.textContent = 'Recording your pledge… ';
  const data = new FormData(form);
  try {
    const result = await api('/api/pledges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'), phone: data.get('phone'), localityId: data.get('localityId'),
        addressDetail: data.get('addressDetail'), pledgeId: 'plant-tree', consent: data.get('consent') === 'on',
        source: new URLSearchParams(location.search).get('utm_source') || 'direct'
      })
    });
    const locality = state.config.localities.find((item) => item.id === data.get('localityId'));
    const pledge = state.config.pledges.find((item) => item.id === 'plant-tree');
    const participant = {
      name: String(data.get('name')).trim(),
      locality: locality.name,
      pledgeId: pledge.id,
      pledge: pledge.text,
      submittedAt: new Date().toISOString()
    };
    state.latest = { participant };
    renderDashboard(result.impact);
    const latestTree = { ...result.tree };
    state.trees.push(latestTree);
    renderMap(state.trees, latestTree);
    drawCertificate(participant);
    document.querySelector('#certificate-id').textContent = 'Personalized digital tree certificate';
    dialog.showModal();
    form.reset();
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
    errorBox.focus();
  } finally {
    button.disabled = false;
    button.firstChild.textContent = 'Take My Pledge ';
  }
});

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

async function init() {
  try {
    const [config, dashboard, trees] = await Promise.all([api('/api/config'), api('/api/dashboard'), api('/api/trees')]);
    state.config = config; state.trees = trees.trees;
    populateForm(); renderLabels(); renderDashboard(dashboard); renderMap(state.trees);
  } catch {
    toast('Live impact is temporarily unavailable');
  }
}

init();
