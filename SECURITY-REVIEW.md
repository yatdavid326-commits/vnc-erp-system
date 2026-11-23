# Security review summary

**Date:** 2026-11-23  
**Scope:** Authentication CSRF finding and credential-exposure review.

## Confirmed finding

### Medium — Login CSRF (fixed)

`POST /api/auth/signin` previously accepted cross-site form submissions and set
session cookies without checking the request origin or media type. A victim
could be signed into an attacker-controlled account in their browser.

The endpoint now requires an `Origin` matching the request origin and the
`application/json` media type. Requests without a valid matching origin receive
403, and non-JSON requests receive 415. Focused tests cover same-origin JSON,
missing/cross-origin headers, and form content types.
The origin comparison uses the request host and the forwarded protocol when
present, so legitimate same-origin requests work behind the deployment proxy.
The application must be hosted behind a trusted proxy that controls the
`Host` and `X-Forwarded-Proto` headers.

**Fix commit:** `9a3e888` (`fix: protect sign-in against CSRF`).

## Credential review status

No additional credential exposure was confirmed, but the credential audit is
**incomplete**. The bounded repository scan enumerated tracked files and
working-tree status but did not inspect file contents. The history scan
identified local and remote refs and commit counts but did not inspect
historical file contents. Therefore this review cannot rule out credentials in
current files, deleted files, earlier commits, deployed versions, or existing
sessions.

GitHub secret scanning and push protection are enabled on the repository. On
2026-11-23, its API reported zero open and zero resolved secret-scanning alerts.
This does not establish that all credential types, deployments, or sessions
have been reviewed.

No credential values are included in this report. The credential audit remains
open in the continuous-improvements checklist until a content-level scan of
current files and relevant history, plus deployment/session review, can be
completed.

## Verification

- Focused CSRF tests, the complete unit-test suite (52 tests), and the
  authentication end-to-end suite (5 tests) passed.
- Targeted ESLint and the production build passed.
- No database migration was required.
- Deployed to the Vercel testing environment and verified with a successful
  interactive login. Cross-origin and missing-origin requests returned 403;
  same-origin non-JSON returned 415; same-origin JSON reached validation (400).
