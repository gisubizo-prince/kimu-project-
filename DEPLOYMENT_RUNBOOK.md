# Kimu Deployment and Recovery Runbook (Draft)

**State:** Preparation only. No production host, domain, MongoDB cluster, storage volume, credentials, or backup destination has been selected or configured. This document is not evidence of a successful deployment or restore.

## Deployment prerequisites

- Use Node.js 22.12 or later in the 22.x LTS line (`>=22.12 <23`), matching package manifests and Vite 8 requirements. Current workstation verification used Node 27 alpha, so repeat the test/build on Node 22 before release.
- Use `kimu-backend` as the canonical API directory. The nested `kimu-backend/kimu-backend` is a legacy launcher that delegates to the canonical server and has a synchronized dependency manifest/lockfile.
- Select an HTTPS SPA host and HTTPS API host. Configure deep-link fallback to `/index.html` and apply the frontend security headers in `kimu-frontend/kimu-frontend/vercel.json` or the equivalent host policy.
- Configure a production MongoDB URI with TLS, a least-privilege application user, and network restrictions. Use `mongodb+srv://` or a URI with TLS explicitly enabled.
- Mount a private, durable volume at an absolute `CERTIFICATE_STORAGE_DIR` path. The API creates the directory with restrictive POSIX permissions on POSIX hosts; verify host ACLs directly, especially on Windows.
- Keep the API to one instance while using the current process-local rate-limit counters. Before scaling to multiple instances, replace the limiter store with a shared atomic store and test it.

## Required backend configuration

Set through the host’s secret/configuration facility, never by committing `.env`:

| Variable | Requirement |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Host-provided listening port |
| `MONGO_URI` | TLS-enabled production MongoDB URI |
| `JWT_SECRET` | Unique random secret, at least 32 characters; do not reuse the sample value |
| `JWT_EXPIRES_IN` | Explicit duration from 1 minute through 24 hours; current recommended starting value is `15m` |
| `JWT_ISSUER`, `JWT_AUDIENCE` | Match the intended API/client values; current defaults are `kimu-api` and `kimu-client` |
| `CLIENT_URL` | Exact public HTTPS SPA origin (origin only, no path) |
| `PUBLIC_APP_URL` | Exact public HTTPS SPA origin used in certificate QR links |
| `TRUST_PROXY_HOPS` | Exact number of trusted reverse-proxy hops; use `0` only when clients connect directly |
| `CERTIFICATE_STORAGE_DIR` | Absolute path on private persistent storage |
| `PDF_QR_PAGE`, `PDF_QR_SIZE_MM`, `PDF_QR_MARGIN_MM`, `PDF_QR_CORNER` | Reviewed per certificate template |
| `ALLOW_PUBLIC_PDF_WHEN_REVOKED`, `ALLOW_PUBLIC_DOWNLOAD` | Explicitly reviewed policy values |

Email report delivery additionally requires `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASSWORD`, and `REPORT_RECIPIENT_EMAIL`; `MAIL_FROM` is optional. If email delivery is not configured, the endpoint returns a controlled unavailable response.

Frontend builds require `VITE_API_URL=https://<api-host>/api`. It is public client configuration, not a secret. The production build deliberately fails when this value is missing, HTTP, localhost, or missing `/api`.

For the one-time admin bootstrap, configure `SEED_ADMIN_EMAIL`, a unique `SEED_ADMIN_PASSWORD` of at least 12 characters, and `SEED_ADMIN_NAME`; set `SEED_ADMIN_ALLOW=true` for only the approved one-time production run, then unset it and rotate/remove the bootstrap credential. Do not leave the seed flag enabled.

## Pre-deploy checks

1. Re-run `npm ci`, all backend tests, frontend export tests, and the frontend production build on Node 22 LTS.
2. Run `npm audit` in each deployable package directory; require zero advisories or a separately approved written exception.
3. Confirm the production frontend build contains no localhost API URL and points to the expected HTTPS API.
4. Confirm role escalation tests, rate-limit tests, input-boundary tests, PDF/QR checks, and API tests pass.
5. Take coordinated MongoDB and certificate-volume backups. Record immutable artifact and environment versions.
6. Run the explicit attendance index migration in dry-run mode. Review the expected index and data before using `--apply` with the confirmation environment variable. Never apply automatically during app startup.
7. Visually review printable certificates and scan physical print samples with phones before issuing certificates.
8. Verify staging CORS, HTTPS, response headers, health readiness, storage persistence, and application shutdown/restart behavior.

The certificate tests start an isolated MongoDB 7.0.14 memory-server process and refuse production mode or any inherited `MONGO_URI`; they do not connect to an operator-supplied database.

## Backup and restore

The local implementation is `kimu-backend/scripts/database-backup.js` and `database-restore.js`. It creates AES-256-GCM encrypted EJSON and encrypted certificate files, preserving BSON values and indexes; it records SHA-256 checksums. The key is a 32-byte hex value supplied as `BACKUP_ENCRYPTION_KEY` from a secret manager. Keep that key separately from backup storage and rotate by taking a new backup with the new key. Do not commit the key or store it beside backups.

Before the backup, enter maintenance mode or stop certificate writes so the database and private PDF volume represent the same recovery point. Run from the canonical backend directory with a new, private destination directory:

```powershell
$env:MONGO_URI = '<TLS MongoDB URI>'
$env:CERTIFICATE_STORAGE_DIR = '<mounted private certificate volume>'
$env:BACKUP_DIR = '<new restricted backup directory>'
$env:BACKUP_ENCRYPTION_KEY = '<64 hex characters from secret manager>'
npm run db:backup
```

The backup command refuses an existing destination. Restrict the backup directory to the operations account and replicate the encrypted result to a separate failure domain under the organization’s retention policy.

Restore only to a newly provisioned, empty database and a new empty certificate directory. Never use the production database as a drill target:

```powershell
$env:RESTORE_MONGO_URI = '<TLS URI ending in a separate empty recovery database>'
$env:RESTORE_CONFIRM = 'restore-to-empty-database:<target database name>'
$env:RESTORE_CERTIFICATE_STORAGE_DIR = '<new empty private volume directory>'
$env:BACKUP_DIR = '<encrypted backup directory>'
$env:BACKUP_ENCRYPTION_KEY = '<matching 64 hex character key>'
npm run db:restore
```

The restore refuses a source-named or non-empty Mongo database and an existing storage target, verifies encryption tags/checksums, and checks restored record counts. A disposable local MongoDB drill passed on Node 22.12: dates, BSON binary content, indexes, and a certificate file were restored; a second attempt to restore over populated data was rejected without changing it. This proves the scripts in a local fixture, not a production Mongo/storage integration or backup schedule. Use `npm run test:operations` with `KIMU_OPS_TEST_DISPOSABLE=YES` and a loopback temporary `KIMU_OPS_TEST_MONGO_URI` to rerun this gated drill.

## Rollback

Keep the previous frontend/backend image digests and matching non-secret configuration revision. Roll back the app to the previous digest only if its schema and certificate-file format remain compatible, then verify `/api/health`, login, certificate verification, and original/printable file delivery. For incompatible schema or file changes, restore the database and certificate volume from the same recovery point to a separate recovery environment first, validate there, then plan cutover under an approved maintenance window. Data written after the recovery point may be lost. Never restore over a live database or delete certificate files as a rollback shortcut. The local DB/file restore drill passed, but a Docker image rollback and production-scale coordinated cutover were not exercised because Docker, prior release artifacts, and a host are unavailable here.

## Local production infrastructure template

`deploy/production/compose.yaml` provides a single API container, a static SPA, Caddy TLS termination, persistent private certificate storage, and private Prometheus storage. Point `PUBLIC_DOMAIN` DNS to the host, allow inbound TCP 80/443 (UDP 443 is optional HTTP/3), and supply secrets through the host secret manager or an untracked restricted env file. The API uses TLS MongoDB via `MONGO_URI`; MongoDB itself is intentionally external so no paid/local production database is silently created. Caddy's ACME certificate issuance, Docker build, persistent-volume ACLs, and host routing were not testable because Docker and a public domain are unavailable.

The API's current fixed-window counters are process-local. The template runs one API instance only. Do not scale it horizontally until a shared atomic rate-limit store has been added and tested. Prometheus scrapes a private `/internal/metrics` endpoint and includes API/Mongo availability and memory alert rules in `deploy/production/alerts.yml`. Prometheus is not published publicly. A real alert receiver (email or webhook), its credentials, delivery test, retention, and on-call routing must be configured by the operator; no receiver or monitoring account was supplied, so notifications are not verified.

AuditLog Mongoose update/delete operations now reject mutations. This is application-layer protection. The current API MongoDB identity still needs a production least-privilege design and independent immutable/remote audit retention; no production database role or external audit sink is configured. Do not describe current audit logs as tamper-proof.

## Current release gate

This project remains **NO-GO** until a production host/domain/database/private volume and alert receiver are configured, MongoDB permissions and independent audit retention are verified, all deployment configs are validated on a host, and certificate templates are physically reviewed/scanned. This runbook does not authorize deployment.
