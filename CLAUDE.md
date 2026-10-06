# KeepWarm — build brief

> "Keep every lead warm." A simple lead & follow-up tracker for a small commercial refrigeration repair business.
> This file is the single source of truth for this project. Read it fully before writing code.

---

## 1. Context

I'm applying for a **Forward Deployed Engineer** role at Gushwork (AI agents for SMBs). Round 1 take-home, **due today**:
read a customer call transcript, work out what would actually help her, and build a **functional prototype** (any AI tools allowed).

Reviewers judge: (1) did I understand the real problem, (2) did I build only what she needs, (3) does it actually work, (4) can I explain my decisions.

## 2. The customer — Denise

- Owns a commercial refrigeration repair company (walk-in coolers, freezers, ice machines) serving restaurants, grocery stores, warehouses. 4 field techs. Husband does the books part-time.
- ~15–20 new job requests/week + repeat work. Requests arrive in 4 places: calls to her cell, website contact form → email inbox, texts from repeat customers/referrals, a paper notebook.
- **Pain 1:** leads slip. A restaurant called Friday with a freezer down; she forgot to follow up; by Monday they'd hired someone else. ~$2,000 lost.
- **Pain 2:** loses track of status — quote sent? said yes? tech scheduled?
- **Pain 3:** husband can't get numbers ("how many open jobs?").
- **Her ask (verbatim spirit):** "I just want to wake up and know who I need to call today… where each job is at: waiting on quote, waiting on their yes, scheduled, done. That is it." Flag anyone "who hasn't heard from us in two days."
- "I don't need anything fancy." Tech scheduling = "nice later" → **do not build it.**
- Uses her **phone** in the field → **mobile-first.**

## 3. Product in one sentence

**Every job request lands in one list, gets a status, and keeps showing up on Denise's "Today" screen until it's done or lost.**
Anything that doesn't serve this sentence is out of scope.

## 4. Build strategy — no external accounts needed until the end

Build and run the whole app **locally with zero external services**, then plug in real services via env vars at the end:

| Concern | Local default (no setup) | Production (env var present) |
|---|---|---|
| Database | **PGlite** (embedded Postgres, file in `./.pglite`) via Drizzle | **Neon Postgres** when `DATABASE_URL` is set (`@neondatabase/serverless` + drizzle) |
| AI extraction | **Rule-based extractor** (regex phone/email, keyword urgency, first-line name guess) | **Claude Haiku 4.5** when `ANTHROPIC_API_KEY` is set (model from `ANTHROPIC_MODEL`, default `claude-haiku-4-5`) |
| Email (alerts/digest) | Log to console + `/digest` preview page | **Resend** when `RESEND_API_KEY` is set |
| Auth | Off when `APP_PASSCODE` unset | Single shared passcode gate (middleware + httpOnly cookie) |

Same Drizzle schema for both DB drivers. Write a tiny `db/index.ts` that picks the driver from env. Provide `.env.example` documenting all vars. Never commit `.env.local`.

## 5. Architecture

```
 INTAKE (4 doors, 1 pipeline)
 Web form    ── POST /api/inbound/webform ─┐
 Email       ── POST /api/inbound/email ───┤    intake(raw, source):
 SMS*        ── POST /api/inbound/sms ─────┼──▶   1 save raw text
 Missed call*── POST /api/inbound/call ────┤      2 extract fields (Claude or rules)
 Denise "+"  ── /api/extract → confirm → save ┘   3 normalize phone (code, E.164, default US)
                                                  4 find customer by phone
 * Phase 2: Twilio. In the demo, /demo posts      5 open job for that customer? → add activity
   realistic sample payloads to these routes.       else → new job (stage=new)
                                                  6 emergency? → alert email
                                       │
                       Postgres: customers · jobs · activities
                                       │
        Today = getTodayList(jobs, now, config)   Daily cron → digest email   Numbers (SQL counts)
        (pure function, unit tested, no AI)       (vercel.json cron)
```

Principles:
- **AI only for text → fields.** Ranking, dedupe, phone normalization, stage rules = plain code (free, predictable, testable).
- Manual "+" entries: AI fills a **preview**; Denise confirms before saving.
- Inbound form/email/SMS: saved automatically, flagged `auto_added = true`. If extraction fails, still save the job with raw text and a fallback title — **never drop a lead.**
- Email extraction also returns `is_job_request`; if false (spam/invoice/newsletter), log it but don't create a job.
- Webhooks require `?token=` matching `INBOUND_TOKEN` (skip check if unset locally). Web form has a honeypot field.

## 6. Data model (Drizzle)

**customers**: id, name, business_name, phone (unique, E.164), email, address, created_at

**jobs**: id, customer_id → customers, problem (short), equipment (`walk_in_cooler|walk_in_freezer|reach_in|ice_machine|other`), urgency (`emergency|soon|routine`), source (`call|text|email|web_form|notebook`), stage (`new|waiting_on_quote|waiting_on_yes|said_yes|scheduled|done|lost`), quote_amount (int cents, nullable), quote_sent_at, scheduled_for, last_contact_at, next_follow_up_at, contact_attempts (int, default 0), raw_input (text), auto_added (bool), lost_reason, created_at, updated_at

**activities**: id, job_id → jobs, type (`created|called|texted|emailed|voicemail|note|stage_change|quote_sent|inbound_message`), note, created_at

Rules:
- Logging called/texted/emailed/voicemail → set `last_contact_at = now`, `contact_attempts += 1`.
- Marking quote sent → `quote_sent_at = now`, stage → `waiting_on_yes`, store amount.
- Any reply / "said yes" resets `contact_attempts` to 0.
- Stage change writes a `stage_change` activity. Done/Lost close the job.
- "New" can jump straight to Said yes / Scheduled (repeat jobs that need no quote).

## 7. Today rules — `lib/today.ts` (pure, unit-tested)

Open jobs only (not done/lost). Each job appears **once**, in its **first** matching group:

1. **Emergencies** — urgency=emergency AND stage ∈ {new, waiting_on_quote}. Reason: "Emergency · by {source} {time ago}"
2. **New — not called yet** — stage=new AND contact_attempts=0. Reason: "New · via {source} {time ago}"
3. **Follow-up due** — next_follow_up_at ≤ end of today. Reason: "Follow-up due {when}"
4. **Waiting on their yes 2+ days** — stage=waiting_on_yes AND quote_sent_at ≥ 2 days ago. Sort by quote_amount desc. Reason: "No reply in N days"
5. **Said yes — needs scheduling** — stage=said_yes. Reason: "Said yes · needs a date"
6. **Quotes you owe** — stage=waiting_on_quote. Reason: "Asked {time ago}"
7. **Gone quiet** — no contact (last_contact_at, else created_at) ≥ 2 days, any open stage, unless next_follow_up_at is in the future. Reason: "No contact in N days"

Extras: contact_attempts ≥ 3 with no reply → show "Mark as lost?" suggestion (never auto-mark).
All thresholds in one `config` object (`STALE_DAYS=2`, `QUOTE_FOLLOWUP_DAYS=2`, `MAX_ATTEMPTS=3`).
Times computed in `BUSINESS_TZ` (default `America/Chicago` — Denise's location unknown; state assumption in README).

Tests (Vitest): every group, ordering, one-group-only, future follow-up suppresses "gone quiet", TZ end-of-day edge.

## 8. AI extraction — `lib/extract.ts`

- Interface: `extract(raw: string, hint?: Source) → { is_job_request, customer_name, business_name, phone, email, address, problem, equipment, urgency, confidence, notes }`
- Claude: use the official `@anthropic-ai/sdk`, **tool use / structured output with a JSON schema**, temperature 0, short system prompt describing Denise's business and urgency rules (e.g. "freezer down", "not cooling", "food spoiling" → emergency).
- Validate the result with **zod**; on any error/timeout → fall back to the rule-based extractor.
- Rule-based extractor: regex phone/email, urgency keywords, equipment keywords, problem = first sentence trimmed.
- Test fixtures (run against rules always; against Claude only if key present): a messy SMS, a forwarded web-form email, a terse notebook note, a spam email.

## 9. Screens — match the design

A Claude Design export exists (`design/Callback_App.html` — rename brand to **KeepWarm**). Match its look: warm ivory background `#FAF9F5`, white cards with `#E8E6DC` borders, text `#141413`, accent terracotta `#D97757` (hover `#C15F3C`), serif display headings + clean sans body, rounded 12–16px, big tap targets, color only for meaning (red emergency `#B53D2E`, amber waiting `#B7791F`, green done `#5A7D4F`, blue scheduled `#4A6FA5`). Light + dark mode. Fix two design nits: sidebar background must span full height; Today badge count must match the header count.

1. **Today** (`/`) — "Good morning, Denise" + date, "N people to call today", grouped cards (business, contact, problem, reason chip, $ amount, source tag), buttons **Call** (`tel:`), **Text** (`sms:`), **···** (Log contact, Move stage). Empty state: "You're all caught up ☕".
2. **All jobs** (`/jobs`) — mobile: stage tabs with counts; desktop: columns. Search + source filter. Lost hidden behind a filter.
3. **Add job** (`/jobs/new`) — big textarea "Paste a text or email, or type what they said…" (hint: keyboard mic works) → "Organize it" → editable preview → "Repeat customer found: X · N past jobs" if phone matches → Save. "Fill in manually" link.
4. **Job detail** (`/jobs/[id]`) — call/text, stage stepper, quote amount, next follow-up (editable), urgency, activity timeline, collapsible original message, Log-contact sheet (Called / Texted / Emailed / Left voicemail / Quote sent $ / They said yes + note).
5. **Numbers** (`/numbers`) — tiles: Open jobs · New this week · Waiting on a yes (count + $) · Won this month ($) · Lost this month; one bar chart: new jobs per week by source (simple CSS bars or Recharts).
6. **/demo** — buttons: Simulate web form · Simulate email · Simulate customer text (to an existing customer → attaches to open job) · Simulate missed call · Reset demo data. Shows what happened.
7. **/contact** — sample "Denise's Refrigeration" public contact form posting to `/api/inbound/webform` (proves the real flow).
8. **/digest** — preview of the morning email (same data as Today).

Navigation: mobile bottom bar (Today · All jobs · big **+** · Numbers); desktop left sidebar. Use Server Components + Server Actions for mutations; `revalidatePath` after changes. No client state library.

## 10. Seed data — `scripts/seed.ts` (times relative to now)

- Tony's Diner (Tony Russo) — walk-in freezer down — EMERGENCY — call, 40 min ago — new
- Green Leaf Bistro (Maya Chen) — service visit for walk-in cooler — web form, 2h ago — new
- FreshMart Grocery (Carl Dimas) — reach-in cooler loud noise — waiting_on_yes — $1,250 — sent 3 days ago
- Harbor Seafood Co (Rita Okafor) — compressor replacement — waiting_on_yes — $3,400 — sent 2 days ago
- Bay Cold Storage (Dev Patel) — ice machine not making ice — said_yes — $680
- Luigi's Pizzeria (Marco Ferraro) — walk-in cooler warm — waiting_on_quote — text, yesterday
- Corner Deli (Sam Haddad) — freezer door gasket torn — notebook — last contact 4 days ago
- Sunrise Café — quarterly maintenance — scheduled Thursday
- Metro Warehouse — done — $2,100
- ~12 older done/lost jobs across the last 6 weeks with mixed sources, so Numbers has data. Give Tony's Diner 3 past done jobs (repeat customer demo).

`npm run seed` and the /demo "Reset" button both reset to this state.

## 11. Out of scope (list in README with reasons)

Tech scheduling/dispatch (deferred by Denise) · invoicing/payments/inventory · user accounts/roles · app texting customers (reputation risk + US A2P 10DLC registration) · AI-decided priority · real-time sync · native app.

## 12. Tech stack

Next.js (App Router, latest) + TypeScript (strict) + Tailwind · Drizzle ORM (PGlite local / Neon prod) · `@anthropic-ai/sdk` · zod · Resend (optional) · Vitest · Node 22+ (target 24 on Vercel) · deploy on Vercel with `vercel.json` cron for the digest (once daily).

## 13. Milestones (build in this order; app must run after each)

1. Scaffold, Tailwind tokens from the design, Drizzle schema, PGlite, seed script.
2. `getTodayList()` + tests → Today screen.
3. Job detail, Log contact, stage changes (server actions).
4. Add job: extraction (rules first, then Claude) + preview + repeat-customer match.
5. `intake()` + 4 inbound routes + /demo + /contact.
6. All jobs + Numbers.
7. Passcode gate, emergency alert, digest page + cron.
8. Neon + Anthropic + Vercel deploy, README.

After each milestone: run `npm run lint`, `npm test`, start the app, and briefly tell me what's done.

## 14. README must include

Problem in Denise's words · what I built and why (each feature ↔ a quote) · what I didn't build and why · assumptions vs what she said · how Today ranking works · where AI is used and where it intentionally isn't · intake architecture (diagram above) · running cost (~$0–21/mo vs $50–300+/mo for Jobber/Housecall Pro/ServiceTitan) · rollout plan (2 weeks alongside her notebook, then auto-forward form emails, then Twilio number) · next steps · questions I'd ask Denise · success metrics (zero uncontacted leads at end of day, time to first contact, quote→yes rate, daily opens) · how to run locally, env vars, tests · "How I used Claude Code".

## 15. Working rules

- Keep code simple and readable; reviewers are engineers. Small files, clear names, no premature abstractions.
- Ask me only if truly blocked; otherwise choose a sensible default and note it.
- Commit after each milestone with a clear message.

@AGENTS.md
