# BookEasy — Claude Project Context

## What this app is

**BookEasy** is a full-stack Calendly/cal.com clone. Hosts sign up, set their availability and event types, and share a public booking page. Guests book slots without an account. The app supports solo professionals, teams (clinics, barber shops), paid bookings, SMS reminders, and two-way Google Calendar sync.

Live URL: `https://sundeep739-bookingapp.vercel.app`  
Owner: Sundeep Shaw (`sundeepshaw@gmail.com`, GitHub: `sundeep739`)  
Git committer email: `sundeep739@users.noreply.github.com` (required — Vercel blocks other emails)

---

## Tech stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | **Next.js 16.2.7** App Router | Check `node_modules/next/dist/docs/` before writing any route handler — this version has breaking changes from training data |
| Language | TypeScript 5 | Strict mode off; use `any` sparingly |
| Styling | Tailwind CSS v4 | v4 syntax — no `tailwind.config.js`, config is in CSS |
| ORM | **Prisma 5.22** | Schema at `prisma/schema.prisma`; use `npx prisma db push` (NOT migrate dev) |
| Database | **Supabase PostgreSQL** | Transaction Pooler port **6543** with `?pgbouncer=true&connection_limit=1` — never use port 5432 or the Session Pooler |
| Auth | **NextAuth v4** | `NextAuthOptions` + `getServerSession`; do NOT use NextAuth v5 APIs |
| Email | **Resend** | `lib/email.ts` for transactional; `lib/auth.ts` for magic links |
| SMS | **Twilio** | `lib/sms.ts`; silently skipped if env vars absent |
| Payments | **Stripe** | Subscriptions (billing) + Connect Express (host payouts) + destination charges (booking payments) |
| Calendar | **Google Calendar API** | Two-way sync via `lib/google-calendar.ts`; Meet links auto-generated |
| Cron | **Vercel Cron Jobs** | Hobby plan = daily only (`0 8 * * *`); defined in `vercel.json` |
| Scripts | **tsx** | `npx tsx scripts/*.ts` for one-off operations |

---

## Repository layout

```
app_code/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Landing page (renders LandingPage component)
│   ├── login/page.tsx          # Sign in page
│   ├── onboarding/page.tsx     # Guided setup wizard (post first-login)
│   ├── dashboard/              # Protected host dashboard
│   │   ├── page.tsx            # Overview stats
│   │   ├── bookings/           # All bookings table
│   │   ├── event-types/        # Manage services/event types
│   │   ├── availability/       # Weekly schedule + date overrides
│   │   ├── team/               # Org members, departments, invite
│   │   ├── integrations/       # Google Calendar, SMS, Stripe status
│   │   ├── analytics/          # Charts, conversion, revenue
│   │   └── settings/           # Profile, billing, GDPR, privacy
│   ├── [username]/page.tsx     # Public booking page (individual host)
│   ├── org/[slug]/page.tsx     # Public booking page (organisation)
│   ├── cancel/[token]/page.tsx # Guest manage-booking page (reschedule + cancel)
│   ├── booking/success/        # Post-payment success
│   ├── invite/[token]/         # Org invite acceptance
│   ├── terms/page.tsx          # Legal: Terms of Service
│   ├── privacy/page.tsx        # Legal: Privacy Policy
│   └── api/                    # Route handlers (see API map below)
├── components/
│   ├── landing/LandingPage.tsx
│   ├── booking/PublicBookingPage.tsx      # Guest booking UI
│   ├── org/OrgBookingPage.tsx            # Org booking UI
│   ├── onboarding/GuidedOnboarding.tsx   # Multi-step wizard
│   ├── dashboard/                         # All dashboard panels
│   │   ├── BookingDetailDrawer.tsx        # Slide-in: view/reschedule/cancel
│   │   ├── SettingsPanel.tsx              # Profile, Billing, Privacy tabs
│   │   ├── TeamPanel.tsx                  # Org management
│   │   └── IntegrationsPanel.tsx          # Live integration status
│   ├── shared/ImageUpload.tsx             # Client-side canvas resize → data URL
│   ├── legal/LegalLayout.tsx
│   └── CookieConsent.tsx                  # Mounted in app/layout.tsx
├── lib/
│   ├── auth.ts                 # NextAuth config (Google + Email providers)
│   ├── prisma.ts               # Prisma client singleton
│   ├── email.ts                # All transactional email functions (Resend)
│   ├── sms.ts                  # SMS reminders + waitlist texts (Twilio)
│   ├── google-calendar.ts      # Create/update/delete calendar events + Meet links
│   ├── google-token.ts         # Refresh expired Google access tokens
│   ├── booking-finalize.ts     # Shared post-booking side-effects (calendar + emails)
│   ├── cancellation.ts         # Shared cancel side-effects (delete event + emails + waitlist)
│   ├── stripe.ts               # Stripe client, plan price IDs, planFromPriceId
│   ├── plan.ts                 # Plan limits, effectivePlan(), limitsFor()
│   └── rate-limit.ts           # In-memory fixed-window rate limiter
├── prisma/schema.prisma
├── scripts/
│   ├── stripe-setup.ts         # Create Stripe test/live products → prints env vars
│   ├── stripe-test.ts          # Integration tests for all Stripe flows
│   └── stripe-validate.ts      # Pre-launch checklist validator
├── vercel.json                 # Cron job definition
├── .env                        # Local env (never commit secrets)
├── .env.example                # Full variable reference (committed)
└── GO-LIVE-CHECKLIST.md        # Step-by-step production launch guide
```

---

## API route map

### Public (no auth required)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/book/[username]` | Host profile + event types |
| GET | `/api/book/[username]/slots` | Available time slots (`?date=&eventSlug=&tz=`) |
| POST | `/api/book/[username]/confirm` | Create booking (rate-limited: 8/min/IP) |
| GET | `/api/cancel/[token]` | Look up booking by cancel token |
| POST | `/api/cancel/[token]/reschedule` | Guest self-service reschedule |
| POST | `/api/waitlist` | Join waitlist (rate-limited: 5/min/IP) |
| GET | `/api/waitlist` | Waitlist count for an event type |
| GET | `/api/org/[slug]/public` | Org profile + members |
| GET | `/api/invite/[token]` | Validate org invite token |
| POST | `/api/invite/[token]` | Accept org invite |
| POST | `/api/webhooks/stripe` | Stripe webhook receiver |
| GET | `/api/cron/reminders` | SMS reminder cron (protected by `CRON_SECRET`) |

### Authenticated (host)
| Method | Route | Purpose |
|--------|-------|---------|
| GET/PUT | `/api/user/profile` | Read/update user profile |
| GET | `/api/user/export` | GDPR data export (JSON download) |
| POST | `/api/user/delete` | GDPR account erasure |
| GET/POST | `/api/event-types` | List / create event types |
| GET/PUT/DELETE | `/api/event-types/[id]` | Single event type CRUD |
| GET/PUT | `/api/availability` | Weekly schedule + date overrides |
| GET | `/api/bookings` | Host's bookings list |
| GET/PUT | `/api/bookings/[id]` | Single booking |
| POST | `/api/bookings/[id]/reschedule` | Host-side reschedule |
| POST | `/api/bookings/[id]/cancel` | Host-side cancel |
| GET | `/api/dashboard/stats` | Dashboard overview numbers |
| GET | `/api/analytics` | Charts data |
| GET | `/api/integrations/status` | Live integration health |
| GET/POST | `/api/org` | List orgs / create org |
| GET/PUT/DELETE | `/api/org/[slug]` | Org CRUD |
| GET/POST | `/api/org/[slug]/members` | List / invite members |
| PUT/DELETE | `/api/org/[slug]/members/[memberId]` | Edit / remove member |
| GET/POST | `/api/org/[slug]/departments` | Departments |
| GET | `/api/org/[slug]/bookings` | Org bookings |
| GET | `/api/org/[slug]/stats` | Org analytics |
| POST | `/api/billing/checkout` | Stripe subscription checkout |
| POST | `/api/billing/portal` | Stripe billing portal |
| GET/POST | `/api/billing/connect` | Stripe Connect status / onboarding |
| POST | `/api/onboarding/complete` | Finish guided onboarding |

---

## Database (Prisma schema key models)

```
User
  ├── username, bio, timezone, image
  ├── plan, planStatus, planRenewsAt, stripeCustomerId, stripeSubscriptionId
  ├── stripeConnectId, stripeChargesEnabled
  ├── EventType[]
  ├── Availability[], DateOverride[]
  ├── Booking[] (as host)
  ├── Account[], Session[]          ← NextAuth
  ├── OrgMember[]
  └── WaitlistEntry[]

EventType
  ├── title, slug, duration, price, currency, location, description
  ├── bufferBefore, bufferAfter, minNotice, maxDaysAhead
  ├── questions (Json)              ← custom booking questions
  ├── isActive
  └── Booking[]

Booking
  ├── inviteeName, inviteeEmail, inviteePhone
  ├── startTime, endTime, timezone
  ├── status: CONFIRMED | PENDING | CANCELLED | COMPLETED
  ├── paymentStatus: NONE | PENDING | PAID | REFUNDED
  ├── amountPaid, stripePaymentId
  ├── googleEventId, meetingLink
  ├── cancelToken (UUID — used for guest manage-booking page)
  ├── answers (Json)               ← custom question responses
  ├── notes, orgId
  └── sms24hSentAt, sms1hSentAt

Organization
  ├── name, slug, description, logo, timezone
  ├── ownerId → User
  ├── OrgMember[], Department[], OrgInvite[]
  └── OrgRole: OWNER | ADMIN | MEMBER

WaitlistEntry
  ├── eventTypeId, hostId, email, name, phone, timezone
  ├── notified (Bool)
  └── @@unique([eventTypeId, email])
```

**Schema changes:** always use `npx prisma db push` (never `migrate dev` — Vercel doesn't support migration files). For changes that drop columns, add `--accept-data-loss`.

---

## Critical patterns — read before writing code

### 1. Getting the session in Server Components / Route Handlers
```typescript
import { auth } from "@/lib/auth";

const session = await auth();
if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = (session.user as any).id;
```
Never use `useSession()` in Server Components. Never import `authOptions` in route handlers — use `auth()`.

### 2. Double-booking guard (always use for booking creation/reschedule)
```typescript
await prisma.$transaction(async (tx) => {
  const clash = await tx.booking.findFirst({
    where: {
      hostId,
      status: { in: ["CONFIRMED", "PENDING"] },
      startTime: { lt: endTime },
      endTime:   { gt: startTime },
    },
  });
  if (clash) throw new Error("SLOT_TAKEN");
  return tx.booking.create({ data: { ... } });
}, { isolationLevel: "Serializable" });
```
Catch `e.message === "SLOT_TAKEN"` or `e.code === "P2034"` → return 409.

### 3. Timezone-correct slot generation
Slots are generated in the host's timezone using `date-fns-tz`:
```typescript
import { fromZonedTime } from "date-fns-tz";
// Convert host's wall-clock availability to UTC instant:
const slotStart = fromZonedTime(`${date}T${time}`, hostTimezone);
```
Never do `new Date(dateStr + "T" + timeStr)` — that's always local/UTC, not the host's timezone.

### 4. Post-booking side effects — always use finalizeBooking()
After a booking is set to CONFIRMED:
```typescript
import { finalizeBooking } from "@/lib/booking-finalize";
await finalizeBooking(bookingId);
```
This creates the Google Calendar event (with Meet link) and sends both emails. Do NOT inline this logic.

### 5. Post-cancellation side effects — always use notifyCancellation()
```typescript
import { notifyCancellation } from "@/lib/cancellation";
await notifyCancellation(booking);
```
This deletes the calendar event, emails the guest, and notifies the first waitlist entry.

### 6. Plan enforcement
```typescript
import { limitsFor } from "@/lib/plan";
const limits = limitsFor(user.plan);
if (currentStaffCount >= limits.maxStaff) {
  return NextResponse.json({ error: "Staff limit reached", upgrade: true }, { status: 402 });
}
```
When `STRIPE_SECRET_KEY` is not set, `effectivePlan()` returns `"business"` (unlimited) — the app is fully functional without billing configured.

### 7. Rate limiting public endpoints
```typescript
import { rateLimit, clientIp } from "@/lib/rate-limit";
if (!rateLimit(`book:${clientIp(req)}`, 8, 60_000)) {
  return NextResponse.json({ error: "Too many requests." }, { status: 429 });
}
```
Apply to all public POST endpoints. Current limits: booking confirm = 8/min, waitlist = 5/min.

### 8. Google token refresh
```typescript
import { getFreshGoogleAccessToken } from "@/lib/google-token";
const token = await getFreshGoogleAccessToken(userId);
if (token) { /* use it */ }
```
Never read `access_token` from the Account table directly — it may be expired.

### 9. Stripe null safety
Stripe is optional. Always guard:
```typescript
import { stripe } from "@/lib/stripe";
if (!stripe) return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
```

### 10. Image uploads
Avatar and org logo are stored as base64 data URLs in the User/Organization `image` column.
Client-side canvas resize is applied in `components/shared/ImageUpload.tsx` before storing.
Use plain `<img src={...} />` — not `next/image` — for these (next/image rejects data URLs).

---

## Environment variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | Supabase Transaction Pooler, port 6543 |
| `NEXTAUTH_URL` | ✅ | Full URL including `https://` in production |
| `NEXTAUTH_SECRET` | ✅ | 32+ random bytes |
| `GOOGLE_CLIENT_ID` | ✅ | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | ✅ | From Google Cloud Console |
| `NEXT_PUBLIC_APP_URL` | ✅ | Used in email links, Stripe redirects |
| `RESEND_API_KEY` | ✅ | Emails won't send without this |
| `RESEND_FROM_EMAIL` | ✅ | Must match a verified Resend domain in production |
| `STRIPE_SECRET_KEY` | Optional | App runs fully without it (all plans = unlimited) |
| `STRIPE_WEBHOOK_SECRET` | Optional | Required if Stripe key is set |
| `STRIPE_PRICE_PRO/TEAM/BUSINESS` | Optional | Stripe Price IDs for subscription plans |
| `TWILIO_*` | Optional | SMS silently skipped if absent |
| `CRON_SECRET` | Optional | Protects `/api/cron/reminders` |

---

## Common commands

```bash
# Development
npm run dev                          # Start dev server on :3000

# Database
npx prisma db push                   # Apply schema changes (no migration files)
npx prisma studio                    # Visual DB browser

# Stripe test setup (run once with test key)
$env:STRIPE_SECRET_KEY="sk_test_..."
npx tsx scripts/stripe-setup.ts      # Creates products, prints env vars
npx tsx scripts/stripe-test.ts       # Runs 24-test integration suite
npx tsx scripts/stripe-validate.ts   # Pre-launch health check

# Git (always use this committer email for Vercel)
git -c user.email="sundeep739@users.noreply.github.com" -c user.name="Sundeep" commit -m "..."

# Build check (same as Vercel runs)
npm run build
```

---

## Known gotchas

| Issue | Root cause | Fix |
|-------|-----------|-----|
| `EMAXCONNSESSION` on Vercel | Session Pooler (port 5432) exhausts at 15 connections | Always use Transaction Pooler port **6543** |
| `prepared statement "s0" does not exist` | PgBouncer transaction mode doesn't support prepared statements | `?pgbouncer=true` in DATABASE_URL |
| `refresh_token_expires_in` error | Google sends this field; old Prisma schema didn't have it | Stripped in `lib/auth.ts` PrismaAdapter override — do not remove that override |
| Magic links don't arrive for real users | `RESEND_FROM_EMAIL=onboarding@resend.dev` shared sender only delivers to account owner | Verify a custom domain in Resend |
| Slots wrong by hours | Slot generation was using local server time | Fixed: `fromZonedTime` from `date-fns-tz` always used — don't revert this |
| Vercel deploy blocked | Commit email doesn't match GitHub account | Use `sundeep739@users.noreply.github.com` as git committer |
| `Prisma.JsonNull` vs `null` | Prisma JSON fields need `Prisma.JsonNull`, not plain `null` | Import `{ Prisma }` from `@prisma/client` |
| `next/image` hostname error | Data URL uploads aren't whitelisted hostnames | Use `<img>` not `<Image>` for avatar/logo fields |
| Vercel Hobby cron limit | Hobby plan only allows one cron, max daily frequency | Schedule is `0 8 * * *` — don't change to more frequent |

---

## Deployment

**Platform:** Vercel (project: `sundeep739-bookingapp`)  
**Branch:** `main` → auto-deploys on push  
**Build command:** `prisma generate && next build` (set in `package.json`)  
**Node version:** 20.x

After any env var change in Vercel, manually trigger a redeploy — env changes don't auto-deploy.

For full production launch steps, see `GO-LIVE-CHECKLIST.md`.
