# BloomDate

A little invitation. A beautiful date. A mobile-first Next.js application with TypeScript, Tailwind CSS, Supabase authentication and PostgreSQL, ready for Vercel.

## Start locally

Requires Node.js 22 or newer and npm. From this folder:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Windows PowerShell:

```powershell
$env:Path = 'C:\laragon\bin\nodejs\node-v22;' + $env:Path
Copy-Item .env.example .env.local
npm.cmd ci
npm.cmd run dev
```

Visit `http://localhost:3000`. With no Supabase configuration, development now works immediately using a persistent server-side SQLite database at `.data/bloomdate.sqlite`. Click **Create an invitation**, then **Continue on this computer**, or create a local email/password account. The full creator and recipient flows save real local records. The quick workspace session lasts 30 days; use an account if you want to return after signing out. Local accounts do not require email confirmation.

Local links work on this computer while the server is running. This is local storage, not an online deployment. Configuring Supabase switches development to the online backend; local records are not migrated automatically. Production continues to require Supabase unless you explicitly set `BLOOMDATE_STORAGE=local` on a machine with persistent disk. Do not use local SQLite on Vercel's ephemeral filesystem.

`/demo` remains separate: sample names, dates and responses are clearly labeled, and demo responses never reach either database. Local SQLite uses Node's built-in [SQLite API](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html).

## Supabase setup

1. Create a Supabase project. Save its project URL, public **anon** key, and server-only **service_role** key from Project Settings → API. Use the legacy JWT keys for this configuration. Never put the service role key in a `NEXT_PUBLIC_` variable or commit `.env.local`.
2. In SQL Editor, run the entire `supabase/migrations/001_bloomdate.sql` file once. Alternatively link the Supabase CLI to your project and run `supabase db push`. The migration creates invitation/options/response tables, foreign keys, RLS policies, transactional writes and a persistent rate limiter. Do not grant guest access to these tables or RPC functions.
3. Authentication → Providers: enable Email. The current deployment uses email/password signup with email confirmation disabled so signup works without custom SMTP. Email ownership is not verified. Configure custom SMTP and set `auth.email.enable_confirmations = true` in `supabase/config.toml` to enable confirmation delivery.
4. Authentication → URL Configuration: set **Site URL** to your HTTPS deployment origin. Add exact redirect URLs:
   - `https://YOUR_DOMAIN/auth/callback`
   - `http://localhost:3000/auth/callback` for development
5. Set all four values in `.env.local`:

| Variable                        | Meaning                                       |
| ------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your project's HTTPS Supabase URL             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key, restricted by RLS            |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-only key used by scoped routes         |
| `NEXT_PUBLIC_APP_URL`           | Application origin, no path or trailing slash |

For local sign-up, `NEXT_PUBLIC_APP_URL=http://localhost:3000` is allowed for email callbacks. Publishing deliberately requires this value to use HTTPS, so final invitation links never point to localhost. Set it to your real deployment origin before publishing. Use a separate staging project for testing.

Creators sign up at `/auth`, sign in, and create an invitation at `/create`. If email confirmation is enabled in your project, confirm the email before signing in. Guests use `/i/[random-token]` without an account. Real replies are saved to PostgreSQL and visible to the creator after signing in from another device.

## Vercel deployment

`vercel.json` now sets the Next.js framework, `npm ci`, the production configuration check, and the Singapore function region. Node.js is pinned to 22.x. `.vercelignore` excludes the local database, caches, local environment files and generated builds from CLI uploads. Production configuration is checked before Vercel builds, so a missing database cannot quietly deploy the setup screen as a working product.

1. Push this folder to a private Git repository and import it into Vercel. Choose **Next.js**, Node 22+, installation `npm ci`, build `npm run build`. No custom output directory is needed.
2. Add the four environment variables above to the relevant Vercel environment. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS origin (for example `https://bloomdate-yourname.vercel.app`). Public variables are captured at build time; redeploy after changing them.
3. Deploy. Update Supabase's Site URL and redirect allowlist to match the exact final domain. Preview domains need their own environment configuration and allowlisted callback, preferably against staging Supabase.
4. Run the smoke checks below. Share links use the configured HTTPS origin, not the browser's development origin. Web Share and WhatsApp only open after a user clicks their share controls; the app never sends a message automatically.

**Current deployment:** https://bloomdate-gilt.vercel.app, deployed to Vercel team `kal-5af6` on 13 October 2026. Supabase project `xhsheyxbqffythredtxc` runs in Singapore with the migration applied and production authentication URLs configured. Production HTTPS checks passed for signup/login, invitation publication, guest decline, duplicate retry, private response editing, dashboard access and deletion. Disposable verification records were removed. Credentials are stored outside tracked source in ignored local files and Vercel environment variables.

If deploying directly from this computer without a Git repository:

```powershell
$env:Path = 'C:\laragon\bin\nodejs\node-v22;' + $env:Path
npx.cmd vercel login
npx.cmd vercel link
```

Choose a new project named `bloomdate`. In that project's Vercel settings, add the four production environment variables from the table above. Use the actual assigned production domain for `NEXT_PUBLIC_APP_URL`. Create a Supabase project, run the migration, configure its email provider and allowlist that domain's `/auth/callback` before deploying:

```powershell
npx.cmd vercel --prod
```

No existing Git repository is required for a CLI deployment. The CLI must be signed in to the intended Vercel account. Do not upload `.data` or reuse its SQLite file as cloud storage; Vercel deployments use the online Supabase database.

## Fun Romantic Mode

Enabled by default, optional in step five of the creator wizard. English and Bahasa Melayu invitation UI are supported; an EN/BM control lets the recipient change language.

| Attempt     | English floating message           | Bahasa Melayu                 | Yes size |
| ----------- | ---------------------------------- | ----------------------------- | -------- |
| 1           | Are you sure? 🥺                   | 🥺 Eh tunggu...               | 67% of card |
| 2           | Maybe give me one chance? 🌹       | 😭 Bagi peluang...            | 80% of card |
| 3           | I planned this with you in mind 💌 | 🌹 Satu date je...            | 93% of card |
| 4           | Okay okay... last question 😇      | ☕ Saya belanja kopi...       | Full screen |
| 5, optional | 💍 Not a proposal just yet!        | 💍 Eh bukan proposal lagi ni! | Full screen |

Mouse hover or touch causes **at most four** nearby spring escapes. Yes grows in width, height and text size, then opens a full-screen native dialog after the fourth escape. Its No button remains stationary and immediately clickable; the fifth touch can decline normally. The normal card also provides **Decline directly** and **Skip the teasing**. Close or Escape dismisses the full-screen effect and stops teasing. Keyboard navigation and reduced-motion settings bypass growth and escapes. Full-screen controls stay above the large Yes button with safe-area spacing and compact layouts for short screens.

Original SVG teddy bears cuddle a heart or hold a bouquet beside the question and on the full-screen Yes. Dozens of animated blossoms and hearts decorate the invitation and question; a thirty-petal burst accompanies later attempts. Decorations do not intercept clicks and respect reduced-motion preferences.

After four escapes, optional petal clicks or further mouse re-entries advance the jokes without any more button movement. At attempt ten, a dismissible native dialog shows the supplied warning and respect/sadness/hope stats. “🥺 Okay, saya faham” declines; “❤️ Tapi kalau berubah fikiran...” accepts and starts planning. Escape closes the dialog. There is no forced sequence, endless escape, or extra question after someone declines.

## Response and privacy policy

- One response per invitation. A database row lock and unique constraint enforce this; retries using the same submission UUID return the same saved response. A different UUID gets an already-answered message.
- After saving, the guest receives a separate private `/response/[edit-token]` link. Keep it private and bookmark it. Only the token hash is stored, and the token is never returned with public invitation data or to the creator. A lost private link cannot be recovered through the public invitation.
- Published options are immutable. To change a plan, revoke and create a new invitation. Draft saves increment the version; submissions with an outdated version are rejected. A confirmed plan is never silently rewritten by a creator.
- Expiry and revocation block public reads, submission, and guest editing on the server. Revocation also removes the public share token. Owner-only deletion requires an explicit UI confirmation and cascades through options and replies.
- Accepted offered dates/times are confirmed. Another-day suggestions await the creator's agreement; the creator should contact the recipient to agree. They do not get a calendar export for an unagreed suggestion.
- Calendar downloads use actual selected date/time, convert Kuala Lumpur UTC+8 to UTC and create a two-hour event. PNG cards wrap actual confirmed names, place, preferences and notes with a height that expands for long content.
- Flower selection only records a preference. Nothing orders or delivers flowers.
- Public links use 256-bit random tokens. Edit links derive a separate cryptographic token from the original submission UUID and a server secret. Rotating the service key does not invalidate existing edit links but can affect recovery of a retry's link; avoid rotation during outstanding failed-submit retries.
- All guest DB access is through scoped server routes. Server and database both validate version, date/time pairing, future time, option ownership and suggestion eligibility. User-provided text is rendered as text, not HTML.
- Authenticated database sessions have RLS-protected read access; all invitation writes use service-only functions after verified creator authentication. Cookies refresh through the Next.js proxy. Mutation routes check same-origin requests.
- Public traffic is limited in PostgreSQL by hashed IP/scope: 10 writes, 60 invitation views, or 30 edit-link views per minute. No raw IP addresses are stored. Host behind Vercel's trusted forwarding headers; other reverse proxies must overwrite client-supplied forwarding headers. For a high-volume deployment, add edge abuse protection as well.
- Private paths are excluded from robots and use generic metadata; no private names or messages appear in social previews. No third-party analytics or autoplay audio are included.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

With the local development server running, test the real HTTP flow:

```powershell
$env:RUN_LOCAL_HTTP_TESTS = '1'
npm.cmd run test:integration
```

This creates a separate temporary workspace session, publishes a disposable invitation, saves and edits a guest response, verifies revocation, and deletes only its own test invitation.

The automated tests run actual migration SQL in embedded PostgreSQL (PGlite), RLS isolation checks, transactional response validation, DOM mouse/touch/keyboard/reduced-motion scenarios, the complete demo acceptance flow, schema validation and calendar exports. PGlite uses built-in UUID generation and omits only the `pgcrypto` extension declaration. Tests do not depend on production credentials.

Optional live staging checks:

```powershell
# Load staging .env.local values into the shell environment first.
$env:RUN_LIVE_TESTS = '1'
$env:TEST_USER_A_EMAIL = 'creator-a@example.test'
$env:TEST_USER_A_PASSWORD = 'YOUR_TEST_PASSWORD'
$env:TEST_USER_B_EMAIL = 'creator-b@example.test'
$env:TEST_USER_B_PASSWORD = 'YOUR_TEST_PASSWORD'
npm.cmd run test:integration
```

Use **two existing confirmed accounts in a disposable staging Supabase project**. This opt-in test creates and removes its own random invitation and tests separate authenticated sessions against the real database. Without credentials/opt-in, it reports a skip. Browser pixel QA and actual Supabase email delivery must be checked manually if no connected browser or credentials are available.

## Post-deployment smoke checks

- Sign up, confirm email, sign in and sign out on the final HTTPS domain.
- Create a draft, preview it, edit it, then publish. Copy/share the resulting final-domain link.
- Open that link on a second phone without signing in. Test Yes, maybe and decline using separate invitations. Confirm the creator sees each saved reply from another device.
- Check four escapes and the fifth clickable touch, direct decline, keyboard Enter, reduced motion, optional attempt-ten card and its dismissal.
- Check widths at 320, 375, 768 and 1440 pixels, visible focus, scrolling with the mobile keyboard, and no horizontal overflow.
- Make a network failure during submission. The screen must show an error and retain selections; retry must save one response.
- Use the private edit link. The creator should see the changed response without gaining the edit token.
- Confirm a second distinct submission is rejected. Try a forged time/activity ID, stale version and another creator's draft ID.
- Confirm expired, revoked and invalid links fail; guests cannot access `/dashboard` or `/create`; Creator B cannot read/manage Creator A's invitation.
- Open the `.ics` file in your calendar: verify selected time in Kuala Lumpur. Download the PNG and check the confirmed details and long notes.
- Revoke a link, then check public and private edit access both fail. Delete an invitation with confirmation and verify the dashboard updates.

Implementation references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Supabase server-side auth](https://supabase.com/docs/guides/auth/server-side), and [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
