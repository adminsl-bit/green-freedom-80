# Green Freedom 80

Two-week **Young Indians — Green Freedom 80 Digital Climate Action Platform** for Madurai.

## Production architecture

```text
Participant browser
      │ same-origin /api requests
      ▼
Vercel static site + Node gateway
      │ authenticated server-to-server request
      ▼
Google Apps Script web app
      │ ScriptLock duplicate check + append
      ▼
Client-controlled Google Sheet
```

The Sheet ID is not hardcoded. It is stored in Apps Script properties and can be replaced before launch or handoff. Google credentials and the gateway secret remain server-side.

## Included

- Mobile-first journey with one fixed action: **“I pledge to plant and nurture one tree.”**
- Alphabetized selector with 79 Madurai localities, including an `Other Madurai area` fallback
- Required address-details field (5–220 normalized characters)
- One accepted pledge and one **digital** tree per normalized mobile number
- Immediate personalized certificate/share image rendered from form values already held in the participant's browser; persisted certificate IDs are not returned by the API
- Live aggregate statistics, locality ranking, and privacy-safe tree feed
- Race-safe duplicate enforcement through Apps Script `LockService`
- Ten-minute pledge-attempt limiting using a pseudonymous visitor token and Apps Script cache
- Impossible Indian mobile-number rejection (`6`–`9` first digit)
- Spreadsheet-formula neutralization for participant-controlled Sheet cells
- Google-account-controlled administration and native CSV/XLSX export
- Vercel security headers and same-origin API gateway

## Automated verification

```bash
npm install
npm test
npm run test:coverage
npm audit --audit-level=high
```

The tests exercise the Vercel gateway, Apps Script behavior through a Google-service emulator, duplicate locking behavior, mobile validation, public privacy boundaries, rate limiting, and deployment configuration. A real Google Sheet integration test still requires the final owner account.

## Google Sheet and Apps Script setup

Do this only in the Google account approved to own the campaign data.

1. Create a **new empty Google Sheet**. Do not copy local QA data into it.
2. Prefer sharing restricted to named Young Indians/Straw Labs administrators. For this pilot, the owner explicitly accepted “anyone with the link” access; if that setting remains enabled, never publish the Sheet URL and keep the participant-facing disclosure about link-based access accurate.
3. Open **Extensions → Apps Script** from the Sheet.
4. Replace the editor contents with `apps-script/Code.gs`. Enable manifest editing in Apps Script project settings and use `apps-script/appsscript.json`.
5. Generate a random server secret locally; do not send it through chat or commit it:

   ```bash
   openssl rand -hex 32
   ```

6. In the Apps Script editor, run this once with the real values, then remove the temporary invocation from the editor if one was created:

   ```javascript
   setupCampaign('REPLACE_WITH_SHEET_ID', 'REPLACE_WITH_64_HEX_SECRET')
   ```

7. Authorize the script as the Sheet owner.
8. Deploy **New deployment → Web app**:
   - Execute as: **Me** (the approved Sheet owner)
   - Who has access: **Anyone**

   The web-app endpoint must be callable by Vercel, but every operation is authenticated by the 64-character server secret. The Sheet URL and Sheet ID are not exposed by the application. Sheet sharing is a separate Google access-control setting.
9. Copy the `/exec` deployment URL. Do not use the development `/dev` URL.

To switch Sheets later, rerun `setupCampaign()` with the replacement Sheet ID and the same or a rotated secret, then verify an empty dashboard before launch.

## Vercel setup

Set these as encrypted Vercel environment variables for Production and Preview as appropriate:

| Variable | Purpose |
|---|---|
| `APPS_SCRIPT_URL` | Deployed Apps Script `/exec` URL |
| `APPS_SCRIPT_SECRET` | Same `openssl rand -hex 32` output configured through `setupCampaign()`; exactly 64 lowercase hexadecimal characters |

Then deploy the repository to Vercel. The application uses the Vercel-provided domain; no custom domain is required.

`APPS_SCRIPT_SECRET` is used by the gateway to authenticate to Apps Script and to HMAC the visitor network address before forwarding an abuse-control token. Raw visitor addresses are not written to the Sheet or sent to Apps Script.

The public forest endpoint intentionally returns at most the first 2,000 privacy-safe tree coordinates, while dashboard totals continue to count all accepted Sheet rows. This keeps the public SVG responsive; it is a display cap, not a reporting cap.

## Accepted no-OTP limitation

The campaign owner chose to retain one pledge per normalized mobile number without SMS or WhatsApp OTP verification for this two-week pilot. Because first submissions receive a certificate while duplicates receive HTTP 409, a targeted caller can test whether a particular mobile number has already participated. This is an explicitly accepted residual privacy risk, not a fully mitigated condition.

Mandatory mitigations are the pseudonymous-client attempt limit, no public phone lookup, no participant details in public responses, no publication of the Sheet URL, truthful link-access disclosure, the two-week operating window, and post-campaign endpoint shutdown. Reassess OTP verification and restrict Sheet sharing before reusing the platform for a longer, higher-volume, or higher-sensitivity campaign.

## Sheet schema and administration

The script creates a `Pledges` worksheet with these fields:

- certificate ID
- participant name
- normalized mobile number
- submission timestamp
- locality ID
- address details
- pledge ID and pledge-version text
- consent version and consent timestamp
- campaign source
- privacy-safe digital-tree coordinates

The approved Google account owner administers the Sheet and can filter records or use **File → Download → Comma-separated values (.csv)** or Microsoft Excel format. No public administrator page or shared password is deployed. Under the owner-accepted link-sharing setting, anyone who obtains the Sheet URL can view stored names, mobile numbers, localities, and addresses; this is disclosed in the form and remains a material privacy risk.

## Data and privacy controls

- The browser never receives Google credentials, Sheet ID, or the Apps Script secret.
- The pledge API returns only an acceptance flag, locality-safe tree coordinates, and aggregate impact. Dashboard and tree routes use strict outbound response schemas.
- Participant names, mobile numbers, addresses, certificate IDs, and exact timestamps never appear in public API responses.
- Concurrent submissions are serialized while checking normalized-mobile uniqueness.
- Existing worksheet headers must exactly match the 13-column schema or Apps Script fails closed before reading or appending.
- Apps Script cache limits one pseudonymous client to 12 valid pledge attempts per ten minutes. Vercel platform protections remain the outer abuse-control layer.
- The gateway aborts Apps Script requests after eight seconds and rejects upstream responses larger than 256 KiB.
- Participant-controlled cells beginning with spreadsheet-formula characters are prefixed safely.
- Certificate sharing is participant-initiated; the application does not post automatically.
- Digital trees are campaign representations and do not claim a physical tree was planted.

Retention duration, data-access users, and the link-sharing risk require final stakeholder confirmation before production.

## Two-week shutdown and handoff

At the approved campaign end time:

1. Disable or remove the Vercel production deployment.
2. Export and reconcile final totals with the private Sheet.
3. Confirm the Sheet is owned by, or transferred to, the approved client-controlled Google account.
4. Remove Straw Labs editors who no longer need access.
5. Rotate/delete the Vercel `APPS_SCRIPT_SECRET` and remove `APPS_SCRIPT_URL`.
6. Disable the Apps Script web-app deployment so it no longer accepts submissions.
7. Apply the approved retention/deletion schedule to participant data.
8. Record written handoff and shutdown confirmation.

Site shutdown and participant-data deletion are separate decisions; do not delete campaign data without the approved handoff and retention instruction.

## Local development

Install the Vercel CLI and run:

```bash
npm install
npm install --global vercel
vercel dev
```

A complete pledge flow requires a configured test Sheet/Apps Script deployment and local `APPS_SCRIPT_URL`/`APPS_SCRIPT_SECRET` values. Never use the production Sheet for local QA.
