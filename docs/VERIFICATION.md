# Verification and launch checklist

Prepared 10 October 2026; backend CI/CD checked 11 October 2026. Frontend redesigned and checked 18 October 2026.

**Current frontend record:** see [FRONTEND_VERIFICATION.md](FRONTEND_VERIFICATION.md) for 44 unit/business tests, 7 DOM interaction tests, build/audit results and browser/cloud verification limits. Use [the Vercel launch guide](VERCEL_FRONTEND_LAUNCH_BASH.md) for this phase. The backend-specific history and sales checklist below are retained.

## Historical backend checks recorded 10 and 11 October 2026

| Check | Result |
| --- | --- |
| JavaScript lint | Passed |
| Prettier formatting | Passed |
| Unit/component/business-service tests | 38 passed; no skipped tests |
| Production Vite build | Passed |
| Dependency audit after fixes | Zero reported vulnerabilities across production and development dependencies |
| YAML parsing and deployment shell syntax | Checked; no Docker engine was available for runtime validation |
| GitHub Action pins | Checkout/setup-node commits checked; Docker Actions refreshed to published v4.4.1/v4.6.0/v7.4.0 commits and Trivy corrected to the official v0.36.0 release commit |
| Bash deployment failure tests | Passed: healthy release, pull/start/HTTPS failure rollback, unhealthy rollback reporting, invalid/foreign images, duplicate configuration, concurrent release lock and SSH command rejection |
| MongoDB integration suite | Blocked during database startup; no integration assertions executed |
| Live Stripe/SMTP/WhatsApp | Not activated or exercised with your credentials |
| Docker build/Compose/Caddy/Trivy runtime | Not executed here; required in CI/staging |
| Actual cloud deployment/GitHub workflow execution | Not performed; requires your repository/server/accounts |
| Full browser/accessibility review | Still required on the running staging app |

The initial audit found vulnerable versions of Sharp and a development source-map dependency. Sharp was upgraded to 0.35.5 and source-map-js to the patched version; the subsequent audit reported zero vulnerabilities. A fresh audit on 11 October also reported zero vulnerabilities. An npm audit result is time-specific and does not prove there are no undiscovered vulnerabilities.

The real integration command downloaded MongoDB 8.0.16, then its process exited with code 100 before replica-set startup. A separate database startup diagnostic reported `open: Operation not permitted` in this managed execution environment. The Node test runner reported all 13 integration cases failed because the global setup could not start the database. They were not successful, skipped, or replaced with an in-memory database simulation.

Run `npm run test:integration` on your Docker/local replica set or GitHub's Ubuntu runner before accepting live orders. `npm run check` runs the separate 38-test suite and frontend build; it does not certify MongoDB transaction behavior. CI requires both commands.

The revised CI starts MongoDB with Docker Compose and passes a disposable replica-set URI to the integration suite. Its database/data volume is removed after the run. The new `npm run test:deployment` executes the actual Bash release script with fake Docker/curl commands; it validates script behavior under failures, not real containers, certificates or provider availability. Neither workflow has executed in your GitHub account here. Set up services using [the Bash guide](CI_CD_DEPLOYMENT_BASH.md), verify the first pipeline on staging, then complete the launch checklist.

## Test coverage

The passing tests cover original pricing/box logic, bilingual frontend/cart behavior, unavailable market stock, address normalization, routes, password hashing, TOTP/encrypted secrets, production configuration, signed webhook parsing, payment-account/currency/amount/discount/intent checks, late-payment refund enqueueing, and real image decoding/re-encoding.

Some payment-service tests use injected repositories to exercise decisions. They verify business logic, not MongoDB transaction isolation. The separate real-database integration suite covers:

1. Inventory validator invariants.
2. Checkout idempotency and retained market profile.
3. Last-unit reservation competition.
4. Atomic stock consumption and notification deduplication.
5. Cross-account webhook rejection.
6. Currency mismatch holding fulfilment.
7. Failed-payment stock release.
8. Duplicate refund request and worker confirmation.
9. Expired lease recovery and stale-worker rejection.
10. Admin cookie/CSRF boundaries and catalogue optimistic edits.
11. Idempotent stock adjustment and reserved-stock protection.
12. Newsletter/confirmation outbox consistency.
13. MFA enrollment/session revocation/replay rejection.

## Launch gates

Complete and record these in your own staging/release evidence:

- [ ] `npm ci`, `npm run check`, `npm run test:integration` and dependency audit all pass in CI.
- [ ] Build the runtime image and pass its vulnerability scan, including native image libraries and OS packages.
- [ ] Validate `compose.yaml`/`compose.production.yaml` with Docker Compose and Caddy with `caddy validate` in their actual images.
- [ ] Run a complete order, payment, stock deduction, confirmation, packing, tracking, shipping and refund in staging.
- [ ] Exercise concurrent buyers for the last units, duplicate checkout requests, duplicate/out-of-order webhooks, expired holds and worker crashes.
- [ ] Verify refund transport retries do not create a second refund; verify pending/failed provider refunds and operator recovery.
- [ ] Approve the legal merchant/account arrangement and the DE/GB payout bank accounts with the provider.
- [ ] Test the German and UK payment profiles with their own signing secrets; confirm account/session binding.
- [ ] Decide whether UK charging remains EUR. Do not launch GBP labels without implementing an approved GBP price book.
- [ ] Configure real London outward-postcode coverage if delivery is London-only; test boundaries and shipping copy.
- [ ] Complete verified food data and actual market inventory; confirm tax rates, food business/traceability, invoices, consumer/legal/privacy/accessibility requirements.
- [ ] Review business/legal pages with qualified advisers for your actual entities/products/markets.
- [ ] Enable MFA for every administrator; test lost-authenticator recovery and staff/owner restrictions.
- [ ] Use private secrets, TLS, least-privilege database access, narrow Atlas network access and a restricted host firewall.
- [ ] Verify real email sender/domain/inbox placement; test failed delivery and operational review.
- [ ] Approve/test WhatsApp templates and customer opt-in if enabling that channel.
- [ ] Set monitoring for API, worker, stuck reservations, failed jobs, notification backlog, disk space and provider events.
- [ ] Configure Atlas backups/PITR and separate encrypted upload/config backups; prove a safe restore without live integrations.
- [ ] Test deployment/rollback of a digest, verify SSH host keys, protect branches and the production environment.
- [ ] Review mobile UI, keyboard access, contrast, reduced motion, slow networks and payment-return errors.
- [ ] Switch to matching live keys/webhook secrets only after release approval, then verify a small real order/refund/payout in each live profile.

## Deliverable boundaries

The ZIP contains editable JavaScript source, original storefront assets, the lockfile, Docker/CI/deployment configuration, tests and documentation. It excludes node_modules, build output, database files, private environment files and credentials. Run the setup/build commands to produce the local runtime.

It is ready to inspect and run through the staging process. It is not a deployed service, a verified bank-account setup, a penetration-test certificate, or a claim that the blocked database/container tests passed.
