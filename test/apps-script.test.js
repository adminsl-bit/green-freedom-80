import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { localities, pledges } from '../src/config.js';

const CLIENT_TOKEN = 'b'.repeat(64);
const SECRET = '0123456789abcdef'.repeat(4);

function createAppsScriptHarness(initialRows = []) {
  const rows = initialRows.map((row) => [...row]);
  const cache = new Map();
  const properties = { SHEET_ID: 'replaceable-sheet-id', API_SECRET: SECRET };
  let openedSheetId;
  const sheet = {
    getDataRange: () => ({ getValues: () => rows.map((row) => [...row]) }),
    appendRow: (row) => { rows.push([...row]); },
    getLastRow: () => rows.length
  };
  const context = {
    console,
    Date,
    JSON,
    Math,
    Object,
    String,
    Number,
    RegExp,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({ ...properties }),
        setProperties: (values) => Object.assign(properties, values)
      })
    },
    SpreadsheetApp: {
      openById: (id) => {
        openedSheetId = id;
        return {
          getSheetByName: () => sheet,
          insertSheet: () => sheet
        };
      }
    },
    LockService: {
      getScriptLock: () => ({ waitLock() {}, releaseLock() {} })
    },
    CacheService: {
      getScriptCache: () => ({
        get: (key) => cache.get(key) ?? null,
        put: (key, value) => cache.set(key, String(value))
      })
    },
    Utilities: {
      getUuid: () => '12345678-abcd-4000-9000-abcdef123456',
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      computeDigest: () => [0, 255]
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({
        text,
        setMimeType() { return this; }
      })
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), context);
  return {
    context,
    rows,
    properties,
    openedSheetId: () => openedSheetId,
    post(payload) {
      const output = context.doPost({ postData: { contents: JSON.stringify(payload) } });
      return JSON.parse(output.text);
    },
    postRaw(contents) {
      const output = context.doPost({ postData: { contents } });
      return JSON.parse(output.text);
    }
  };
}

test('Apps Script accepts one valid fixed tree pledge with address details', () => {
  const app = createAppsScriptHarness();
  const response = app.post({
    action: 'pledge', secret: SECRET, clientToken: CLIENT_TOKEN,
    body: {
      name: 'Meena Kumar', phone: '98765 43210', localityId: 'anna-nagar',
      addressDetail: '12 Example Street, Anna Nagar, Madurai 625020',
      pledgeId: 'plant-tree', consent: true, source: 'instagram'
    }
  });

  assert.equal(response.status, 201);
  assert.deepEqual(Object.keys(response.body).sort(), ['accepted', 'impact', 'tree']);
  assert.equal(response.body.accepted, true);
  assert.equal(response.body.impact.totalPledges, 1);
  assert.doesNotMatch(JSON.stringify(response.body), /Meena Kumar|919876543210|Example Street|GF80-|submittedAt|certificateId/);
  assert.equal(app.openedSheetId(), 'replaceable-sheet-id');
  assert.equal(app.rows.length, 2);
  assert.deepEqual(app.rows[0], [
    'certificate_id', 'name', 'phone', 'submitted_at', 'locality_id', 'address_detail',
    'pledge_id', 'pledge_version', 'consent_version', 'consented_at', 'source', 'tree_x', 'tree_y'
  ]);
  assert.equal(app.rows[1][2], '919876543210');
  assert.equal(app.rows[1][4], 'anna-nagar');
  assert.equal(app.rows[1][5], '12 Example Street, Anna Nagar, Madurai 625020');
  assert.equal(app.rows[1][6], 'plant-tree');
});

test('Apps Script accepts exactly the locality and pledge IDs shown by the frontend', () => {
  const app = createAppsScriptHarness();

  assert.deepEqual(
    Object.keys(app.context.LOCALITIES).sort(),
    localities.map((locality) => locality.id).sort()
  );
  assert.deepEqual(
    Object.keys(app.context.PLEDGES).sort(),
    pledges.map((pledge) => pledge.id).sort()
  );
});

test('Apps Script rejects an existing worksheet with reordered headers', () => {
  const app = createAppsScriptHarness([[
    'certificate_id', 'phone', 'name', 'submitted_at', 'locality_id', 'address_detail',
    'pledge_id', 'pledge_version', 'consent_version', 'consented_at', 'source', 'tree_x', 'tree_y'
  ]]);

  const response = app.post({ action: 'dashboard', secret: SECRET });

  assert.equal(response.status, 500);
  assert.match(response.body.error, /could not complete/i);
  assert.equal(app.rows.length, 1);
});

test('Apps Script reports malformed JSON as a client error', () => {
  const app = createAppsScriptHarness();

  const response = app.postRaw('{not-json');

  assert.equal(response.status, 400);
  assert.match(response.body.error, /valid json/i);
});

test('Apps Script rejects non-object JSON envelopes and pledge bodies with 4xx responses', () => {
  const app = createAppsScriptHarness();
  const secret = SECRET;

  const nullEnvelope = app.postRaw('null');
  const arrayBody = app.post({ action: 'pledge', secret, clientToken: CLIENT_TOKEN, body: [] });

  assert.equal(nullEnvelope.status, 400);
  assert.equal(arrayBody.status, 400);
});

test('Apps Script setup rejects weak gateway secrets', () => {
  const app = createAppsScriptHarness();

  assert.throws(
    () => app.context.setupCampaign('new-sheet-id', 'too-short'),
    /64-character hexadecimal/i
  );
});

test('Apps Script setup rejects the documented placeholder secret', () => {
  const app = createAppsScriptHarness();

  assert.throws(
    () => app.context.setupCampaign('new-sheet-id', 'replace-with-at-least-32-random-characters'),
    /64-character hexadecimal/i
  );
});

test('Apps Script atomically rejects a duplicate normalized mobile number', () => {
  const app = createAppsScriptHarness();
  const secret = SECRET;
  const body = { name: 'Meena', phone: '9876543210', localityId: 'anna-nagar', addressDetail: '12 Test Street, Madurai', pledgeId: 'plant-tree', consent: true };

  assert.equal(app.post({ action: 'pledge', secret, clientToken: CLIENT_TOKEN, body }).status, 201);
  const duplicate = app.post({ action: 'pledge', secret, clientToken: CLIENT_TOKEN, body: { ...body, phone: '+91 98765 43210' } });

  assert.equal(duplicate.status, 409);
  assert.equal(app.rows.length, 2);
});

test('Apps Script rejects address details outside the approved length limits', () => {
  const short = createAppsScriptHarness();
  const long = createAppsScriptHarness();
  const base = {
    name: 'Address QA', phone: '9876543210', localityId: 'anna-nagar',
    pledgeId: 'plant-tree', consent: true
  };

  const shortResponse = short.post({
    action: 'pledge', secret: SECRET, clientToken: CLIENT_TOKEN,
    body: { ...base, addressDetail: 'A' }
  });
  const longResponse = long.post({
    action: 'pledge', secret: SECRET, clientToken: CLIENT_TOKEN,
    body: { ...base, addressDetail: 'A'.repeat(221) }
  });

  assert.equal(shortResponse.status, 400);
  assert.equal(longResponse.status, 400);
  assert.equal(short.rows.length, 0);
  assert.equal(long.rows.length, 0);
});

test('Apps Script rejects impossible Indian mobile numbers', () => {
  const app = createAppsScriptHarness();
  const response = app.post({
    action: 'pledge', secret: SECRET, clientToken: CLIENT_TOKEN,
    body: { name: 'Invalid', phone: '0000000000', localityId: 'anna-nagar', addressDetail: '12 Test Street, Madurai', pledgeId: 'plant-tree', consent: true }
  });

  assert.equal(response.status, 400);
  assert.equal(app.rows.length, 0);
});

test('Apps Script public tree responses exclude participant identifiers', () => {
  const app = createAppsScriptHarness();
  const secret = SECRET;
  app.post({
    action: 'pledge', secret, clientToken: CLIENT_TOKEN,
    body: { name: 'Private Person', phone: '9876543210', localityId: 'anna-nagar', addressDetail: '12 Private Street, Madurai', pledgeId: 'plant-tree', consent: true }
  });

  const response = app.post({ action: 'trees', secret });
  const serialized = JSON.stringify(response.body);

  assert.equal(response.status, 200);
  assert.equal(response.body.trees.length, 1);
  assert.doesNotMatch(serialized, /Private Person|919876543210|GF80-/);
});

test('Apps Script rate limits repeated pledge attempts from one pseudonymous client', () => {
  const app = createAppsScriptHarness();
  const secret = SECRET;
  let response;
  for (let index = 0; index < 13; index += 1) {
    response = app.post({
      action: 'pledge', secret, clientToken: 'a'.repeat(64),
      body: {
        name: `Visitor ${index}`, phone: String(9000000000 + index), localityId: 'anna-nagar', addressDetail: `${index + 1} Test Street, Madurai`,
        pledgeId: 'plant-tree', consent: true
      }
    });
  }

  assert.equal(response.status, 429);
  assert.equal(app.rows.length, 13);
});
