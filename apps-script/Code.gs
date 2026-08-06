var SHEET_NAME = 'Pledges';
var CONSENT_VERSION = '2026-08-06-v2';
var HEADERS = [
  'certificate_id', 'name', 'phone', 'submitted_at', 'locality_id', 'address_detail',
  'pledge_id', 'pledge_version', 'consent_version', 'consented_at', 'source', 'tree_x', 'tree_y'
];
var LOCALITIES = {
  'achampathu': { name: 'Achampathu', x: 30.4, y: 35.2 },
  'alagappan-nagar': { name: 'Alagappan Nagar', x: 47.2, y: 59.4 },
  'anaiyur': { name: 'Anaiyur', x: 49.7, y: 23.9 },
  'andalpuram': { name: 'Andalpuram', x: 46.6, y: 49.8 },
  'anna-nagar': { name: 'Anna Nagar', x: 67.4, y: 43.7 },
  'anuppanadi': { name: 'Anuppanadi', x: 63.2, y: 51.2 },
  'arapalayam': { name: 'Arapalayam', x: 47.2, y: 37.4 },
  'arasaradi': { name: 'Arasaradi', x: 44.9, y: 40.5 },
  'athikulam': { name: 'Athikulam', x: 62.3, y: 26.6 },
  'avaniyapuram': { name: 'Avaniyapuram', x: 51.9, y: 64.1 },
  'balaji-nagar': { name: 'Balaji Nagar', x: 29.3, y: 62.5 },
  'balarengapuram': { name: 'Balarengapuram', x: 59.6, y: 47.8 },
  'bethaniyapuram': { name: 'Bethaniyapuram', x: 43, y: 36.4 },
  'bibikulam': { name: 'Bibikulam (B. B. Kulam)', x: 57, y: 33.1 },
  'chinthamani': { name: 'Chinthamani', x: 63.5, y: 57.1 },
  'chokkalinga-nagar': { name: 'Chokkalinga Nagar', x: 44.1, y: 26 },
  'chokkikulam': { name: 'Chokkikulam', x: 60.2, y: 36.5 },
  'ellis-nagar': { name: 'Ellis Nagar', x: 46.5, y: 47.6 },
  'gomathipuram': { name: 'Gomathipuram', x: 70.7, y: 42.1 },
  'goripalayam': { name: 'Goripalayam', x: 58.8, y: 37.8 },
  'harveypatti': { name: 'Harveypatti', x: 28.6, y: 65.6 },
  'ilandhaikulam': { name: 'Ilandhaikulam', x: 76.8, y: 31.1 },
  'iyer-bungalow': { name: 'Iyer Bungalow', x: 62.1, y: 20.7 },
  'jaihindpuram': { name: 'Jaihindpuram', x: 50.1, y: 51.7 },
  'jeeva-nagar': { name: 'Jeeva Nagar', x: 49.9, y: 54.2 },
  'kk-nagar': { name: 'K. K. Nagar', x: 66.9, y: 37.3 },
  'k-pudur': { name: 'K. Pudur', x: 67.8, y: 23.1 },
  'kadachanenthal': { name: 'Kadachanenthal', x: 76.4, y: 16.4 },
  'kalavasal': { name: 'Kalavasal', x: 43.9, y: 39.5 },
  'kalmedu': { name: 'Kalmedu', x: 77.7, y: 57.9 },
  'kannanenthal': { name: 'Kannanenthal', x: 65.9, y: 21.5 },
  'keelavasal': { name: 'Keelavasal', x: 57.5, y: 45.5 },
  'kochadai': { name: 'Kochadai', x: 38.7, y: 34.3 },
  'koodal-nagar': { name: 'Koodal Nagar', x: 44.2, y: 20.8 },
  'kovalan-nagar': { name: 'Kovalan Nagar', x: 46.8, y: 56.6 },
  'madakkulam': { name: 'Madakkulam', x: 41.1, y: 46.7 },
  'managiri': { name: 'Managiri', x: 66.4, y: 40 },
  'mattuthavani': { name: 'Mattuthavani', x: 71.3, y: 30.7 },
  'meenambalpuram': { name: 'Meenambalpuram', x: 52.1, y: 29.1 },
  'melapanangadi': { name: 'Melapanangadi', x: 58, y: 16.8 },
  'moondrumavadi': { name: 'Moondrumavadi', x: 68.3, y: 27.5 },
  'munichalai': { name: 'Munichalai', x: 61.3, y: 45.4 },
  'muthupatti': { name: 'Muthupatti', x: 43.7, y: 58.2 },
  'nagavakulam': { name: 'Nagavakulam', x: 62.7, y: 34 },
  'narimedu': { name: 'Narimedu', x: 55.2, y: 35 },
  'nehru-nagar': { name: 'Nehru Nagar', x: 44.5, y: 54.3 },
  'nelpettai': { name: 'Nelpettai', x: 57.5, y: 43 },
  'othakadai': { name: 'Othakadai', x: 85.8, y: 24.4 },
  'other-madurai-area': { name: 'Other Madurai area', x: 52.2, y: 41.5 },
  'palanganatham': { name: 'Palanganatham', x: 44.2, y: 52.5 },
  'pallivasal': { name: 'Pallivasal', x: 44.1, y: 78.9 },
  'pamban-nagar-colony': { name: 'Pamban Nagar Colony', x: 38.9, y: 66.7 },
  'pasumalai': { name: 'Pasumalai', x: 37, y: 57.1 },
  'periyar': { name: 'Periyar', x: 51.2, y: 46 },
  'ponmeni': { name: 'Ponmeni', x: 41.7, y: 40.6 },
  'ponnagaram': { name: 'Ponnagaram', x: 50.3, y: 39.3 },
  'poondhotam': { name: 'Poondhotam', x: 53.4, y: 40.5 },
  'sellur': { name: 'Sellur', x: 55.6, y: 36.7 },
  'sikandar-chavadi': { name: 'Sikandar Chavadi', x: 43.2, y: 17.8 },
  'simmakkal': { name: 'Simmakkal', x: 54.8, y: 40 },
  'south-gate': { name: 'South Gate', x: 55.7, y: 49.5 },
  'ss-colony': { name: 'SS Colony', x: 44.5, y: 43.1 },
  'tallakulam': { name: 'Tallakulam', x: 61.7, y: 33.8 },
  'teppakulam': { name: 'Teppakulam', x: 68.8, y: 46.2 },
  'thathaneri': { name: 'Thathaneri', x: 50.3, y: 30.1 },
  'thirunagar': { name: 'Thirunagar', x: 26.1, y: 62.3 },
  'thiruppalai': { name: 'Thiruppalai', x: 62.8, y: 15.3 },
  'thirupparankundram': { name: 'Thirupparankundram', x: 33.7, y: 63.9 },
  'thuvariman': { name: 'Thuvariman', x: 26.2, y: 24.5 },
  'uthangudi': { name: 'Uthangudi', x: 79.9, y: 23.6 },
  'vandiyur': { name: 'Vandiyur', x: 73.2, y: 46.7 },
  'vilachery': { name: 'Vilachery', x: 28.4, y: 56 },
  'vilakkuthoon': { name: 'Vilakkuthoon', x: 55.9, y: 44.2 },
  'vilangudi': { name: 'Vilangudi', x: 40.3, y: 29.5 },
  'villapuram': { name: 'Villapuram', x: 55.2, y: 55.7 },
  'viraganur': { name: 'Viraganur', x: 74, y: 54.2 },
  'virattippathu': { name: 'Virattippathu', x: 35.8, y: 37 },
  'viswanathapuram': { name: 'Viswanathapuram', x: 57, y: 29 },
  'yanaikkal': { name: 'Yanaikkal', x: 55.2, y: 40.5 }
};
var PLEDGES = {
  'plant-tree': 'I pledge to plant and nurture one tree.'
};

function doPost(event) {
  var payload;
  try {
    payload = JSON.parse(event && event.postData ? event.postData.contents : '{}');
  } catch (_error) {
    return output_(400, { error: 'Request body must be valid JSON.' });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return output_(400, { error: 'Request body must be a JSON object.' });
  }
  try {
    var settings = settings_();
    if (payload.secret !== settings.API_SECRET) return output_(401, { error: 'Authentication failed.' });
    if (payload.action === 'pledge') return acceptPledge_(settings, payload.body, payload.clientToken);
    if (payload.action === 'dashboard') return output_(200, dashboard_(sheet_(settings)));
    if (payload.action === 'trees') return output_(200, { trees: trees_(sheet_(settings)) });
    return output_(404, { error: 'Action not found.' });
  } catch (error) {
    return output_(500, { error: 'Campaign backend could not complete the request.' });
  }
}

function setupCampaign(sheetId, apiSecret) {
  if (!sheetId) throw new Error('Sheet ID is required.');
  if (!validSecret_(apiSecret)) throw new Error('API secret must be a 64-character hexadecimal value.');
  PropertiesService.getScriptProperties().setProperties({ SHEET_ID: sheetId, API_SECRET: apiSecret });
  sheet_({ SHEET_ID: sheetId, API_SECRET: apiSecret });
}

function settings_() {
  var values = PropertiesService.getScriptProperties().getProperties();
  if (!values.SHEET_ID || !validSecret_(values.API_SECRET)) throw new Error('Campaign is not configured securely.');
  return values;
}

function validSecret_(value) {
  return /^[a-f0-9]{64}$/.test(String(value || ''));
}

function sheet_(settings) {
  var book = SpreadsheetApp.openById(settings.SHEET_ID);
  var sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    var existingHeaders = sheet.getDataRange().getValues()[0] || [];
    var validHeaders = existingHeaders.length === HEADERS.length && HEADERS.every(function(header, index) {
      return String(existingHeaders[index]) === header;
    });
    if (!validHeaders) throw new Error('Pledges worksheet schema does not match the application.');
  }
  return sheet;
}

function acceptPledge_(settings, body, clientToken) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return output_(400, { error: 'Pledge body must be a JSON object.' });
  }
  var name = String(body.name || '').trim().replace(/\s+/g, ' ');
  var phone = normalizePhone_(body.phone);
  var locality = LOCALITIES[body.localityId];
  var addressDetail = String(body.addressDetail || '').trim().replace(/\s+/g, ' ');
  var pledge = PLEDGES[body.pledgeId];
  if (name.length < 2 || name.length > 80 || !phone || !locality || addressDetail.length < 5 || addressDetail.length > 220 || !pledge || body.consent !== true || !/^[a-f0-9]{64}$/.test(String(clientToken || ''))) {
    return output_(400, { error: 'Please provide valid participant details, address, locality, and consent.' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (!consumeRateLimit_(clientToken)) {
      return output_(429, { error: 'Too many pledge attempts. Please wait and try again.' });
    }
    var sheet = sheet_(settings);
    var rows = sheet.getDataRange().getValues();
    for (var index = 1; index < rows.length; index += 1) {
      if (String(rows[index][2]) === phone) {
        return output_(409, { error: 'A Green Freedom 80 pledge already exists for this mobile number.' });
      }
    }

    var certificateId = 'GF80-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
    var submittedAt = new Date().toISOString();
    var point = treePoint_(locality, certificateId);
    sheet.appendRow([
      safeCell_(certificateId), safeCell_(name), phone, submittedAt, body.localityId,
      safeCell_(addressDetail), body.pledgeId, pledge, CONSENT_VERSION, submittedAt,
      safeCell_(String(body.source || 'direct').slice(0, 40)), point.x, point.y
    ]);

    return output_(201, {
      accepted: true,
      tree: { localityId: body.localityId, x: point.x, y: point.y },
      impact: dashboard_(sheet)
    });
  } finally {
    lock.releaseLock();
  }
}

function consumeRateLimit_(clientToken) {
  var cache = CacheService.getScriptCache();
  var key = 'pledge-rate:' + clientToken;
  var attempts = Number(cache.get(key) || 0);
  if (attempts >= 12) return false;
  cache.put(key, String(attempts + 1), 600);
  return true;
}

function normalizePhone_(value) {
  var digits = String(value || '').replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(digits)) return '91' + digits;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

function treePoint_(locality, seed) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed);
  var first = (bytes[0] + 256) % 256;
  var second = (bytes[1] + 256) % 256;
  return {
    x: Number((locality.x + ((first / 255) - 0.5) * 5).toFixed(2)),
    y: Number((locality.y + ((second / 255) - 0.5) * 5).toFixed(2))
  };
}

function dashboard_(sheet) {
  var rows = sheet.getDataRange().getValues();
  var counts = {};
  for (var index = 1; index < rows.length; index += 1) {
    var localityId = String(rows[index][4] || '');
    if (LOCALITIES[localityId]) counts[localityId] = (counts[localityId] || 0) + 1;
  }
  var areas = Object.keys(counts).map(function(localityId) {
    return { localityId: localityId, locality: LOCALITIES[localityId].name, count: counts[localityId] };
  }).sort(function(left, right) {
    return right.count - left.count || left.locality.localeCompare(right.locality);
  });
  var total = rows.length > 0 ? rows.length - 1 : 0;
  return { totalPledges: total, totalDigitalTrees: total, areaParticipation: areas, topLocalities: areas.slice(0, 5) };
}

function trees_(sheet) {
  return sheet.getDataRange().getValues().slice(1, 2001).map(function(row) {
    return { localityId: String(row[4]), x: Number(row[11]), y: Number(row[12]) };
  });
}

function safeCell_(value) {
  var text = String(value || '');
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function output_(status, body) {
  return ContentService.createTextOutput(JSON.stringify({ status: status, body: body }))
    .setMimeType(ContentService.MimeType.JSON);
}
