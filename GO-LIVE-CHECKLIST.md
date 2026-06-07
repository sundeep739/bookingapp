# BookEasy — Go-Live Checklist

Step-by-step guide to flip every service from test/dev to production.
Work through sections **in order** — later steps depend on earlier ones.

---

## 0 · Pre-flight (do this first)

- [ ] You have a custom domain (e.g. `bookeasy.app` or `yourdomain.com`)
- [ ] Domain is registered and you can edit its DNS records
- [ ] You have accounts on: Vercel, Supabase, Google Cloud Console, Resend, Stripe
- [ ] Optional but recommended: Twilio account for SMS

---

## 1 · Supabase — Production Database

Your current DATABASE_URL points at the Supabase **free tier** project (Transaction Pooler,
port 6543). This is fine to launch on, but note the limits.

### 1a. Confirm you're using the Transaction Pooler (already done)
Your DATABASE_URL should look like:
```
postgresql://postgres.XXXX:PASSWORD@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```
- Port **6543** = Transaction Pooler ✅  
- Port 5432 = Session Pooler (exhausts at 15 connections — avoid) ❌

### 1b. Enable Row Level Security (optional but good practice)
> Supabase Dashboard → Table Editor → each table → Enable RLS  
> Because all DB access goes through Prisma server-side, RLS isn't strictly needed,
> but it prevents accidental direct-access leaks.

### 1c. Set up Supabase backups
> Supabase Dashboard → Settings → Backups  
> Free tier: 1 daily backup. Paid tier: PITR (point-in-time recovery).  
> At minimum, enable "Download latest backup" as a weekly habit before launch.

### 1d. Check connection limits
Free tier = **15 connections** total. With `connection_limit=1` per serverless function,
you can handle ~10 concurrent cold starts safely. If you expect higher traffic, upgrade to
Supabase Pro ($25/mo) for 90 connections.

---

## 2 · Google Cloud Console — OAuth + Calendar

### 2a. Switch OAuth app from "Testing" to "Production"
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project → **APIs & Services → OAuth consent screen**
3. Status is currently **"Testing"** — click **"Publish App"** → Confirm
4. This removes the 100-user test limit and the "unverified app" warning banner

### 2b. Add your production domain to Authorized Domains
> OAuth consent screen → Authorized domains → Add Domain  
> Add: `yourdomain.com`

### 2c. Update Authorized Redirect URIs
> APIs & Services → Credentials → OAuth 2.0 Client IDs → your client  
> Under **Authorized redirect URIs**, add:
```
https://yourdomain.com/api/auth/callback/google
```
Keep `http://localhost:3000/api/auth/callback/google` for local dev.

### 2d. Verify Google Calendar API is enabled
> APIs & Services → Enabled APIs → confirm "Google Calendar API" is in the list  
> If missing: + Enable APIs → search "Google Calendar API" → Enable

### 2e. (Optional) Request Google verification
If your OAuth app requests sensitive scopes (calendar read/write), Google may show a
security warning. To remove it, submit for verification:
> OAuth consent screen → Submit for verification  
> Requires: privacy policy URL (`yourdomain.com/privacy`), app homepage, justification  
> Takes 1–4 weeks. App still works without this — users just see a warning on first login.

---

## 3 · Resend — Email (CRITICAL — do this before launch)

Without this step, **only you receive emails**. Real customers won't get
confirmation emails, magic links, or reminders.

### 3a. Add and verify your domain
1. Go to [resend.com/domains](https://resend.com/domains)
2. Click **Add Domain** → enter `yourdomain.com`
3. Resend shows you **3–4 DNS records** to add (SPF, DKIM, DMARC)
4. Go to your domain registrar → DNS settings → add each record
5. Back in Resend → click **Verify** (can take 5–30 mins to propagate)
6. Status turns green ✅

### 3b. Update RESEND_FROM_EMAIL
Once the domain is verified, update this env var in Vercel (step 5):
```
RESEND_FROM_EMAIL="BookEasy <noreply@yourdomain.com>"
```
Replace the current `onboarding@resend.dev` shared sender.

### 3c. Test email delivery
After updating, trigger a test magic-link login. Confirm it arrives in a
**non-owner** inbox (i.e., an email address that isn't your Resend account email).

### 3d. DNS records to add at your registrar
| Type | Host | Value |
|------|------|-------|
| TXT  | `@` or `yourdomain.com` | `v=spf1 include:amazonses.com ~all` |
| TXT  | `resend._domainkey` | `p=...` (shown in Resend dashboard) |
| TXT  | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com` |

---

## 4 · Stripe — Switch to Live Mode

### 4a. Complete Stripe account activation
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Click **Activate your account** (top banner)
3. Fill in: business type, address, bank account for payouts, ID verification
4. Wait for Stripe to approve (usually instant, sometimes 1–2 business days)

### 4b. Create live products and prices
Run the setup script with your **live** secret key:
```bash
cd app_code
$env:STRIPE_SECRET_KEY="sk_live_YOUR_LIVE_KEY"
$env:NEXT_PUBLIC_APP_URL="https://yourdomain.com"
npx tsx scripts/stripe-setup.ts
```
This creates Pro/Team/Business products and a webhook endpoint in **live mode**.
Copy the printed env vars — you'll need them in step 5.

> ⚠️ The live key starts with `sk_live_`, NOT `sk_test_`. Keep them separate.

### 4c. Register the live webhook
The setup script registers `https://yourdomain.com/api/webhooks/stripe` automatically.
Confirm in Stripe Dashboard → Developers → Webhooks:
- [ ] URL: `https://yourdomain.com/api/webhooks/stripe`
- [ ] Events: `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`, `account.updated`
- [ ] Status: Enabled

### 4d. Copy the live webhook signing secret
> Stripe Dashboard → Developers → Webhooks → your endpoint → **Signing secret** → Reveal  
> This is your `STRIPE_WEBHOOK_SECRET` for production (starts with `whsec_`).

### 4e. Stripe Connect settings (for host booking payments)
> Stripe Dashboard → Settings → Connect → **Branding**  
> Add your platform name ("BookEasy"), logo, and support URL.  
> This is what hosts see when they click "Connect Stripe" in their dashboard.

### 4f. Validate before going live
```bash
$env:STRIPE_SECRET_KEY="sk_live_..."
$env:STRIPE_PRICE_PRO="price_live_..."
# ... (all live values)
npx tsx scripts/stripe-validate.ts --live
```
All ✅ required before proceeding.

---

## 5 · Vercel — Environment Variables

Go to [vercel.com](https://vercel.com) → your project → **Settings → Environment Variables**.

Set **Environment** to "Production" for all of these.

### 5a. Replace every test/placeholder value

| Variable | Production value |
|----------|-----------------|
| `DATABASE_URL` | Your Supabase Transaction Pooler URL (port 6543, already set) |
| `NEXTAUTH_URL` | `https://yourdomain.com` |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` and use the output — or generate at [generate-secret.vercel.app](https://generate-secret.vercel.app/32) |
| `GOOGLE_CLIENT_ID` | Same as now (your OAuth client ID) |
| `GOOGLE_CLIENT_SECRET` | Same as now |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` |
| `NEXT_PUBLIC_APP_NAME` | `BookEasy` (or your brand name) |
| `RESEND_API_KEY` | Same key from resend.com (works for all domains on your account) |
| `RESEND_FROM_EMAIL` | `BookEasy <noreply@yourdomain.com>` (after domain verified in step 3) |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (live webhook secret from step 4d) |
| `STRIPE_PRICE_PRO` | `price_live_...` (from step 4b output) |
| `STRIPE_PRICE_TEAM` | `price_live_...` |
| `STRIPE_PRICE_BUSINESS` | `price_live_...` |
| `CRON_SECRET` | Any random string (e.g. `openssl rand -hex 20`) — protects the reminder cron |
| `TWILIO_ACCOUNT_SID` | From twilio.com/console (if enabling SMS) |
| `TWILIO_AUTH_TOKEN` | From twilio.com/console |
| `TWILIO_PHONE_NUMBER` | Your purchased Twilio number e.g. `+12025551234` |

### 5b. Trigger a redeploy
After saving all env vars:
> Vercel → Deployments → the latest deployment → **Redeploy** (not "Promote from preview")  
> Or push an empty commit: `git commit --allow-empty -m "chore: trigger production redeploy"`

---

## 6 · Custom Domain on Vercel

### 6a. Add domain to Vercel
1. Vercel → your project → **Settings → Domains**
2. Click **Add** → type `yourdomain.com`
3. Vercel shows you DNS records to add

### 6b. Add DNS records at your registrar
Vercel gives you one of two options — use whichever your registrar supports:

**Option A — CNAME (recommended for subdomains like `www`):**
| Type | Host | Value |
|------|------|-------|
| CNAME | `www` | `cname.vercel-dns.com` |
| A | `@` | `76.76.21.21` |

**Option B — Nameservers (if Vercel manages DNS):**
Change your domain's nameservers to Vercel's (shown in dashboard).

### 6c. Wait for DNS propagation + SSL
Usually 5–30 minutes. Vercel provisions a free Let's Encrypt SSL certificate automatically.
Status turns **✅ Valid Configuration** in the Vercel dashboard.

### 6d. Set up redirect: www → apex (or apex → www)
> Vercel → Settings → Domains  
> Add both `yourdomain.com` and `www.yourdomain.com`  
> Set one as the primary — Vercel will 301-redirect the other automatically.

---

## 7 · Twilio — SMS Reminders (Optional)

Skip if you don't want SMS. The app works fine without it.

### 7a. Upgrade from trial to paid
Twilio trial accounts add a "Sent from a Twilio trial account" prefix to every SMS
and can only message verified numbers. Go to:
> [twilio.com/console](https://twilio.com/console) → Upgrade account → add a credit card

### 7b. Purchase a phone number
> Console → Phone Numbers → Manage → Buy a Number  
> Choose a number with SMS capability in your target country  
> Cost: ~$1/month + $0.0075/SMS (US)

### 7c. Register for A2P 10DLC (US numbers only)
If you're sending SMS to US numbers from a US long code (10-digit), you must register:
> Console → Messaging → Regulatory Compliance → Start Registration  
> Requires: business name, EIN (US tax ID), use case description  
> Takes 1–5 business days. Without registration, carriers will block your messages.

### 7d. Add env vars to Vercel
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+12025551234
```

### 7e. Test SMS
After deployment, book an appointment — check that the test number receives a confirmation
(if phone was provided). The 24h/1h reminders fire via the daily cron job.

---

## 8 · Vercel Cron — SMS Reminders

### 8a. Confirm cron is active
> Vercel → your project → **Cron Jobs** tab  
> You should see `/api/cron/reminders` with schedule `0 8 * * *` (8am UTC daily)  
> If missing, check `vercel.json` is in the repo root

### 8b. Set CRON_SECRET
This protects the endpoint from being triggered by anyone.
The `CRON_SECRET` env var must be set in Vercel (step 5).
Vercel automatically sends it as a header when it fires the cron — no action needed
beyond setting the variable.

### 8c. Adjust the cron time (optional)
`0 8 * * *` = 8am UTC. To fire at 8am London time (GMT/BST):
- Winter (GMT): `0 8 * * *` — already correct
- Summer (BST = UTC+1): `0 7 * * *`

For a global app, keep 8am UTC and let the SMS message show the local time.

---

## 9 · Final Smoke Tests (do these after everything above)

Run these against `https://yourdomain.com` — not localhost.

### Authentication
- [ ] Visit homepage → "Get Started" → lands on sign-in page
- [ ] Sign in with Google → completes OAuth → lands on dashboard (or onboarding)
- [ ] Sign in with email (magic link) → email arrives in inbox from `noreply@yourdomain.com` → link works

### Booking flow (as a guest)
- [ ] Visit `https://yourdomain.com/YOUR_USERNAME`
- [ ] Select event type → pick a date → pick a time slot
- [ ] Fill in name, email → confirm
- [ ] **Guest** receives confirmation email with calendar details
- [ ] **Host** receives notification email
- [ ] Booking appears in dashboard

### Paid booking (if Stripe Connect is set up)
- [ ] Host: Settings → Billing → Payouts → Connect Stripe → complete Connect onboarding
- [ ] Create an event type with a price set
- [ ] Book it as a guest → Stripe Checkout appears → use test card `4242 4242 4242 4242`
- [ ] Booking flips to CONFIRMED after payment
- [ ] Both emails sent

### Subscription upgrade
- [ ] Dashboard → Settings → Billing → Upgrade to Pro → Stripe Checkout → complete
- [ ] Plan shows "Pro" in dashboard after success redirect

### Guest reschedule
- [ ] Find a booking confirmation email → click "Manage booking"
- [ ] Reschedule to a new slot → confirm → receive reschedule email

### GDPR
- [ ] Settings → Privacy → Export my data → downloads JSON
- [ ] (Test on a throwaway account) Delete my account → account gone, redirected to homepage

---

## 10 · Monitoring & Alerts (recommended before first customers)

### 10a. Vercel error notifications
> Vercel → project → Settings → Notifications  
> Enable email alerts for failed deployments and function errors

### 10b. Uptime monitoring (free options)
- [UptimeRobot](https://uptimerobot.com) — monitors `https://yourdomain.com` every 5 minutes, emails if down (free tier)
- [BetterUptime](https://betteruptime.com) — also free tier, nicer dashboard

### 10c. Error tracking (optional but recommended)
Add [Sentry](https://sentry.io) for runtime error visibility:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```
Set `SENTRY_DSN` in Vercel env vars.

---

## 11 · Go-Live Sequence (the actual order to do it)

```
Day 1 — Infrastructure
  □ Resend domain verification (takes time to propagate — start first)
  □ Add domain to Vercel + DNS records
  □ Wait for SSL certificate

Day 2 — Services
  □ Google OAuth: Publish app, add production redirect URI
  □ Stripe: Activate account, create live products (stripe-setup.ts --live)
  □ Copy all live env vars to Vercel
  □ Redeploy

Day 2 — Validate
  □ npx tsx scripts/stripe-validate.ts --live
  □ Run all smoke tests (section 9)
  □ Send yourself a magic-link email — confirm it arrives from your domain
  □ Make a real $1 test booking end-to-end

Day 3 — Go live
  □ Remove "Beta" / "Coming soon" banners if any
  □ Submit Google OAuth app for verification (if needed)
  □ Set up UptimeRobot monitoring
  □ Tell your first users!
```

---

## Quick Reference — All Production Env Vars

```bash
# Database
DATABASE_URL="postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Auth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="<32 random bytes>"

# Google
GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_NAME="BookEasy"

# Email
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="BookEasy <noreply@yourdomain.com>"

# Stripe (LIVE keys)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_PRO="price_live_..."
STRIPE_PRICE_TEAM="price_live_..."
STRIPE_PRICE_BUSINESS="price_live_..."

# Cron
CRON_SECRET="<random string>"

# SMS (optional)
TWILIO_ACCOUNT_SID="ACxxxxxxxx"
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+12025551234"
```

---

*Last updated: June 2026 | BookEasy v1.0*
