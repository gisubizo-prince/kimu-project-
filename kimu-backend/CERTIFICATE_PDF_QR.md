# Certificate PDF and QR workflow

## Design

Certificate management stays in the existing Express/Mongoose API and uses the existing staff JWT. Management routes require `admin` or `super_admin`; the verification endpoints remain public. A certificate token is generated independently from the staff-visible certificate ID, and the QR code encodes the absolute SPA URL `/verify-certificate/{token}`.

Uploads keep the existing JSON request contract (`pdf` plus Base64 `pdfBase64`). The server validates the upload, saves the exact original bytes into a private filesystem directory, uses `pdf-lib` to create a second printable PDF with a real `qrcode` PNG embedded, and saves that file separately. MongoDB stores opaque storage keys, sizes, checksums, and QR placement metadata; new PDF bytes are not stored in MongoDB. Storage is not mounted by Express static middleware. The public PDF route can return only the printable copy; original downloads always require staff authorization.

Replacement preserves the certificate ID and verification token, writes both new files, updates the record, and then removes the replaced files. Regeneration reads the preserved original and rebuilds only the printable copy. Both operations keep the current audit behavior. Existing legacy records that have Base64 originals and no token continue to verify by certificate ID; regeneration migrates those original bytes to private storage and creates the printable copy.

## Dependencies

Runtime:

- `qrcode` generates PNG and SVG QR images (error correction level Q).
- `pdf-lib` parses the source PDF, embeds the QR image, and writes the separate printable PDF.

Tests:

- `jsqr` decodes the QR image extracted from the generated PDF image object and checks that it contains the expected verification URL.

Install from the backend folder with `npm ci`. The lockfile includes the dependencies. The certificate integration suite starts its own MongoDB 7.0.14 memory-server process, uses a unique test database, and stops that process during cleanup. It refuses production mode and any inherited `MONGO_URI`; it does not use or modify a separately running MongoDB service.

## Storage and configuration

Set `CERTIFICATE_STORAGE_DIR` to an absolute, private, persistent directory on the backend host. Production startup fails if this is missing or relative. In development, unset files go to `backend/storage/certificates`, which is ignored by Git and never served as static content. Keep the volume private and include it in coordinated backup/restore procedures. Files use opaque random names; on POSIX systems the directory is set to mode `0700` and files use mode `0600`. Verify ACLs and persistence on the actual host; this has not been tested on a production volume.

Set `PUBLIC_APP_URL` to the public SPA origin (for example, `https://certificates.example.org`). It takes precedence over `CLIENT_URL`; development falls back to `http://localhost:5173`. The QR code points to the SPA route, which fetches the live public verification endpoint.

In production, `PUBLIC_APP_URL` and `CLIENT_URL` must both be configured as HTTPS origins. `TRUST_PROXY_HOPS` must be set to the exact trusted proxy count; incorrect trust can allow spoofed client IPs to bypass IP-based rate limits.

QR placement settings:

| Variable | Default | Allowed values |
|---|---:|---|
| `PDF_QR_PAGE` | `1` | One-based page number present in the source PDF |
| `PDF_QR_SIZE_MM` | `28` | 18–60 millimetres |
| `PDF_QR_MARGIN_MM` | `10` | 0–100 millimetres |
| `PDF_QR_CORNER` | `bottom-right` | `top-left`, `top-right`, `bottom-left`, `bottom-right` |

Public PDF policy uses the existing `ALLOW_PUBLIC_PDF_WHEN_REVOKED` setting (default false). `ALLOW_PUBLIC_DOWNLOAD=false` disables the public attachment/download response while leaving inline display available. Every verification and PDF response is sent with `Cache-Control: no-store`.

## API additions and compatibility

- `GET /api/certificates/:id/pdf` continues to download the original uploaded PDF for staff, preserving its prior contract.
- `GET /api/certificates/:id/original-pdf` is an explicit alias for the original.
- `GET /api/certificates/:id/printable-pdf` downloads the QR-enabled printable PDF for staff.
- `GET /api/certificates/:id/qr?format=png|svg&download=1` returns the corresponding real QR image to staff.
- `POST /api/certificates/:id/pdf/regenerate` regenerates the printable PDF from the preserved original without changing the ID or token.
- Existing `POST /api/certificates/:id/pdf` replaces the original and its printable copy, retaining its confirmation contract.
- `GET /api/certificates/verify/:token/pdf` serves the printable copy publicly, subject to revocation/download policy. It never serves the original.

The existing `GET /api/certificates/verify/:token` response now reports `pdfAvailable` when a printable copy is available under current policy. Management views include `hasPrintablePdf`, PDF sizes/checksums, and QR page/corner metadata, but never storage keys.

## Validation and limitations

Uploads have a 10 MB limit and must have a `.pdf` filename, a PDF signature, and an EOF marker. `pdf-lib` must also be able to parse the PDF. PDFs containing a `/ByteRange` signature marker are rejected because rewriting them would invalidate their digital signature. QR placement checks page bounds and configured dimensions, but does **not** inspect rendered artwork to find a clear area. The white QR backing can cover existing content at the selected corner; review the printable output and choose the configured corner/page for the institution's certificate layout before production use.

Legacy Base64 originals are migrated only when staff regenerates or replaces their PDF; they remain in MongoDB until then. Local filesystem storage requires a persistent private volume in production. S3/object storage is not implemented here.

The automated QR test extracts the embedded image data from the generated PDF, decodes it with `jsqr`, and asserts that the scanned value exactly equals the record's verification URL. It also parses the generated PDF, checks the configured page metadata, and exercises public verification/PDF delivery.
