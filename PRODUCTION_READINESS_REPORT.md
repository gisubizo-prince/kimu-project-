# Kimu Production Readiness Audit

**Initial audit:** 2026-11-21  
**Remediation verification update:** 2026-11-22  
**Decision:** **NO-GO — production infrastructure and operational verification blockers remain.** No deployment was performed.

## Scope and evidence limits

This audit inspected the frontend and both backend directories, environment examples, API/auth/storage code, package manifests and lockfiles, certificate documentation, and available local test/build tools. Existing certificate tests and the production frontend build were run. `npm audit` was run against both package lockfiles. No live production configuration, hosting account, MongoDB deployment, browser automation/browser, or physical phone/printer was available. No secret values from the ignored backend `.env` were read. The audit did not modify application behavior or upgrade dependencies.

The main backend is `kimu-project-/kimu-backend`; the frontend is `kimu-project-/kimu-frontend/kimu-frontend`. There is also a nested `kimu-backend/kimu-backend` copy with a stale package manifest. Resolve which backend directory is authoritative before deployment.

## Executive findings

The initial audit found code and dependency blockers. The 2026-11-22 remediation update below records which code issues have since been fixed and tested. The application remains NO-GO because no production MongoDB, HTTPS domain, durable private storage, backup/restore, rollback, supported-runtime verification, or physical certificate print/scan checks are available in this workspace.

## Remediation update — 2026-11-22

The following code-level findings from the initial audit have been addressed in the workspace; these statements supersede the matching 2026-11-21 status rows below:

| Finding | Current status | Evidence |
|---|---|---|
| Admin can grant/promote super_admin | **PASS (tested API paths)** | Both staff registration and user management reject admin promotion; admins cannot edit super_admin accounts; last active super_admin cannot be demoted. These checks are in `controllers/userController.js` and `controllers/authController.js`, with assertions in `tests/certificate-api.test.js`. |
| CORS origin enforcement | **PASS (tested API paths)** | Unknown browser Origin requests are rejected; configured origins are normalized and credentials are disabled because the frontend uses bearer tokens. Live host origin behavior remains untested. |
| JWT secret/expiry/signing safeguards | **PASS (configuration/unit tests)** | Production startup validates secret length/placeholder, TLS Mongo URI, HTTPS origins, explicit 1 minute–24 hour expiry, storage path, and proxy hop count. JWT uses HS256 plus issuer/audience verification. `npm run test:security`: 5 passed. Production host values remain untested. |
| Mongo credential logging and 500/404 information disclosure | **PASS (unit tests)** | DB connection logs no longer contain the URI; generic 500/404 responses do not echo secret/query values. Verified by `tests/security-config.test.js`. Full log pipeline/redaction/monitoring remains unconfigured. |
| Startup drops Attendance index | **PASS (code inspection)** | Removed destructive index drop from `config/db.js`. Added an explicit dry-run/confirmed migration script at `scripts/remove-obsolete-attendance-index.js`; no production migration was executed. |
| Login/API/public verification rate limits | **PASS (code-level tests; deployment limitation)** | In-process IP limits are installed for general API, login, and public verification. Unit test checks 429 behavior; certificate API suite checks repeated login throttling. Counters are process-local, so deployment must remain single-instance until a shared store is implemented and tested. |
| Input-size/mass assignment findings | **PARTIAL** | Report PDF email is capped at 8 MB and signature-checked; generic employee/visitor routes reject unknown/operator/protected fields and escape search regexes; global parser limits are reduced. A complete validation review/test matrix for every endpoint remains outstanding. |
| Security headers | **PASS (configuration exists; host untested)** | API responses set baseline security headers; Vercel config adds CSP/HSTS and related headers. Actual host/TLS behavior has not been inspected. |
| Production frontend API fallback | **PASS (build guard)** | Production build rejects missing, HTTP, localhost, or non-`/api` `VITE_API_URL`. Verified missing config fails and configured HTTPS build succeeds. |
| Dependency advisories | **PASS (npm audit snapshot)** | `npm audit` returned 0 vulnerabilities for canonical backend, nested legacy backend launcher, and frontend lockfiles after compatible upgrades. Frontend Vite upgraded to 8.3.8, React Router to 7.18.6; vulnerable `xlsx` replaced by ExcelJS with patched uuid override. Recheck at release time. |
| Duplicate backend entrypoint | **PASS (configuration/code)** | Nested launcher now delegates to canonical parent server; manifest and lockfile include the same backend runtime requirements and audit clean. |
| User-provided XLSX export | **PASS (regression test)** | Replaced `xlsx` with ExcelJS and added `npm run test:exports`; worksheet names/data round-trip successfully (1/1). |
| Initial JavaScript chunk size | **PASS (build evidence)** | Converted page imports to route-level lazy loading. The entry JS is now about 192 kB; Vite still warns for the ~930 kB ExcelJS chunk, which loads only when spreadsheet export is requested. |
| Test database destructive scope | **PASS (isolated server)** | Certificate tests reject production mode and any inherited Mongo URI, then start a disposable MongoDB 7.0.14 memory-server and stop it during cleanup. They do not connect to the running MongoDB service. |
| Shutdown/readiness/storage code | **PARTIAL** | API health now reflects Mongo readiness, server handles SIGTERM/SIGINT and drains/ disconnects, and production startup requires an absolute storage path and applies restrictive POSIX directory permissions. Host lifecycle, filesystem ACL, and restart persistence are untested. |

Verification on this workspace: backend security tests **5/5 passed**; certificate integration suite **13/13 passed**; frontend Excel export test **1/1 passed**; Vite 8 production build succeeded with `VITE_API_URL=https://api.example.org/api`; npm audits for all three package roots reported **0 vulnerabilities**. The build still warns for the lazy ExcelJS chunk (~930 kB), loaded only when spreadsheet export is requested. Tests/build ran under Node 27 alpha; the configured Node 22.12+ LTS runtime still needs verification.

## Current blockers after remediation

1. No production MongoDB configuration/service is selected or verified (TLS, credentials, networking, least privilege, availability).
2. No production HTTPS domains/hosting configuration or live CORS/deep-link/header verification exists.
3. Durable private certificate storage is not provisioned. POSIX permissions are implemented, but Windows ACL and host volume permissions/persistence are not verified.
4. No MongoDB + certificate-volume backup/restore drill or coordinated rollback has been performed.
5. Rate-limit state is process-local; do not run multiple API instances until a shared store replaces it.
6. Production DB index migration/query explain plans are not tested. The old automatic drop is removed, but the new explicit migration has not been run against a reviewed target.
7. The full API validation/authorization/error test matrix, frontend browser/mobile/tablet/desktop states and console, and supported Node 22 runtime are not verified.
8. Printable PDF templates have not been visually inspected or physically printed/scanned with phone cameras. Legacy production certificate inventory is unknown.
9. Operational structured logging/monitoring/alerting and end-to-end audit retention/tamper protection remain unconfigured.

No deployment was performed. The decision remains NO-GO.

## Current local gate results — 2026-11-22

This section supersedes prior claims where newer evidence below differs. All execution was local. A separate disposable `mongod` used port 27018 and temporary databases; the workstation MongoDB service was not queried or modified. No production DB, host, domain, or paid service was accessed. Node.js 22.12.0 was downloaded locally and used for the listed test/build runs.

| Gate | Status | Evidence and remaining limit |
|---|---|---|
| Runtime baseline | **PASS (local suite runtime)** | `node --version` was 22.12.0 for the final backend security, certificate, backup/restore, frontend export tests, and production build. Browser smoke suite also previously passed under Node 22.12.0. This does not select or verify the production host runtime image. |
| Backend security tests | **PASS** | `npm run test:security`: 6/6 pass, including the new Mongoose AuditLog update/delete rejection. |
| Certificate backend suite | **PASS** | `npm run test:certificates`: 13/13 pass against an explicitly named loopback disposable DB. A test exposed certificate-number conflict handling; explicit pre-check and duplicate-key-to-409 handling were added. |
| Backup and restore | **PASS (local disposable drill)** | `npm run test:operations`: 1/1 pass. AES-256-GCM encrypted BSON EJSON/index and certificate-file backup restored into an empty second DB/new path; checksums, record counts and refusal to overwrite a populated target verified. Key came from a random test-only value. This is not a production schedule/volume or disaster-domain test. |
| Frontend automated export tests | **PASS** | `npm run test:exports`: 1/1 pass under Node 22.12.0. |
| Frontend production build | **PASS (build)** | Vite 8.3.8 build passed with `VITE_API_URL=https://api.example.org/api`. Entry JS is about 192 kB; the lazy workbook-export chunk remains about 930 kB and emits a warning. Placeholder domain means this is not production API configuration evidence. |
| SPA browser / API / PDF flow | **PASS (local browser smoke)** | Earlier `npm run test:spa`: 3/3 passed using local Chromium and isolated test DB. Deep-link/refresh at 390/768/1440 px, login/dashboard without unexpected console errors, public certificate verification, PDF browser download and one-page `%PDF-` validation passed. Browser binaries were removed after the test to free disk; no hosted browser run exists. |
| QR code | **PASS (automated decode); physical scan NOT TESTED** | Certificate backend test extracted the QR image embedded in the generated printable PDF and decoded it with jsQR to the exact public verification URL. Browser workflow loaded verification. A printed page and physical phone camera were not tested. |
| API routes | **PARTIAL** | Certificate/public verify/auth and key SPA requests were exercised. There is no comprehensive test of every Kimu API endpoint and every role/error path. |
| Rate limiting | **PASS (single-instance configuration only)** | Existing fixed-window process-local limits retain tested 429 behavior. Production Compose template has one API instance. Counters reset on process restart and cannot be shared across replicas; horizontal scaling remains BLOCKED until a shared store is implemented. |
| Production infrastructure files | **PARTIAL / NOT HOST-VERIFIED** | Added `deploy/production/compose.yaml`, API/web Dockerfiles, Nginx SPA fallback, Caddy HTTPS/reverse proxy/security headers, persistent named volumes, Prometheus scrape config, metrics endpoint and alert rules. Docker/Compose is not installed here, so image builds, Compose validation, ACME/DNS, TLS/CORS, firewall, and real volume persistence are NOT TESTED. Mongo is external and must be provisioned by the operator. |
| Monitoring and alert delivery | **PARTIAL** | Prometheus config/alerts cover API reachability, Mongo readiness, and high resident memory. Metrics endpoint is intentionally not routed through Caddy. A receiver/on-call target, credentials, notification delivery test, and long-term retention policy remain NOT CONFIGURED. |
| Audit-log protection | **PARTIAL / BLOCKER** | Mongoose update and delete methods reject mutation, tested 6/6 security suite. This is not tamper-proof against raw database access. Production least-privilege DB roles, immutable/remote retention, retention policy and monitoring are not provisioned or verified. |
| PDF storage security | **PARTIAL** | API private storage behavior and access tests remain passing; Compose defines a persistent non-public certificate volume. Actual deployment ACLs, backups from the mounted path, encryption-at-rest policy and restart persistence were not host-tested. |
| Rollback | **PARTIAL** | Empty-target DB and certificate-file restore procedure and drill are implemented/documented. No previous application image, Docker host, production recovery point or live cutover was available to test application rollback or coordinated production RPO/RTO. |
| Dependency audit | **PASS (current lockfiles)** | Final `npm audit` ran for canonical backend, nested legacy backend and frontend; each returned `found 0 vulnerabilities`. Recheck immediately before release because advisories change over time. |
| Physical printable template inspection | **NOT TESTED / BLOCKER** | Automated PDF parsing and QR decoding cannot prove visual alignment across actual certificate templates, print quality, or camera scan reliability. |
| Live production configuration and deployment | **NOT TESTED / BLOCKER** | No domain, hosting account, production Mongo, secret manager, alert receiver, paid infrastructure, or deployment was used. |

### Current blockers to a GO decision

1. Provision and verify production MongoDB TLS, networking, authentication, least-privilege collection permissions, backup policy, availability and restore access.
2. Select a host/domain, deploy only after approval, and verify Compose/container build, HTTPS/ACME, DNS, CORS, SPA refresh, security headers, private persistent volumes and restart behavior in a staging environment.
3. Configure an actual alert receiver and on-call destination; send and verify an alert; set monitoring and backup retention.
4. Replace or formally constrain process-local rate limits before any multi-instance deployment. Current template is single API instance only and restarts reset limits.
5. Add independent immutable/remote audit retention and production database permissions; current Mongoose guard does not make audit records tamper-proof.
6. Physically inspect representative printable certificate templates and scan printed QR codes with mobile devices.
7. Complete the full API authorization/validation/error matrix and review production index/query plans and legacy certificate migration inventory.
8. Re-run `npm audit` on every shipped lockfile after all changes and build/pin production container image digests. Docker is unavailable for local config validation.
9. Verify operational recovery with the selected host’s actual database and volume mechanisms, define RPO/RTO, and exercise application-image rollback. The local backup/restore drill is useful evidence but not production disaster-recovery proof.

**Decision: NO-GO.** Local code/build, certificate/QR flow, and an encrypted isolated backup/restore drill passed. The remaining blockers require real infrastructure identities, independent audit/alert configuration, a Docker-capable staging environment, or physical device/print checks. No deployment was performed.

## Requirement-by-requirement status

**Historical baseline:** The tables in this section reflect the 2026-11-21 inspection. For current status after code changes, use the 2026-11-22 remediation update and current blocker list above; those supersede any matching historical row below.

Status definitions: **PASS** means verified with evidence here; **FAIL** means a known defect or missing required safeguard; **NOT TESTED** means evidence could not be obtained in this environment; **BLOCKER** means it must be fixed or verified before production.

### 1. Security

| Requirement | Status | Evidence / finding |
|---|---|---|
| Authentication and authorization | **FAIL** | JWT middleware checks the token, reloads the active user, and role middleware checks the DB role (`kimu-backend/middleware/auth.js`). However, the role assignment vulnerability below allows privilege escalation. |
| Admin and super_admin permissions | **BLOCKER** | `controllers/userController.js` accepts arbitrary listed roles on create and allows `role` updates. `routes/userRoutes.js` permits both admin and super_admin, and `/api/auth/register` is similarly available to those roles while its controller accepts a requested role. An admin can create/promote a super_admin. Add a server-side policy reserving super_admin changes to an existing super_admin and test it. |
| JWT expiration and signing | **BLOCKER** | `utils/generateToken.js` signs with `JWT_SECRET` and defaults to a seven-day expiry. There is no startup validation that the secret exists/is strong, no explicit algorithm/issuer/audience policy, and no production expiry policy. `.env.example` contains a known placeholder secret. |
| Password hashing | **PASS (implementation only)** | `models/User.js` hashes with bcryptjs (`genSalt(10)`/`hash`) and compares hashes. This verifies code behavior, not the strength of production password policy or credential reset operations. |
| Environment variables and exposed secrets | **BLOCKER** | Backend `.env` is ignored by Git and untracked according to the audit, and its contents were not inspected. No production env/schema validation exists. `.env.example` uses a placeholder JWT secret, local MongoDB, and a sample seed-admin password. Production secret rotation and deployment secret inventory are unverified. |
| CORS | **FAIL** | Exact origin allowlist is used from `CLIENT_URL` plus development localhost; credentials are enabled; requests without an Origin are accepted. Production behavior is wrong if `CLIENT_URL` is missing, and CORS is not write-origin authorization. Configure and verify the exact HTTPS SPA origin. |
| Input validation and file uploads | **FAIL** | Certificate upload has useful 10 MB PDF signature/EOF/parser checks and rejects detectable signed PDFs (see certificate section). General middleware accepts JSON and URL-encoded bodies up to 50 MB. Report-email PDF Base64 has no endpoint-specific size/type limit. Audit found no consistent endpoint-level validation evidence for all APIs. |
| Rate limiting and brute-force protection | **BLOCKER** | No rate limiter or login lockout/throttling was found. Login and public verification endpoints can be repeatedly requested. |
| Security headers | **FAIL** | No Helmet/security-header middleware or CSP/HSTS configuration was found in the Express app. HTTPS/HSTS at a proxy is not configured or verified. |
| Dependency vulnerabilities | **BLOCKER** | `npm audit` reports 8 vulnerable package entries in each project, including a critical `proxy-addr` advisory in backend and high-risk advisories in runtime dependencies. Full advisory inventory is below. |
| Audit history protection | **NOT TESTED** | Certificate test covers audit events, but retention, access controls, tamper resistance, and production audit-log delivery/monitoring were not verified. |

#### npm audit advisory inventory

Audit results are for the checked-in lockfiles at audit time; fix availability and transitive versions should be rechecked after remediation. Severity labels below follow npm audit output. Affected package counts are not the same as advisory counts.

**Backend — 8 vulnerable packages: 3 moderate, 4 high, 1 critical.**

| Package / installed range | Severity | Advisories and impact |
|---|---|---|
| `body-parser` < 1.20.9 | High | `GHSA-27r3-jxmh-p828` — denial of service. |
| `brace-expansion` 4.0.0–5.0.11 (development dependency path) | High | `GHSA-q2hr-2g5m-vwhr`, `GHSA-qhr7-859c-m2p7`, `GHSA-6j4f-fj2g-mc7p` — excessive resource use / denial of service. |
| `minimatch` 7–11 (nodemon development path) | Moderate | `GHSA-g3hv-75wg-m249` — ReDoS. |
| `mongoose` 8.0–8.24.6 | High | `GHSA-gg4r-jv3p-qx3c`, `GHSA-wr5m-5jph-8m96`, `GHSA-8332-j7wj-wjw4`, `GHSA-6972-9mcm-vhwj` — query/operator and denial-of-service issues. |
| `nodemailer` <= 10.1.3 | High | `GHSA-6vj9-mwq6-2f5v` and advisories reported for address parsing, SMTP handling, and denial of service. It is used by `/api/reports/email`, so it is not merely an unused dependency. Review and resolve the complete npm audit output during remediation. |
| `proxy-addr` 1.1.0–2.0.7 | **Critical** | `GHSA-jqcg-44mw-7w3h` — spoofing/trust-boundary issue. The app has no Express `trust proxy` configuration, but the affected dependency remains installed and must be updated/re-audited. |
| `qs` 2.2.5–6.16.0 | Moderate | `GHSA-x5fp-wj9c-mxmx`, `GHSA-4mjr-xmp4-gh2g`, `GHSA-6pq8-jhm2-2vcw` — denial of service / resource exhaustion; used by extended URL-encoded parsing with a 50 MB cap. |

**Frontend — 8 vulnerable packages: 1 low, 3 moderate, 4 high.**

| Package | Severity | Advisories and impact |
|---|---|---|
| `dompurify` <= 3.4.16 | High | `GHSA-p98j-92pf-mc4p`, `GHSA-6688-9rhm-gjv2`, `GHSA-c6gr-qvv4-5v3f`, `GHSA-cg2g-xh64-v4q7`, `GHSA-mrv2-3pqr-j5jr` — DOM XSS in particular modes; transitive path should be traced and updated. |
| `esbuild` <= 0.24.2 | Moderate | `GHSA-67mh-4wv8-2f99` — dev-server request exposure; Vite toolchain path. |
| `follow-redirects` 1.16.0–1.16.1 | High | `GHSA-q3jh-wrc6-jgq8`, `GHSA-8r9p-f939-6h3c`, `GHSA-mrwp-f3q8-3g9p` — sensitive headers may be forwarded across redirects; Axios dependency path. |
| `react-router` affected 6.x/7.x ranges | Moderate | `GHSA-wrjc-x8rr-h8h6`, `GHSA-337j-9hxr-rhxg` — open redirect / URL handling issues. |
| `source-map-js` <= 1.2.1 | High | `GHSA-68fv-2mgg-jv7q` — denial of service in the build dependency path. |
| `xlsx` all versions | High | `GHSA-4r6h-8v6p-xvw6`, `GHSA-5pgg-2g8v-p4x9` — prototype pollution and ReDoS; no fix was reported. The app uses it for report workbook creation. |

The audit output indicates some remediation requires a major Vite upgrade and `xlsx` has no fixed release in the affected range. Do not apply blanket `npm audit fix --force`; update deliberately, assess compatibility, and rerun all tests/builds/audits.

### 2. Backend

| Requirement | Status | Evidence / finding |
|---|---|---|
| Production environment configuration | **BLOCKER** | No production config validation or hosting-specific backend configuration found. `.env.example` contains development defaults. |
| Database connection handling | **FAIL** | Startup requires `MONGO_URI` and exits on failure; connection timeout settings exist. However, failure logs interpolate the full Mongo URI (`config/db.js`), risking credential exposure. Startup also mutates indexes (see Database). |
| API error handling | **FAIL** | Central JSON handler handles several Mongoose/body parser errors, but sends arbitrary internal 500 `err.message` to clients and logs raw error objects. 404 includes request URL. A production-safe redaction policy and endpoint-wide error tests are absent. |
| All endpoints | **NOT TESTED** | Only certificate endpoints have a runnable project test script. This audit did not exercise every resource/auth/report/admin endpoint or all role combinations. |
| Logging and monitoring | **FAIL** | Plain console logs only; no structured logging, secrets redaction, request IDs, metrics, error tracking, alerting, or monitoring configuration was found. |
| Graceful shutdown | **FAIL** | `server.js` does not handle SIGTERM/SIGINT, stop accepting requests, or close the Mongo connection gracefully. |
| File storage permissions | **NOT TESTED (production)** | Certificate storage code/documentation uses opaque file names, non-static routes, and POSIX directory/file modes 0700/0600. Production volume ACLs, Windows ACLs, deployment persistence, and backup access were unavailable to verify. |
| Persistent storage configuration | **BLOCKER** | Certificate files use local filesystem storage. No production volume/host configuration is present or verified; ephemeral container disk would lose originals/printables. |

Additional backend finding: `/api/health` always reports success without checking MongoDB readiness, so it is not a reliable readiness signal.

### 3. Database

| Requirement | Status | Evidence / finding |
|---|---|---|
| Production MongoDB configuration | **BLOCKER** | No production URI/cluster configuration was reviewed; sample uses localhost. Network restrictions, TLS, authentication, IP allowlisting, and least-privilege DB user are not verified. |
| Indexes and query performance | **FAIL** | Schemas define indexes, including unique certificate/user indexes, but no explain plans, production data profiling, or load tests were performed. `config/db.js` automatically finds and drops a legacy Attendance unique index at every startup. Remove that boot-time destructive migration and apply a reviewed migration. |
| Backup and restoration | **BLOCKER** | No backup/restore procedure or successful restore drill was found. MongoDB data and certificate filesystem files must be backed up consistently. |
| Data migrations | **FAIL** | No general migration framework/runbook found. Legacy certificate migration is lazy and occurs when a staff user regenerates/replaces a PDF; it is not a complete migration process. |
| Test DB isolation from production | **FAIL** | Certificate tests set a random local Mongo database name and drop it after the suite, which avoids the configured `MONGO_URI`. However, there is no explicit production guard; if the test process can reach a production Mongo service at localhost or a forwarded port, it can create/drop a database there. Add a hard test-environment guard and use an isolated ephemeral DB. |

### 4. Frontend

| Requirement | Status | Evidence / finding |
|---|---|---|
| Production build | **PASS** | `npm run build` completed with Vite 5.4.21, 527 modules. It emits an 804.20 kB main JS chunk, above Vite’s 500 kB warning threshold. |
| API configuration | **BLOCKER** | `.env.example` and `src/services/api.js` default to `http://localhost:5000/api`. A production build without `VITE_API_URL` will point users’ browsers at their own localhost. No production URL was configured/verified. |
| Routing/page refresh | **PASS (configuration only)** | `BrowserRouter` application and `vercel.json` SPA rewrite to `/index.html` were found. Actual hosted deep-link refresh behavior is **NOT TESTED** because no deployed host was available. |
| Mobile/tablet/desktop layouts | **NOT TESTED** | No browser automation/browser was available; responsive layout behavior was not visually exercised. |
| Loading, empty, error states | **NOT TESTED** | No browser-driven user-flow inspection or frontend test suite exists in the manifest. |
| Browser console errors | **NOT TESTED** | No browser runtime was available. |

### 5. Certificate system

| Requirement | Status | Evidence / finding |
|---|---|---|
| QR generation | **PASS** | Certificate tests generate QR PNGs using the installed `qrcode` package and embed them into PDFs. |
| QR scanning | **PASS (automated)** | Tests extract the embedded PDF image and decode it with `jsqr`; decoded content equals the expected public verification URL. Physical phone-camera scanning and print-quality scanning are **NOT TESTED**. |
| Printable PDF layout | **NOT TESTED / production blocker** | Tests parse output and verify configured page/QR metadata, not visual fit on real certificate designs or print quality. The certificate document states QR placement does not detect existing artwork and can cover content. Review the generated printable output for each template before issuance. |
| Original PDF downloads | **PASS (automated)** | Certificate API tests verify staff-only original PDF delivery and public route does not expose the original. |
| Certificate verification | **PASS (automated)** | Tests cover the public verification endpoint and generated QR URL/token mapping. The deployed HTTPS SPA/API path is **NOT TESTED**. |
| Revocation and restoration | **PASS (automated)** | Certificate test suite covers status changes and public PDF policy behavior for revoked/restored records. |
| Private file access | **PASS (API behavior)** | Tests exercise protected original access and public printable policy. Storage is not mounted as static files; deployed filesystem ACL/isolation is **NOT TESTED**. |
| Legacy certificate migration | **PASS (automated path)** | Tests cover lazy migration during regeneration/replacement. Existing production record inventory and completion of migration are **NOT TESTED**. |
| Certificate test suite | **PASS** | `npm run test:certificates`: 13 tests passed, 0 failed, 0 skipped. This is certificate-specific, not a full product suite. |

Known certificate limitations from `kimu-backend/CERTIFICATE_PDF_QR.md`: QR overlay can cover source artwork; local filesystem persistence must be provisioned and backed up; S3/object storage is not implemented; legacy Base64 originals remain in Mongo until regeneration/replacement; signed PDFs containing `/ByteRange` are rejected; physical print and scan verification is outstanding.

### 6. Deployment

| Requirement | Status | Evidence / finding |
|---|---|---|
| Required environment variables identified | **FAIL (inventory below; no production values)** | Examples identify some variables, but defaults are development-oriented and no validated production environment contract/runbook exists. |
| Hosting requirements | **NOT TESTED** | No backend hosting/runtime configuration. Main backend requires persistent private filesystem storage unless storage architecture changes. Runtime version is unspecified; local checks ran under Node v27 alpha, not a supported production LTS verification. |
| Domain and HTTPS | **BLOCKER** | No domain/HTTPS setup or TLS termination config was available. QR links and API must use public HTTPS origins; `PUBLIC_APP_URL` accepts HTTP and falls back to localhost. |
| Database hosting | **BLOCKER** | Production MongoDB service, TLS, network policy, backups, and app credentials are not configured/verified. |
| Persistent storage | **BLOCKER** | A durable private volume is required for originals and printable PDFs. No deployment volume setup or recovery verification exists. |
| Deployment instructions | **FAIL** | No deployment runbook/configuration found. Certificate technical documentation exists but is not a complete production deployment guide. |
| Rollback instructions | **FAIL** | No application/database/file rollback procedure or restore point procedure found. |
| Deployment performed | **PASS (not performed as requested)** | No deployment or external production change was made. |

#### Environment inventory for a future deployment

Backend variables identified in code/docs: `NODE_ENV=production`, `PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL` (exact HTTPS SPA origin), `PUBLIC_APP_URL` (HTTPS SPA origin used in QR URLs), `CERTIFICATE_STORAGE_DIR` (private persistent volume), `PDF_QR_PAGE`, `PDF_QR_SIZE_MM`, `PDF_QR_MARGIN_MM`, `PDF_QR_CORNER`, `ALLOW_PUBLIC_PDF_WHEN_REVOKED`, and `ALLOW_PUBLIC_DOWNLOAD`. The seed script also reads `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and `SEED_ADMIN_NAME`; use only for a controlled one-time operation and remove/rotate those credentials afterward. Email reports require `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` (optional fallback to user), and `REPORT_RECIPIENT_EMAIL`.

Frontend build variable: `VITE_API_URL`, set to the HTTPS API base such as `https://api.example.org/api`. Vite variables are embedded in the client bundle and must not contain secrets.

Hosting needs a supported Node.js LTS version pinned/documented, an HTTPS public SPA origin, an HTTPS API origin with correct CORS, a production MongoDB deployment with TLS/network controls, and private durable backend storage. The Vercel rewrite is the only SPA hosting behavior found; actual hosting is not selected or verified.

#### Rollback requirements (not yet validated)

Before any future release, take a verified MongoDB backup and a coordinated snapshot of the certificate storage volume. Apply database/index changes as explicit, reviewed migrations with a documented reverse/forward recovery plan. Keep the previous application artifact and environment configuration available. Roll back the app only when its schema and file format remain compatible; otherwise restore the matching database and file snapshot together. Perform a restore drill before production. These are required instructions, not a tested rollback procedure.

## Required blockers before production

1. Remove admin-to-super_admin escalation and test all role creation/update paths.
2. Resolve all production runtime dependency advisories, especially backend `proxy-addr`, `mongoose`, and `nodemailer`; resolve or document a safe mitigation for frontend `xlsx`; rerun audits.
3. Add mandatory production configuration validation, strong secret requirements/rotation, explicit JWT policy, and HTTPS-only public origins.
4. Add login/API rate limits and security headers; review all request validation and enforce strict upload/email payload limits.
5. Stop logging MongoDB credentials; sanitize 500 responses and logs.
6. Remove automatic index deletion at application startup; create a reviewed migration and verify query/index performance.
7. Add graceful shutdown and reliable readiness/health checks.
8. Provision production MongoDB, private persistent certificate storage, coordinated backups, and demonstrate restoration.
9. Configure and verify production frontend API URL, DNS/TLS, CORS, host SPA fallback, and supported Node LTS runtime.
10. Visually inspect printable PDFs and scan QR codes with physical mobile devices; validate all certificate templates and legacy-record migration plan.
11. Add whole-API automated tests, test-database production guard, frontend interaction/responsive tests, and operational deployment/rollback runbooks.

**Current final conclusion:** Critical code-level role escalation and the audited dependency advisories have been remediated and verified in local tests. The application is still **not production-ready** because production infrastructure, durable storage, backups/restores, rollback, supported Node 22 verification, multi-instance rate-limit architecture, and real browser/print checks remain unverified or incomplete. No deployment was performed.
