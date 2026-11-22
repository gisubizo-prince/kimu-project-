# Kimu Production Remediation Plan

**Prepared:** 2026-11-22  
**Source:** `PRODUCTION_READINESS_REPORT.md`  
**Current state (2026-11-22):** Code remediation has begun. Verified code fixes are recorded in the progress section below. Production infrastructure and deployment verification remain incomplete. No deployment was performed.

## How to read this plan

Items are ranked by combined exploitability, data/security impact, and likelihood of preventing a safe production launch. “Exact files” lists code/config files identified by the audit. Where a blocker is caused by absent production infrastructure, the report cannot name a responsible existing file; the plan identifies the runbook/configuration artifacts that will need to be created once the target host is selected.

The safest sequence is to address P0 authorization and secrets first, then request/dependency safeguards, then database/data integrity and operational readiness, then production infrastructure and visual verification. Do not compensate for a failing test by loosening authorization, validation, or security policy.

## Ranked remediation backlog

### P0 — Stop privilege escalation

**Audit items:** Admin/super_admin permissions (BLOCKER); authentication and authorization (FAIL).

**Exact files:**

- `kimu-backend/controllers/userController.js`
- `kimu-backend/controllers/authController.js`
- `kimu-backend/routes/userRoutes.js`
- `kimu-backend/routes/authRoutes.js`
- `kimu-backend/middleware/auth.js`
- `kimu-backend/models/User.js`
- New/expanded auth and user route tests under `kimu-backend/tests/`

**Root cause:** User creation and update accept caller-supplied `role`; both user-management and staff-registration routes allow admins. The route guard permits an admin to submit `super_admin`, and update can promote an existing account. Authorization checks correctly use the current database role, but do not constrain who may assign privileged roles.

**Safest solution:** Enforce role-assignment policy server-side in controllers/service logic, independent of route visibility. Admins may create/manage only the roles the product explicitly permits; only an existing super_admin may grant, revoke, or modify super_admin privileges. Reject forbidden requested roles explicitly rather than silently downgrading. Protect the last active super_admin from accidental demotion/deactivation. Preserve existing user response shape and ordinary staff creation flow. Add audit records for privilege changes with actor, target, and before/after role.

**Possible breaking changes:** Admin UI or integrations that currently create/promote super_admin accounts through the admin endpoint will receive 403/400 and require a super_admin workflow. Existing user list/create/update contracts should otherwise remain stable. Last-super-admin protection may reject previously accepted updates.

**Required tests:**

- Admin cannot create `super_admin` through either `/api/users` or `/api/auth/register`.
- Admin cannot promote, demote, deactivate, or otherwise alter a super_admin account.
- Super_admin can perform permitted role changes and normal account operations.
- Requests missing roles, unknown roles, and invalid target IDs return safe validation errors.
- A failed privilege change leaves the database and audit history unchanged; successful changes create the expected audit event.
- Existing role authorization tests confirm normal endpoints still accept/reject the correct roles.

### P0 — Enforce production secrets and safe JWT policy

**Audit items:** JWT expiration/signing (BLOCKER); environment variables/secrets (BLOCKER); production environment configuration (BLOCKER).

**Exact files:**

- `kimu-backend/server.js`
- `kimu-backend/utils/generateToken.js`
- `kimu-backend/middleware/auth.js`
- `kimu-backend/.env.example`
- `kimu-backend/kimu-backend/.env.example` and nested backend manifests/config if that copy remains supported
- `kimu-frontend/kimu-frontend/.env.example`
- New production environment validation module and tests

**Root cause:** `JWT_SECRET` is read at signing/verification time without startup checks. The sample configuration contains a placeholder secret, a seven-day default token lifetime, localhost URLs, and a sample seed password. No single validated production environment contract distinguishes development from production. JWT verification does not constrain the algorithm or validate issuer/audience.

**Safest solution:** Add a startup configuration schema that fails closed in production for absent/placeholder/weak secrets, invalid Mongo URI, non-HTTPS public origins, and invalid expiry. Establish a short, documented production token lifetime and explicit algorithm, issuer, and audience on both signing and verification. Define a rotation procedure and decide how existing tokens are invalidated during secret rotation. Replace sample credentials in examples with unmistakable non-credential placeholders and document that examples are not deployable. Keep development convenience only behind explicit non-production mode. Decide which backend directory is canonical and ensure examples match it.

**Possible breaking changes:** Existing deployments relying on an implicit seven-day expiry or missing environment variables will fail startup or require fresh login after secret rotation. Tokens issued before issuer/audience enforcement may stop working. Environment templates change; production operators must supply complete config before launching.

**Required tests:**

- Production startup rejects missing, short, placeholder, or malformed secrets/configuration with safe messages that do not reveal values.
- Development/test configuration remains explicit and testable.
- JWTs have expected expiry, algorithm, issuer, and audience; verification rejects wrong algorithm, issuer, audience, expired token, and invalid signature.
- Rotation procedure test verifies old-token invalidation behavior.
- Secret values never appear in startup logs or API errors.

### P0 — Remove credential disclosure and unsafe internal error responses

**Audit items:** Database connection handling (FAIL); API error handling (FAIL); logging and monitoring (FAIL).

**Exact files:**

- `kimu-backend/config/db.js`
- `kimu-backend/middleware/errorHandler.js`
- `kimu-backend/server.js`
- Other logging call sites as found during implementation
- Tests for DB startup and HTTP error responses

**Root cause:** DB connection failure interpolates the full Mongo URI into logs. The error handler returns arbitrary 500 error messages to clients, logs raw error objects, and exposes route URLs in 404 text. Console-based logging has no consistent redaction policy.

**Safest solution:** Never log credential-bearing URIs or raw sensitive request data. Log a sanitized error code, safe host/database metadata where appropriate, and a correlation ID. Return a stable generic 5xx response to clients while retaining sanitized diagnostics server-side. Keep validation/known client errors useful and specific. Adopt structured logging with redaction for passwords, tokens, cookies, authorization headers, and URI credentials; avoid logging uploaded PDF bytes or base64.

**Possible breaking changes:** Clients may stop receiving raw database or internal error text and instead receive generic error messages/codes. Operational log formats will change; log queries/alerts may need adjustment.

**Required tests:**

- Simulated DB connection failure produces logs without username/password/URI secret.
- Synthetic internal exception returns a generic 500 body without stack/path/secret while retaining a traceable correlation ID.
- Known 400/409/503 mappings remain compatible and safe.
- Captured logs redact bearer tokens, passwords, cookies, email credentials, and PDF payloads.
- 404 behavior does not echo sensitive query values.

### P0 — Eliminate boot-time destructive database migration

**Audit items:** Indexes/query performance (FAIL); database connection handling (FAIL).

**Exact files:**

- `kimu-backend/config/db.js`
- `kimu-backend/models/Attendance.js`
- New explicit migration script and migration tests/runbook

**Root cause:** Every successful backend startup inspects Attendance indexes and automatically drops an old unique compound index. This couples application availability to a destructive schema mutation and gives routine deploys implicit database privileges/side effects.

**Safest solution:** Remove index deletion from connection startup. Create an explicit, versioned, idempotent migration with preflight inspection, expected-index checks, dry-run/report mode, controlled operator execution, and documented recovery. Confirm the intended replacement uniqueness/index behavior against real data before dropping anything. Do not execute migration against production during this planning phase.

**Possible breaking changes:** Existing databases may retain the old index until migration is explicitly run; duplicate attendance records previously rejected by that index may become possible if no replacement constraint is chosen. Migration execution becomes an operational step.

**Required tests:**

- Normal app boot never drops or creates/removes this legacy index.
- Migration dry-run reports intended changes without mutation.
- Migration is idempotent and refuses unsafe/ambiguous data states.
- Tests verify new uniqueness/query behavior and duplicate handling.
- Run explain-plan/index checks against representative data before approving the migration.

### P0 — Upgrade and disposition every npm audit finding

**Audit items:** Dependency vulnerabilities (BLOCKER).

**Exact files:**

- `kimu-backend/package.json`, `kimu-backend/package-lock.json`
- `kimu-frontend/kimu-frontend/package.json`, `kimu-frontend/kimu-frontend/package-lock.json`
- Potentially `kimu-backend/kimu-backend/package.json` and nested lockfile if that entrypoint is retained
- Import/use sites for `xlsx`, Axios, router, and PDF tooling, including `kimu-frontend/kimu-frontend/src/`

**Root cause:** Lockfiles contain vulnerable direct/transitive package versions. The backend includes a critical `proxy-addr` advisory and high advisories affecting `mongoose`, `nodemailer`, `body-parser`, and related packages. The frontend includes high advisories in `follow-redirects`, `source-map-js`, `dompurify`, and `xlsx`, plus toolchain/router advisories. Some upgrades may require major-version changes; the report noted no available fix for the installed `xlsx` advisory range.

**Safest solution:** Re-run `npm audit` against both canonical manifests before changes to refresh the exact advisory data. Update direct dependencies and lockfiles in small, reviewed groups; prefer compatible patched releases. For major Vite/router changes, review migration notes and maintain feature behavior. For `xlsx`, determine whether a maintained safe replacement can preserve workbook export; otherwise isolate the feature, constrain all generated data, and document a time-bound risk decision. Do not suppress advisories or apply `--force` without compatibility review. Remove unused vulnerable packages only after confirming no runtime use. Review nested duplicate backend and eliminate ambiguity or keep its dependency graph equally patched.

**Possible breaking changes:** Major Vite, React Router, Mongoose, or Nodemailer upgrades can change build behavior, route behavior, database casting/query semantics, or mail delivery. Replacing `xlsx` may alter workbook layout/export compatibility. Lockfile changes may alter transitive packages and bundle output.

**Required tests:**

- `npm audit` for each deployed production dependency graph; no unresolved critical/high runtime finding without an explicitly accepted mitigation.
- Backend certificate suite plus full API/auth/report integration tests after updates.
- Frontend production build and workbook export regression tests, routing tests, and browser smoke tests.
- Mail tests with a local SMTP test server, including malformed/oversized input and transport failure.
- Verify the deployed backend dependency tree and frontend bundle do not include an unreviewed vulnerable package.

### P1 — Add request throttling and brute-force controls

**Audit items:** Rate limiting/brute-force protection (BLOCKER).

**Exact files:**

- `kimu-backend/app.js`
- `kimu-backend/routes/authRoutes.js`
- `kimu-backend/controllers/authController.js`
- `kimu-backend/routes/certificateRoutes.js`
- New rate-limit configuration and API tests

**Root cause:** No rate limiting or login lockout exists. Public login and certificate verification endpoints can be called repeatedly. Proxy topology is not configured, so IP-based throttles may be incorrect if introduced without a trusted-proxy policy.

**Safest solution:** Apply a strict, configurable limiter to login and sensitive public verification routes, plus sensible general API limits. Use a shared store if multiple API instances are expected. Configure trusted proxies only for known infrastructure hops. Avoid permanent account lockout that attackers could use to deny service; use progressive delay/temporary throttling and generic login errors. Ensure rate-limit responses include retry guidance without exposing account existence.

**Possible breaking changes:** Legitimate users behind shared NATs may reach limits; clients may receive 429 responses. Multi-instance deployments require shared counter storage for consistent limits.

**Required tests:**

- Repeated failed logins trigger throttling; success and failure responses do not disclose whether an account exists.
- Throttling keys do not trust spoofed forwarding headers from untrusted peers.
- Correctly configured trusted proxy behavior is tested for the selected hosting topology.
- Public verification limits do not prevent ordinary scans and return predictable 429 responses.
- Multi-instance/shared-store behavior is tested if horizontal scaling is planned.

### P1 — Add security headers and enforce HTTPS origin policy

**Audit items:** Security headers (FAIL); CORS (FAIL); domain and HTTPS (BLOCKER).

**Exact files:**

- `kimu-backend/app.js`
- `kimu-backend/routes/certificateRoutes.js` (public URL creation/validation)
- `kimu-backend/.env.example`
- Hosting/reverse-proxy configuration to be created after host selection
- Frontend hosting config `kimu-frontend/kimu-frontend/vercel.json` if Vercel remains the host

**Root cause:** No Helmet/CSP/security-header policy exists. CORS accepts requests without an Origin and depends on `CLIENT_URL`; localhost fallback can be active if production config is missing. QR URL construction accepts HTTP and has a localhost fallback. CORS does not itself protect state-changing requests from cross-site calls.

**Safest solution:** Add a reviewed header policy (Helmet or equivalent) with CSP compatible with the application, frame/content-type/referrer policies, and HSTS only at an HTTPS boundary that is known to be correct. Require exact configured HTTPS SPA and API origins in production and fail startup if absent or invalid. Keep no-Origin compatibility only where justified for non-browser/service calls; separately use authentication/CSRF protections appropriate to credential usage. Require `PUBLIC_APP_URL` to be a public HTTPS origin in production and remove localhost fallback there. Configure TLS and redirects at the selected edge.

**Possible breaking changes:** CSP may block existing inline scripts, image sources, fonts, or API connections until inventoried. Strict origin checks may break undocumented client domains and local tools. HTTPS enforcement may reject HTTP staging configurations.

**Required tests:**

- Production startup rejects absent/HTTP/localhost public origins.
- CORS allows configured origin and rejects unconfigured browser origins; preflight behavior is tested.
- Authenticated mutations are not treated as protected merely because CORS blocks a browser; add CSRF coverage if cookie auth is used in future.
- Security headers are present and CSP allows required app assets while blocking a test inline script.
- Generated QR target is the correct HTTPS verification route for configured public SPA origin.
- Hosted TLS, redirects, and HSTS are verified in the selected staging environment before production.

### P1 — Establish strict request validation and upload limits

**Audit items:** Input validation/file upload security (FAIL).

**Exact files:**

- `kimu-backend/app.js`
- `kimu-backend/controllers/reportController.js`
- `kimu-backend/routes/reportRoutes.js`
- `kimu-backend/routes/certificateRoutes.js`
- `kimu-backend/controllers/authController.js`
- `kimu-backend/controllers/userController.js`
- Shared resource controllers/routes and all API request validators under `kimu-backend/controllers/` and `kimu-backend/routes/`

**Root cause:** Global JSON and URL-encoded parsers accept 50 MB. The report email controller converts caller-provided base64 to a PDF buffer without endpoint-specific byte, MIME/signature, filename, or metadata length checks. The certificate route has stricter checks, but validation is not demonstrated consistently across all endpoints.

**Safest solution:** Set small global body limits appropriate to normal API payloads and use a dedicated, explicitly bounded certificate upload transport/limit. Validate report PDF data length before decoding, verify the decoded PDF signature and size, restrict metadata fields/lengths, and prevent header/path injection in filenames. Add schema/allowlist validation for each route; reject unknown fields rather than passing broad request bodies into updates. Preserve current request shapes where possible, with errors documented.

**Possible breaking changes:** Previously accepted large JSON payloads, malformed/oversized PDFs, unknown fields, or unusual text lengths will be rejected. Frontend certificate/report uploads must follow the documented limits and field formats.

**Required tests:**

- Boundary tests at exactly allowed size and one byte over for JSON, certificate PDF, and emailed report PDF.
- Invalid base64, wrong file signature, truncated PDF, mismatched MIME/name, unsafe filename, and malformed metadata are rejected without persistence or email send.
- Unknown fields cannot mutate protected fields such as role, audit actor, storage keys, or ownership.
- Validation errors are stable and do not leak stack/paths.
- Regression tests cover existing valid resource, report, and certificate request contracts.

### P1 — Make DB readiness and shutdown safe

**Audit items:** Graceful shutdown (FAIL); health readiness finding; production database connection handling (FAIL).

**Exact files:**

- `kimu-backend/server.js`
- `kimu-backend/app.js`
- `kimu-backend/config/db.js`
- New lifecycle integration tests

**Root cause:** The health endpoint returns success regardless of MongoDB connection state. Server startup listens after connecting, but no SIGTERM/SIGINT handlers stop accepting traffic or close HTTP/Mongoose resources. Connection errors log the credential-bearing URI (covered under P0 error handling).

**Safest solution:** Separate liveness from readiness. Readiness should report unavailable until Mongo is connected and after disconnection; liveness should only indicate process health. On termination, stop accepting new requests, wait a bounded time for in-flight requests, close MongoDB, and exit with appropriate status. Do not use readiness as a public information endpoint beyond necessary status.

**Possible breaking changes:** Orchestrator health checks may begin returning 503 during DB outages instead of 200. Shutdown can take a bounded delay; hosting grace periods must be configured accordingly.

**Required tests:**

- Health/readiness reports unavailable before DB connection and after disconnection, ready when connected.
- SIGTERM/SIGINT closes listener and DB within configured grace window.
- In-flight request drain and timeout behavior are tested.
- Startup failure does not leave a listening server or leak secrets.

### P1 — Configure production MongoDB and verify index/query behavior

**Audit items:** Production MongoDB config (BLOCKER); index/query performance (FAIL).

**Exact files:**

- `kimu-backend/config/db.js`
- `kimu-backend/models/*.js` (all schema indexes; especially `Attendance.js`, `Certificate.js`, `User.js`)
- `kimu-backend/.env.example`
- New database runbook and migration scripts

**Root cause:** Only localhost/example URI is present. The audit could not verify production TLS, authentication, network allowlists, least privilege, replica/availability settings, indexes on representative production data, or slow query behavior.

**Safest solution:** Select and configure a managed/operated MongoDB target with TLS, private network access, dedicated least-privilege application credentials, restricted administrative access, and documented connection pool/timeouts. Review every model index against query patterns and actual cardinality. Validate with explain plans and representative data. Keep schema/index mutation in explicit migrations.

**Possible breaking changes:** Tightening network/user permissions may reveal undocumented queries or operational scripts. New/changed unique indexes may fail on duplicate production data. Performance settings can change connection pressure.

**Required tests:**

- Staging connection verifies TLS, auth, restricted network path, and intended database identity.
- Startup refuses test/local DB in production mode unless explicitly permitted for a controlled local test setup.
- Explain-plan and load tests cover frequent list/search/dashboard/certificate operations.
- Index migration preflight reports duplicate conflicts and does not mutate on conflict.
- Verify app identity cannot create/drop databases or indexes during normal runtime unless explicitly required.

### P1 — Add safe test database isolation guard

**Audit items:** Test database isolation from production (FAIL).

**Exact files:**

- `kimu-backend/tests/certificate-api.test.js`
- Future backend test files
- `kimu-backend/package.json`
- Optional CI test workflow (not present; create only after CI platform is selected)

**Root cause:** The current test replaces `MONGO_URI` with a randomized local database and drops it during teardown, but no guard prevents execution in a production environment or against an unexpected Mongo host/forwarded port.

**Safest solution:** Require an explicit test-mode sentinel and validate the Mongo database name/host before any destructive test setup. Prefer a disposable ephemeral Mongo instance or isolated container and refuse a production `NODE_ENV`, production URI markers, non-loopback host, or unexpected database name. Teardown should only drop the exact database created by the test.

**Possible breaking changes:** Existing developers/CI invoking tests without the required test sentinel will receive an intentional early failure and need to use the documented test command/environment.

**Required tests:**

- Test startup refuses `NODE_ENV=production`, Atlas/remote URI, wrong DB name, and missing test sentinel before connecting/dropping anything.
- Happy-path test uses a unique disposable database and removes only that database.
- Injected teardown failure does not target another DB.
- Run all backend tests in CI against the ephemeral DB.

### P1 — Bound and harden report email delivery

**Audit items:** Input validation/file upload security (FAIL); dependency risk for Nodemailer (BLOCKER); rate limiting (BLOCKER).

**Exact files:**

- `kimu-backend/controllers/reportController.js`
- `kimu-backend/routes/reportRoutes.js`
- `kimu-backend/app.js`
- `kimu-backend/package.json` / lockfile
- Report API tests

**Root cause:** A broad 50 MB JSON parser feeds a base64 decoder and Nodemailer attachment. Request-level size/type checks and email-specific throttling are absent. Nodemailer has reported advisories and is used by this endpoint.

**Safest solution:** Define a small maximum PDF byte size and strict metadata validation; validate decoded PDF bytes, not only a supplied data URI. Rate-limit the endpoint, set safe attachment filename/content type, use patched Nodemailer, and configure transport timeouts. Consider a controlled server-side report generation path if client-supplied PDFs are not required by the contract.

**Possible breaking changes:** Large report PDFs and invalid data URI formats will be rejected. Email sending may return 429 under limits; transport timeout behavior may be more explicit.

**Required tests:**

- Valid small PDF sends exactly one attachment with expected bytes and safe name.
- Invalid/oversized/non-PDF input sends no email.
- Missing or malformed SMTP config returns a generic operational error without exposing credentials.
- SMTP timeout/failure returns appropriate status and sanitized logs.
- Rate limiting and all supported report types are tested.

### P1 — Provision persistent private certificate storage and recovery

**Audit items:** Persistent storage configuration (BLOCKER); production file permissions (NOT TESTED); backups/restoration (BLOCKER); private-file production verification.

**Exact files:**

- `kimu-backend/services/certificateStorage.js`
- `kimu-backend/routes/certificateRoutes.js`
- `kimu-backend/models/Certificate.js`
- `kimu-backend/CERTIFICATE_PDF_QR.md`
- New host volume/secret configuration and operations/backup runbook (target host not yet selected)

**Root cause:** Originals and printable PDFs are stored on local disk. Application code/documentation describes POSIX modes, but no actual production volume, ACL, durability, backup, restore, capacity, or multi-instance access was verified. Ephemeral disk loss would orphan DB records or destroy files.

**Safest solution:** Select a durable private volume mounted only by the backend, enforce least-privilege access and non-public routing, and include it in coordinated backups with MongoDB. Validate atomic write/replace/recovery behavior and capacity monitoring. If multiple backend instances need access, select shared durable storage or an object-storage design before scaling; do not assume local instance disk is shared. Keep original-download authorization and public printable policy unchanged.

**Possible breaking changes:** Path/permissions and startup behavior may change. Existing local files need a controlled copy/migration. Shared storage latency/consistency may affect upload and regeneration. Switching to object storage would be a broader API/storage migration and is not required if one durable volume meets the operational model.

**Required tests:**

- Deployment test confirms file modes/ACLs, non-static access, and authorized-only original download.
- Restart/redeploy preserves original and printable files and checksums.
- Backup and restore reconstruct both DB metadata and file bytes; checksums match.
- Failure-injection covers disk-full, interrupted write, replacement, regeneration, and cleanup.
- Confirm public routes never return original bytes, including revoked/archived policy cases.

### P1 — Define production backup, restore, migration, and rollback procedures

**Audit items:** Backup/restore (BLOCKER); data migrations (FAIL); deployment instructions (FAIL); rollback instructions (FAIL); legacy migration completion (NOT TESTED).

**Exact files:**

- `kimu-backend/config/db.js`
- `kimu-backend/models/Attendance.js`, `Certificate.js`, and other models involved in migrations
- `kimu-backend/CERTIFICATE_PDF_QR.md`
- New `DEPLOYMENT.md`, `OPERATIONS.md`/backup-restore and rollback runbooks, and versioned migration scripts

**Root cause:** No general migration framework, production deployment guide, backup/restore drill, or coordinated app/database/file rollback exists. Legacy certificate migration is lazy per record; current docs do not provide a complete production inventory/completion plan.

**Safest solution:** Choose a migration mechanism and make changes explicit, versioned, observable, and idempotent. Document deploy order, preflight, backup, migration, smoke checks, rollback criteria, and recovery. Take coordinated MongoDB and file-storage backups; conduct a restore drill. Inventory certificates with Base64 originals and missing printable files, plan a reversible batch migration with checksums and resumability, and retain the legacy read path until verified. Pin application release artifacts and document schema compatibility for rollback.

**Possible breaking changes:** Migration may surface malformed legacy PDFs or duplicate/index conflicts. Removing lazy legacy code before completion could make old certificates inaccessible. Rollbacks across incompatible schema/files require paired data restore and may lose writes since snapshot.

**Required tests:**

- Migration dry-run, resume, duplicate-run/idempotence, partial failure, and checksum reconciliation.
- Restore drill verifies representative records, audit history, original files, printable files, and public verification.
- Rollback drill verifies app version and matching DB/storage state.
- Document legacy-record counts and prove zero remaining or an approved compatibility plan.
- Operational runbook reviewed and executed in staging by a second operator.

### P1 — Make frontend production API configuration fail safely

**Audit items:** Frontend API configuration (BLOCKER); required deployment variables (FAIL).

**Exact files:**

- `kimu-frontend/kimu-frontend/src/services/api.js`
- `kimu-frontend/kimu-frontend/src/pages/Certverify/VerifyCertificate.jsx`
- `kimu-frontend/kimu-frontend/.env.example`
- `kimu-frontend/kimu-frontend/vite.config.js`
- Frontend build/hosting configuration

**Root cause:** Both shared API client and certificate verification page use `http://localhost:5000/api` as a fallback. A production build without `VITE_API_URL` sends users to their own machine. The successful prior build did not prove a production endpoint was set.

**Safest solution:** Require `VITE_API_URL` for production build and validate that it is HTTPS and points to the intended API base. Centralize API URL resolution so certificate verification does not maintain a second default. Use an explicit development fallback only for local dev. Add a build-time check that fails on localhost/HTTP production values and document the Vite variable as public configuration, never a secret.

**Possible breaking changes:** Production builds without configuration intentionally fail. Existing custom builds may need the variable set; malformed path suffixes could be rejected.

**Required tests:**

- Production build fails when URL is unset, localhost, or non-HTTPS; succeeds for the correct HTTPS base.
- Dev server continues to work with documented local URL.
- API client and QR verification page both call the same configured API origin/base.
- Production bundle scan finds no localhost API URLs or secrets.

### P1 — Define hosting, domain, Node runtime, and SPA refresh behavior

**Audit items:** Hosting requirements (NOT TESTED); domain/HTTPS (BLOCKER); required environment inventory (FAIL); route refresh (live behavior NOT TESTED).

**Exact files:**

- `kimu-backend/package.json` and backend runtime/bootstrap files
- `kimu-frontend/kimu-frontend/package.json`
- `kimu-frontend/kimu-frontend/vercel.json`
- New deployment guide/host config after platform selection

**Root cause:** No deployment provider or backend hosting configuration is specified, no Node `engines`/runtime pin exists, and Vercel SPA fallback is the only host routing config. Domain/TLS/API URLs and production environment are not configured.

**Safest solution:** Select and document supported Node LTS versions, backend/frontend hosts, TLS termination, DNS, API origin, environment variable injection, health checks, logs, storage mount, and scaling assumptions. Ensure the chosen host serves SPA deep links and uses immutable/reproducible build artifacts. Make the report’s environment inventory into a validated deployment checklist.

**Possible breaking changes:** Pinning Node can require dependency/toolchain adjustments. Changing hosts may require rewrite/proxy configuration and CORS updates. Force HTTPS can break old HTTP bookmarks or integrations.

**Required tests:**

- Build and test on the pinned Node LTS version, not Node 27 alpha.
- Staging HTTPS check for SPA, API, QR link, and CORS.
- Deep-link refresh on all registered routes returns the SPA entry point.
- Production artifact has expected API endpoint and no development defaults.
- Staging health checks, persistent volume, logs, and restart behavior verified.

### P2 — Add whole-API security and behavior test coverage

**Audit items:** All endpoints (NOT TESTED); input-validation FAIL; deployment readiness evidence.

**Exact files:**

- `kimu-backend/package.json`
- `kimu-backend/routes/` and `controllers/`
- Existing `kimu-backend/tests/certificate-api.test.js`
- New route/auth/resource/report/admin tests and CI configuration (platform to be selected)

**Root cause:** Only `test:certificates` exists as a project test script. No evidence confirms every non-certificate endpoint, role combination, failure mode, or general API contract.

**Safest solution:** Build a route inventory and add focused integration tests against isolated test infrastructure. Test authorization and validation at route boundaries, persistence and audit where applicable, and error/status contracts. Preserve known API contracts unless a security fix requires a documented change. Keep tests independent and deterministic; do not use production credentials/data.

**Possible breaking changes:** Tests may uncover inconsistent current contracts that require frontend/API coordination. New test setup requires isolated Mongo and possibly SMTP/browser mocks.

**Required tests:**

- Route inventory coverage for auth/users/admin, students, attendance, reports, contacts, testimonials, drivers, notifications, and certificates.
- Role matrix tests for each protected route.
- Persistence, validation, not-found, duplicate, database outage, and error-redaction tests.
- Frontend integration smoke tests for the main staff flows.
- Repeat suite on supported Node LTS and from a clean install.

### P2 — Verify printable certificate layout and real QR scanning

**Audit items:** Printable PDF layout (NOT TESTED / blocker); physical QR scan (NOT TESTED); private storage ACL (NOT TESTED); production verification URL (NOT TESTED).

**Exact files:**

- `kimu-backend/services/` (PDF and QR generation services)
- `kimu-backend/routes/certificateRoutes.js`
- `kimu-backend/CERTIFICATE_PDF_QR.md`
- `kimu-frontend/kimu-frontend/src/pages/Certverify/VerifyCertificate.jsx`
- Certificate fixture PDFs and automated tests under `kimu-backend/tests/`

**Root cause:** Automated tests parse the generated PDF and decode the QR image embedded in the PDF, but do not render each institution template, check content overlap/print margins, use physical cameras, verify deployed HTTPS resolution, or test production volume ACLs. QR placement can cover existing artwork.

**Safest solution:** Create a representative template fixture set and render output at print resolution. Review QR placement/quiet zone/contrast and textual content with the institution before issuing. Scan printed samples with more than one mobile camera/browser and follow each QR to the configured public verification route. Keep the existing QR payload and public policy semantics stable. Do not move placement automatically unless template-specific tests prove it will not cover content.

**Possible breaking changes:** Per-template page/corner/size settings may need adjustment. Changing QR payload or PDF policy may affect already issued certificates and must be avoided absent explicit migration/versioning.

**Required tests:**

- Automated PDF rendering snapshots/geometry checks for each supported template and page size.
- Physical print scan tests at normal print size and practical camera distances; confirm decoded URL and correct cert identity/status.
- Test valid, revoked, restored, archived, missing, and malformed verification cases from a phone browser.
- Confirm print output retains original certificate text and does not clip/cover critical marks.
- Production-like storage ACL, persistence, and original-vs-printable access checks.

### P2 — Resolve legacy certificate and signed-PDF operational policy

**Audit items:** Data migration (FAIL); legacy migration completion (NOT TESTED); PDF layout/limitations.

**Exact files:**

- `kimu-backend/models/Certificate.js`
- `kimu-backend/routes/certificateRoutes.js`
- `kimu-backend/services/` PDF/storage modules
- `kimu-backend/CERTIFICATE_PDF_QR.md`
- Certificate migration inventory/script and tests to be added

**Root cause:** Legacy Base64 originals remain in MongoDB until a user regenerates/replaces them. Signed PDFs containing `/ByteRange` are rejected because PDF rewriting invalidates signatures. Existing production records have not been inventoried.

**Safest solution:** Inventory legacy records and signed/unsupported PDF cases before rollout. Provide a resumable migration tool that preserves originals, checksums, verification token/ID, and audit events; do not silently rewrite signed PDFs. Document a manual handling path for signed files or a separate original-only policy. Keep legacy fallback until migration has been proven complete.

**Possible breaking changes:** Storage keys and PDF availability may change after migration. Previously accepted signed PDFs may be rejected by current generation path; do not remove or alter source originals. Bulk migration can create storage demand and should be staged.

**Required tests:**

- Inventory counts reconcile before and after migration.
- Migration preserves exact original checksum and certificate identity/token.
- Regeneration creates printable PDF and audit event; retry is idempotent.
- Signed PDFs remain downloadable as originals and are never silently modified.
- Public verification and revocation policy are unchanged through migration.

### P2 — Create operational logging, monitoring, and audit retention controls

**Audit items:** Logging/monitoring (FAIL); audit history protection (NOT TESTED).

**Exact files:**

- `kimu-backend/server.js`
- `kimu-backend/config/db.js`
- `kimu-backend/middleware/errorHandler.js`
- `kimu-backend/models/AuditLog.js`
- `kimu-backend/controllers/adminController.js`
- `kimu-backend/routes/adminRoutes.js`
- Certificate audit helper in `kimu-backend/routes/certificateRoutes.js`
- New logging/monitoring/retention configuration and operations docs

**Root cause:** Plain console logs have no redaction/correlation/metrics or alert configuration. The report could not verify audit retention, who can read it, tamper resistance, or production delivery. Certificate audit writes catch and log failures but allow the user mutation to succeed, so audit history may be incomplete.

**Safest solution:** After P0 redaction, add structured, centralized logs and operational alerts for DB readiness, repeated auth failures, 5xx rate, storage failures, and mail delivery. Define audit event requirements, retention/access policy, backup, and integrity controls. Decide whether certificate mutations must fail atomically if their audit event cannot be stored; preserve the required audit guarantee and test it explicitly. Do not silently promise an audit record when write failed.

**Possible breaking changes:** Audit-dependent mutations could return an error during audit-store outage if atomicity is required. Retention policy may change audit record availability. Log schema changes can affect downstream log consumers.

**Required tests:**

- Sensitive values are redacted at every log sink.
- Audit reads are restricted to intended roles and pagination/retention boundaries are enforced.
- Audit failure behavior is deterministic and matches the policy for create/update/revoke/restore/replace/regenerate.
- Alerts fire on synthetic DB outage, high error rate, login bursts, and storage failures.
- Backup restore includes audit records and preserves actor/action/timestamp links.

## Consolidated FAIL/BLOCKER extraction from the audit

The ranked items above cover the following report rows/findings:

- **Security:** authentication/authorization; admin/super_admin permissions; JWT expiration/signing; environment/secrets; CORS; input validation/uploads; rate limits; security headers; dependencies.
- **Backend:** production environment configuration; DB connection handling; API error handling; logging/monitoring; graceful shutdown; persistent storage configuration.
- **Database:** production Mongo configuration; indexes/query performance and boot-time drop; backup/restore; migrations; test DB isolation.
- **Frontend:** API configuration; build chunk warning is a non-blocking performance concern, retained for follow-up; production environment inventory.
- **Certificate:** printable PDF visual layout and physical QR scanning are explicitly unverified production gates; legacy migration completion and production file ACLs also require verification.
- **Deployment:** required production values; hosting/runtime; HTTPS/domain; DB/storage hosting; deployment and rollback instructions.

The report’s “all endpoints,” browser console/responsive/loading states, physical scan, production DB/host, production ACL, and backup restore are NOT TESTED rather than code-proven FAILs. They are included above as test/verification gates where they intersect blockers. The existing test and frontend build PASS evidence remains valid but is not a production sign-off.

## Suggested execution and evidence gates

1. Resolve P0 authorization, secrets/JWT, error redaction, index mutation, and dependency risks in isolated changes.
2. Run targeted unit/integration tests after each change; preserve current certificate suite and frontend build.
3. Complete P1 API safeguards and lifecycle tests before configuring staging.
4. Select hosting/database/storage architecture; provision staging with the same security controls intended for production.
5. Prove backup/restore and rollback in staging, verify HTTPS/CORS/frontend routing, and perform physical certificate print/scan checks.
6. Re-run the complete test suite, production build, `npm audit`, endpoint/role matrix, and update `PRODUCTION_READINESS_REPORT.md` with evidence and statuses. Do not mark a requirement PASS based only on code inspection.

**No deployment is authorized or performed by this plan.**

## Remediation progress — 2026-11-22

### Implemented and tested

- Role escalation protections for user creation, staff registration, super_admin account updates, and last active super_admin demotion/deactivation. Covered by the certificate API integration suite.
- Production environment checks for JWT secret quality, JWT lifetime, TLS Mongo URI, HTTPS client/public origins, absolute certificate storage path, and exact trusted proxy-hop count. JWTs now use explicit HS256 issuer/audience verification.
- DB URI redaction, generic internal 500 responses, generic 404 responses, request IDs, readiness-aware `/api/health`, and SIGTERM/SIGINT shutdown handling.
- Removed automatic Attendance index deletion from startup. Added an explicit dry-run/confirmation migration script; it has not been applied to any production DB.
- Added in-process API/login/public verification throttles; repeated login attempts are tested. This is suitable only for a single API process until a shared rate-limit store is implemented.
- Tightened global request parser limits; bounded and PDF-signature-checked report email uploads; constrained generic employee/visitor payload keys and escaped search regexes.
- Added API security headers and frontend Vercel CSP/HSTS/header configuration. Actual host responses remain unverified.
- Enforced the configured CORS Origin allowlist at the API and disabled credentialed CORS because browser authentication uses bearer tokens; an untrusted-Origin rejection is tested.
- Production frontend builds now require public HTTPS `VITE_API_URL` ending in `/api`. Verified missing config fails and valid HTTPS configuration builds.
- Upgraded backend and legacy-backend lockfiles with compatible fixes; frontend moved to Vite 8.3.8 and React Router 7.18.6; replaced unpatched `xlsx` with ExcelJS and pinned a patched `uuid`. All three `npm audit` checks returned zero vulnerabilities.
- Added an Excel export round-trip test. The legacy backend launcher now delegates to the canonical backend bootstrap. Certificate tests refuse inherited Mongo URIs/production mode and now run against a disposable MongoDB memory-server process.
- Added route-level lazy loading; the frontend entry bundle is now ~192 kB. ExcelJS remains a ~930 kB lazy export chunk and Vite warns about its size.
- Added a deployment/recovery draft at `DEPLOYMENT_RUNBOOK.md`.

**Evidence:** backend security tests 5/5 passed; certificate integration tests 13/13 passed; frontend Excel export test 1/1 passed; frontend production build passed with valid HTTPS API config; npm audits for canonical backend, nested launcher, and frontend each reported 0 vulnerabilities. The build retains >500 kB chunk warnings. All code tests ran on Node 27 alpha, not the pinned Node 22.12+ LTS.

### Still open — not fixed or verified

- Production provider/domain/TLS, production MongoDB and least-privilege credentials, private persistent storage and host ACL, backups, restore drill, and coordinated rollback.
- Shared rate-limit store before multi-instance deployment; current limiter is process-local.
- Production target index migration review/application, index/query explain plans, and representative load testing.
- Full API authorization/validation/error coverage; complete frontend browser console/loading/error/responsive tests; supported Node 22 LTS test/build run.
- Physical printable PDF/template review and phone-camera QR scan; production legacy certificate inventory/migration.
- Structured production monitoring/alerting, full audit retention/tamper review, and host-specific SPA refresh/security-header verification.

No remediation item is considered completely resolved if its required production verification above remains outstanding. The application remains NO-GO for deployment.
