import assert from 'node:assert/strict';
import test from 'node:test';
import { createGateway } from '../api/gateway.js';

const TEST_SECRET = '0123456789abcdef'.repeat(4);
const SAFE_PLEDGE_BODY = {
  accepted: true,
  tree: { localityId: 'anna-nagar', x: 62.5, y: 41.2 },
  impact: { totalPledges: 1, totalDigitalTrees: 1, areaParticipation: [], topLocalities: [] }
};

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    json(value) { this.body = value; return this; }
  };
}

test('pledge gateway exposes only a privacy-safe acknowledgement', async () => {
  let upstream;
  const safeBody = {
    accepted: true,
    tree: { localityId: 'anna-nagar', x: 62.5, y: 41.2 },
    impact: { totalPledges: 1, totalDigitalTrees: 1, areaParticipation: [], topLocalities: [] }
  };
  const gateway = createGateway({
    environment: {
      APPS_SCRIPT_URL: 'https://script.google.com/macros/s/deployment/exec',
      APPS_SCRIPT_SECRET: TEST_SECRET
    },
    fetchImpl: async (url, options) => {
      upstream = { url, options, payload: JSON.parse(options.body) };
      return new Response(JSON.stringify({
        status: 201,
        body: {
          ...safeBody,
          certificateId: 'GF80-TEST',
          participant: { name: 'Meena', phone: '919876543210', address: 'Private address' },
          submittedAt: '2026-08-06T12:34:56.000Z',
          sheetId: 'private-sheet',
          secret: 'must-not-pass'
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });
  const request = {
    method: 'POST', query: { route: 'pledges' }, headers: {},
    body: {
      name: 'Meena', phone: '9876543210', localityId: 'anna-nagar',
      addressDetail: '12 Example Street, Madurai', pledgeId: 'plant-tree', consent: true
    }
  };
  const response = responseRecorder();

  await gateway(request, response);

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, safeBody);
  assert.equal(upstream.url, 'https://script.google.com/macros/s/deployment/exec');
  assert.equal(upstream.payload.action, 'pledge');
  assert.equal(upstream.payload.secret, TEST_SECRET);
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('dashboard gateway returns only privacy-safe aggregate fields', async () => {
  let action;
  const safeBody = {
    totalPledges: 4,
    totalDigitalTrees: 4,
    areaParticipation: [{ localityId: 'anna-nagar', locality: 'Anna Nagar', count: 4 }],
    topLocalities: [{ localityId: 'anna-nagar', locality: 'Anna Nagar', count: 4 }]
  };
  const gateway = createGateway({
    environment: { APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test-deployment/exec', APPS_SCRIPT_SECRET: TEST_SECRET },
    fetchImpl: async (_url, options) => {
      action = JSON.parse(options.body).action;
      return new Response(JSON.stringify({
        status: 200,
        body: { ...safeBody, participants: [{ name: 'Private' }], sheetId: 'private-sheet', submittedAt: 'exact-time' }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });
  const response = responseRecorder();

  await gateway({ method: 'GET', query: { route: 'dashboard' }, headers: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(action, 'dashboard');
  assert.deepEqual(response.body, safeBody);
});

test('tree gateway returns only locality-safe coordinates', async () => {
  const safeBody = { trees: [{ localityId: 'anna-nagar', x: 62.5, y: 41.2 }] };
  const gateway = createGateway({
    environment: { APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test-deployment/exec', APPS_SCRIPT_SECRET: TEST_SECRET },
    fetchImpl: async () => new Response(JSON.stringify({
      status: 200,
      body: {
        trees: [{ ...safeBody.trees[0], name: 'Private', address: 'Private address', certificateId: 'GF80-PRIVATE' }],
        sheetId: 'private-sheet'
      }
    }), { status: 200 })
  });
  const response = responseRecorder();

  await gateway({ method: 'GET', query: { route: 'trees' }, headers: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, safeBody);
});

test('config gateway serves one fixed tree pledge and a comprehensive sorted Madurai locality list', async () => {
  const gateway = createGateway({ environment: {}, fetchImpl: async () => { throw new Error('must not call upstream'); } });
  const response = responseRecorder();

  await gateway({ method: 'GET', query: { route: 'config' }, headers: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.pledges, [
    { id: 'plant-tree', icon: '🌱', text: 'I pledge to plant and nurture one tree.' }
  ]);
  assert.ok(response.body.localities.length >= 70);
  assert.deepEqual(
    response.body.localities.map((locality) => locality.name),
    [...response.body.localities.map((locality) => locality.name)].sort((left, right) => left.localeCompare(right, 'en'))
  );
  for (const requiredId of ['anna-nagar', 'kk-nagar', 'teppakulam', 'simmakkal', 'thirunagar', 'othakadai', 'other-madurai-area']) {
    assert.ok(response.body.localities.some((locality) => locality.id === requiredId), `missing ${requiredId}`);
  }
});

test('gateway forwards an approved address-detail field to Apps Script', async () => {
  let upstreamPayload;
  const gateway = createGateway({
    environment: { APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test-deployment/exec', APPS_SCRIPT_SECRET: TEST_SECRET },
    fetchImpl: async (_url, options) => {
      upstreamPayload = JSON.parse(options.body);
      return new Response(JSON.stringify({ status: 201, body: SAFE_PLEDGE_BODY }), { status: 200 });
    }
  });
  const response = responseRecorder();

  await gateway({
    method: 'POST', query: { route: 'pledges' }, headers: {},
    body: {
      name: 'Address QA', phone: '9876543210', localityId: 'anna-nagar',
      addressDetail: '12 Example Street, Anna Nagar, Madurai 625020',
      pledgeId: 'plant-tree', consent: true
    }
  }, response);

  assert.equal(response.statusCode, 201);
  assert.equal(upstreamPayload.body.addressDetail, '12 Example Street, Anna Nagar, Madurai 625020');
});

test('gateway refuses to start with a weak Apps Script secret', async () => {
  const gateway = createGateway({
    environment: { APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test-deployment/exec', APPS_SCRIPT_SECRET: 'weak' },
    fetchImpl: async () => { throw new Error('must not call upstream'); }
  });
  const response = responseRecorder();

  await gateway({ method: 'GET', query: { route: 'dashboard' }, headers: {} }, response);

  assert.equal(response.statusCode, 503);
  assert.match(response.body.error, /not configured/i);
});

test('gateway rejects the documented placeholder as an Apps Script secret', async () => {
  let called = false;
  const gateway = createGateway({
    environment: {
      APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test-deployment/exec',
      APPS_SCRIPT_SECRET: 'replace-with-at-least-32-random-characters'
    },
    fetchImpl: async () => { called = true; }
  });
  const response = responseRecorder();

  await gateway({ method: 'GET', query: { route: 'dashboard' }, headers: {} }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(called, false);
});

test('gateway pseudonymizes the visitor address before forwarding abuse-control data', async () => {
  let upstreamPayload;
  const gateway = createGateway({
    environment: { APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test-deployment/exec', APPS_SCRIPT_SECRET: TEST_SECRET },
    fetchImpl: async (_url, options) => {
      upstreamPayload = JSON.parse(options.body);
      return new Response(JSON.stringify({ status: 201, body: SAFE_PLEDGE_BODY }), { status: 200 });
    }
  });
  const response = responseRecorder();

  await gateway({
    method: 'POST', query: { route: 'pledges' }, headers: { 'x-forwarded-for': '203.0.113.8' },
    body: { name: 'Visitor', phone: '9876543210', localityId: 'anna-nagar', pledgeId: 'plant-tree', consent: true }
  }, response);

  assert.equal(response.statusCode, 201);
  assert.match(upstreamPayload.clientToken, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(upstreamPayload), /203\.0\.113\.8/);
});

test('gateway attaches a timeout signal to Apps Script requests', async () => {
  let signal;
  const gateway = createGateway({
    environment: { APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test-deployment/exec', APPS_SCRIPT_SECRET: TEST_SECRET },
    fetchImpl: async (_url, options) => {
      signal = options.signal;
      return new Response(JSON.stringify({
        status: 200,
        body: { totalPledges: 0, totalDigitalTrees: 0, areaParticipation: [], topLocalities: [] }
      }), { status: 200 });
    }
  });
  const response = responseRecorder();

  await gateway({ method: 'GET', query: { route: 'dashboard' }, headers: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.ok(signal instanceof AbortSignal);
});

test('gateway rejects an oversized Apps Script response', async () => {
  const gateway = createGateway({
    environment: { APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test-deployment/exec', APPS_SCRIPT_SECRET: TEST_SECRET },
    fetchImpl: async () => new Response(JSON.stringify({
      status: 200,
      body: {
        totalPledges: 0, totalDigitalTrees: 0, areaParticipation: [], topLocalities: [],
        padding: 'x'.repeat(300000)
      }
    }), { status: 200 })
  });
  const response = responseRecorder();

  await gateway({ method: 'GET', query: { route: 'dashboard' }, headers: {} }, response);

  assert.equal(response.statusCode, 502);
  assert.match(response.body.error, /invalid response/i);
});

test('gateway rejects non-Google Apps Script upstream URLs before sending the server secret', async () => {
  let called = false;
  const gateway = createGateway({
    environment: {
      APPS_SCRIPT_URL: 'https://example.test/collect',
      APPS_SCRIPT_SECRET: TEST_SECRET
    },
    fetchImpl: async () => { called = true; }
  });
  const response = responseRecorder();

  await gateway({ method: 'GET', query: { route: 'dashboard' }, headers: {} }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(called, false);
});
