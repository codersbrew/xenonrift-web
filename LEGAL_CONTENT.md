# Legal pages and support contact

## Public URLs

- Privacy Policy: https://xenonrift.com/privacy/
- Terms of Service: https://xenonrift.com/terms/
- Support, contact, privacy and deletion requests: support@codersbrew.com

Both documents are static, public, indexable HTML and work without JavaScript. Vite builds them as separate entries; homepage and account-email landing pages link to both. Relative navigation preserves repository-subpath hosting. Source: `privacy/index.html`, `terms/index.html`, shared `src/legal.css`.

## Scope and maintenance

Privacy covers the game and website: Supabase accounts, optional Google/Apple sign-in, public call signs/ship/career data, online diagnostics, session storage, support messages, GitHub Pages, external Google Fonts, retention/deletion and applicable data rights.

Terms cover eligibility, fair play, accounts, a limited game license, gameplay sharing, development-build changes, feedback, suspension, deletion and mandatory consumer rights. No fabricated business address, jurisdiction, arbitration requirement, subscription or specific retention deadline has been inserted.

Update the date and wording when data collection, providers, monetization, eligibility or service behavior changes. Do not add analytics, advertising or new telemetry without reviewing the policy.

## Before publication

These are project-specific policy drafts, not a legal-compliance certification. Owner/legal review remains required before release:

- Confirm CodersBrew is the correct public operator name, and add a full legal entity/address if applicable law requires it.
- Confirm support@codersbrew.com receives mail and someone handles privacy/deletion requests.
- Confirm the minimum-age policy (13 or higher applicable local minimum), parental-permission rules and any necessary enforcement.
- Verify actual hosting/email providers, international-transfer safeguards, retention and backup practices against deployment; update disclosures if they differ.
- Confirm public pilot profiles/stats are intentional and account deletion works on shipped builds.
- Review applicable regional consumer/privacy notices and children's privacy obligations. Do not assume a policy page alone satisfies them.

## Google OAuth branding

After deploying, use the public URLs above in Google Auth Platform → Branding. Publishing these website pages does not change Google's consent-screen configuration, hosted Supabase settings or game builds.

## Validation

Run `npm run build`, then `npm test`. `tests/legal.spec.js` checks metadata, built routes/assets, section navigation, cross-links, all support mail destinations, account-page links, JavaScript-free reading and widths from 320 to 1440 px in desktop/mobile Chromium.

### Verified for this change

- Production build passes.
- All tracked regression suites plus new legal tests: **58/58 passed**, desktop and mobile Chromium; includes **14 new legal checks**.
- Full dirty-checkout suite: **68 passed, 2 failed**. Both failures belong to the pre-existing untracked `tests/downloads.spec.js` (download CTA not yet wired). Copied that test into an isolated worktree of unchanged `origin/main` (`870b93d`); the same two failures reproduce. Download files remain untouched and excluded from this change.
- Desktop/mobile browser screenshots reviewed; mobile contents order corrected and regression-tested. Browser console: no errors or warnings during legal-page review.
- No deployment, Google OAuth dashboard changes or mailbox-delivery test performed.

To reproduce the passing scoped suite while download work is unfinished:

```sh
npm run build
npm test -- tests/auth.spec.js tests/branding.spec.js tests/landing.spec.js tests/legal.spec.js tests/progressive.spec.js tests/ships.spec.js --workers=4
```

Unrelated download-pipeline work already present in this checkout is outside this change; do not stage it with legal-page changes.
