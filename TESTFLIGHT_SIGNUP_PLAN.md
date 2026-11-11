# TestFlight Email List Plan: Resend vs. Supabase

## Short Answer

Can we use **Resend** or write to **Supabase**? **Yes — use Supabase Postgres as the primary source of truth, with an Edge Function that optionally syncs to Resend Contacts and sends a one-time confirmation email.**

`xenonrift.com` runs as a static Vite site on GitHub Pages, so browser JavaScript **cannot** call Resend directly without exposing a secret `RESEND_API_KEY`. Any Resend integration already requires a backend endpoint — and Xenon Rift already runs Supabase (`lrafvfnidgdvxhrphzau`) with Postgres and Edge Functions (`device-link`, `delete-account`).

## Option Comparison

| Capability | Resend Contacts only (via Edge Function) | Supabase Postgres only | **Recommended: Supabase DB + Optional Resend Sync** |
|---|---|---|---|
| Needs server/edge proxy? | Yes (`RESEND_API_KEY` is secret) | Edge Function or `SECURITY DEFINER` RPC | Yes (`testflight-signup` Edge Function) |
| Works before Resend API keys exist? | No | **Yes** | **Yes** (degrades cleanly when `RESEND_API_KEY` is unset) |
| Tracks Apple hardware matrix (`iPhone`, `iPad`, `Apple TV`, `Mac`) | Awkward custom properties | **Native `text[]` + SQL filtering** | **Native `text[]` + SQL filtering** |
| Tracks wave lifecycle (`pending` → `invited` + `invited_at`) | Manual / external | **Native columns & timestamps** | **Native columns & timestamps** |
| App Store Connect CSV export (`First Name,Last Name,Email`) | Full audience export, manual filtering | **Single SQL query per device cohort** | **Single SQL query per device cohort** |
| Joins against `auth.users` / `pilot_stats` | Not possible | **Direct SQL join** | **Direct SQL join** |
| Broadcast emails & one-time signup confirmation | Built in | Requires external mailer | **Built in once `RESEND_API_KEY` is set** |
| Resilient to Resend rate limits (2 req/s default) or outages | Drops signups on 429/5xx | N/A | **Never loses a signup** (Postgres commits first) |

## Architecture

```
xenonrift.com/#play (static GitHub Pages)
  │  POST /functions/v1/testflight-signup  (public SUPABASE_ANON_KEY)
  │  { email, platforms: ["iphone", "apple_tv"], company: "" }
  ▼
Supabase Edge Function: testflight-signup (verify_jwt = false)
  ├─ 1. Origin CORS check (xenonrift.com, www.xenonrift.com, localhost)
  ├─ 2. Honeypot check ("company" field) → silent 200 drop for bots
  ├─ 3. Normalize & validate email + Apple device list
  ├─ 4. SHA-256 hash client IP → RPC public.record_testflight_signup(...)
  │       └─ private.testflight_signup_limits (8 requests / IP / hour)
  │       └─ Upsert private.testflight_signups (email PK, platforms, status)
  └─ 5. Optional Resend step (only if RESEND_API_KEY is configured):
          ├─ Upsert Contact in Resend (POST /contacts, optional RESEND_SEGMENT_ID)
          ├─ If first signup (send_confirmation = true) & RESEND_FROM_EMAIL set:
          │    send one dark/cyan confirmation email via POST /emails
          └─ Stamp resend_contact_id & confirmation_sent_at via RPC
```

### Security & Anti-Abuse Properties
- **No public read path:** `private.testflight_signups` lives in the `private` schema (matching `private.device_links` and `private.apple_tokens`). PostgREST never exposes it to `anon` or `authenticated` keys, preventing email list scraping.
- **No email-existence enumeration:** Duplicate signups update `platforms` and return the exact same `200 { ok: true }` response as new signups.
- **No inbox-bomb relay:** `confirmation_sent_at` ensures at most **one** confirmation email is ever sent per address, even if someone submits the form repeatedly.
- **Graceful fallback:** Without JavaScript, or if the Edge Function is unreachable/undeployed, the page keeps `mailto:support@codersbrew.com` links (and generates a pre-filled `mailto:` link with the pilot's typed email and selected devices).

## Rollout Steps

> **Deploy order:** Push the database migration and Edge Function to `xenon` (`lrafvfnidgdvxhrphzau`) **before** merging this PR to `main` (merging to `main` immediately deploys `dist/` to GitHub Pages).

### 1. Copy backend files into the game repo's Supabase directory (or deploy directly)
From `../xenonrift`:

```sh
cp ../xenonrift-web/supabase/migrations/20261115090000_testflight_signups.sql supabase/migrations/
cp -R ../xenonrift-web/supabase/functions/testflight-signup supabase/functions/
```

Add to `../xenonrift/supabase/config.toml`:

```toml
[functions.testflight-signup]
verify_jwt = false
```

### 2. Apply migration & deploy Edge Function to `xenon`

```sh
cd ../xenonrift
env -u SUPABASE_ACCESS_TOKEN supabase db push
env -u SUPABASE_ACCESS_TOKEN supabase functions deploy testflight-signup --no-verify-jwt
```

At this point, **TestFlight signups work end-to-end into Supabase Postgres** with zero Resend configuration required.

### 3. (Optional) Enable Resend Contact sync & confirmation emails
When ready to mirror signups into Resend Contacts and send automatic confirmation emails:

```sh
env -u SUPABASE_ACCESS_TOKEN supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxxx \
  RESEND_FROM_EMAIL="Xenon Rift <playtest@xenonrift.com>" \
  RESEND_REPLY_TO="support@codersbrew.com" \
  RESEND_SEGMENT_ID=""   # optional Resend Segment UUID for TestFlight broadcasts
```

- Leave `RESEND_FROM_EMAIL` unset if you want silent Resend Contact syncing without sending a transactional confirmation email on signup.
- Verify the sending domain (`xenonrift.com` or `codersbrew.com`) in Resend before setting `RESEND_FROM_EMAIL`.

### 4. Merge this PR to `main`
GitHub Actions builds `dist/`, runs the Playwright suite on desktop and mobile Chromium, and deploys `xenonrift.com`.

## Operating the Waitlist (App Store Connect TestFlight)

App Store Connect (**TestFlight → External Testing → Group → Add Testers → Import CSV**) expects columns `First Name,Last Name,Email`.

### Export pending testers for a wave (e.g., iPhone / iPad / Apple TV)
Run in the Supabase SQL Editor (and click **Download CSV**):

```sql
select
    '' as "First Name",
    '' as "Last Name",
    email as "Email"
from private.testflight_signups
where status = 'pending'
  and platforms && array['iphone', 'ipad', 'apple_tv']::text[]
order by created_at asc
limit 100;
```

### Mark exported wave as invited

```sql
with wave as (
    select email
    from private.testflight_signups
    where status = 'pending'
      and platforms && array['iphone', 'ipad', 'apple_tv']::text[]
    order by created_at asc
    limit 100
)
update private.testflight_signups s
   set status = 'invited',
       invited_at = now(),
       updated_at = now()
  from wave
 where s.email = wave.email;
```

### Honor an opt-out / removal request (`support@codersbrew.com`)

```sql
update private.testflight_signups
   set status = 'unsubscribed',
       updated_at = now()
 where email = lower(btrim('pilot@example.com'));
-- Or delete outright for erasure requests:
delete from private.testflight_signups
 where email = lower(btrim('pilot@example.com'));
```
