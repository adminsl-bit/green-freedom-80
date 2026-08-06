import crypto from 'node:crypto';
import { localities, pledges } from '../src/config.js';

const ALLOWED_ROUTES = new Set(['config', 'dashboard', 'trees', 'pledges']);

function safeArea(area) {
  if (!area || typeof area !== 'object') return null;
  var count = Number(area.count);
  if (!Number.isFinite(count) || count < 0) return null;
  return {
    localityId: String(area.localityId || ''),
    locality: String(area.locality || ''),
    count
  };
}

function safeDashboard(body) {
  if (!body || typeof body !== 'object') return null;
  const totalPledges = Number(body.totalPledges);
  const totalDigitalTrees = Number(body.totalDigitalTrees);
  if (!Number.isFinite(totalPledges) || !Number.isFinite(totalDigitalTrees)
      || !Array.isArray(body.areaParticipation) || !Array.isArray(body.topLocalities)) return null;
  const areaParticipation = body.areaParticipation.map(safeArea);
  const topLocalities = body.topLocalities.map(safeArea);
  if (areaParticipation.includes(null) || topLocalities.includes(null)) return null;
  return { totalPledges, totalDigitalTrees, areaParticipation, topLocalities };
}

function safePledge(body) {
  if (!body || body.accepted !== true || !body.tree || typeof body.tree !== 'object') return null;
  const x = Number(body.tree.x);
  const y = Number(body.tree.y);
  const impact = safeDashboard(body.impact);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !impact) return null;
  return {
    accepted: true,
    tree: { localityId: String(body.tree.localityId || ''), x, y },
    impact
  };
}

function safeTrees(body) {
  if (!body || !Array.isArray(body.trees)) return null;
  const trees = body.trees.slice(0, 2000).map((tree) => {
    if (!tree || typeof tree !== 'object') return null;
    const x = Number(tree.x);
    const y = Number(tree.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { localityId: String(tree.localityId || ''), x, y };
  });
  return trees.includes(null) ? null : { trees };
}

export function createGateway({ environment = process.env, fetchImpl = fetch } = {}) {
  return async function gateway(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    const route = String(request.query?.route ?? '');
    if (!ALLOWED_ROUTES.has(route)) return response.status(404).json({ error: 'API route not found.' });

    if (route === 'config') {
      if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' });
      return response.status(200).json({ pledges, localities });
    }

    const upstreamUrl = environment.APPS_SCRIPT_URL;
    const secret = environment.APPS_SCRIPT_SECRET;
    let parsedUpstream;
    try {
      parsedUpstream = new URL(upstreamUrl);
    } catch (_error) {
      parsedUpstream = null;
    }
    const trustedUpstream = parsedUpstream
      && parsedUpstream.protocol === 'https:'
      && parsedUpstream.hostname === 'script.google.com'
      && /^\/macros\/s\/[^/]+\/exec$/.test(parsedUpstream.pathname);
    const strongSecret = typeof secret === 'string' && /^[a-f0-9]{64}$/.test(secret);
    if (!trustedUpstream || !strongSecret) {
      return response.status(503).json({ error: 'Campaign backend is not configured.' });
    }

    const expectedMethod = route === 'pledges' ? 'POST' : 'GET';
    if (request.method !== expectedMethod) {
      return response.status(405).json({ error: 'Method not allowed.' });
    }
    if (route === 'pledges') {
      const body = request.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return response.status(400).json({ error: 'Please provide valid participant details.' });
      }
    }

    try {
      const forwarded = String(request.headers?.['x-vercel-forwarded-for'] || request.headers?.['x-forwarded-for'] || 'unknown');
      const visitorAddress = forwarded.split(',')[0].trim().slice(0, 128);
      const clientToken = crypto.createHmac('sha256', secret).update(visitorAddress).digest('hex');
      const upstream = await fetchImpl(upstreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          action: route === 'pledges' ? 'pledge' : route,
          secret,
          ...(route === 'pledges' ? { body: request.body, clientToken } : {})
        })
      });
      const rawEnvelope = await upstream.text();
      if (Buffer.byteLength(rawEnvelope, 'utf8') > 262144) {
        return response.status(502).json({ error: 'Campaign backend returned an invalid response.' });
      }
      const envelope = JSON.parse(rawEnvelope);
      const status = Number(envelope.status);
      if (!Number.isInteger(status) || status < 100 || status > 599 || !envelope.body || typeof envelope.body !== 'object') {
        return response.status(502).json({ error: 'Campaign backend returned an invalid response.' });
      }
      if (status >= 400) {
        return response.status(status).json({ error: String(envelope.body.error || 'Campaign request failed.') });
      }
      const body = route === 'pledges'
        ? safePledge(envelope.body)
        : route === 'dashboard'
          ? safeDashboard(envelope.body)
          : route === 'trees'
            ? safeTrees(envelope.body)
            : envelope.body;
      if (!body) return response.status(502).json({ error: 'Campaign backend returned an invalid response.' });
      return response.status(status).json(body);
    } catch (_error) {
      return response.status(502).json({ error: 'Campaign backend is temporarily unavailable.' });
    }
  };
}

export default createGateway();
