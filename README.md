# KeepWarm

**Keep every lead warm.** A lead and follow-up tracker built for Denise, who runs a commercial refrigeration repair company with four field techs.

> Every job request lands in one list, gets a status, and keeps showing up on Denise's **Today** screen until it's done or lost.

---

## The problem, in Denise's words

> "Last week a restaurant called on a Friday, freezer down, and I forgot to follow up because I was slammed, and by Monday they had called someone else. That is a two thousand dollar job gone."

> "Even the ones I do catch, I lose track of where they are. Did I send the quote? Did they say yes? Is tech scheduled?"

> "My husband keeps asking me for numbers and I cannot even tell him how many open jobs we have."

> "I just want to wake up and know who I need to call today… If I had that list every morning I would be happy. I do not need anything fancy."

**What's really going on.** Denise isn't short of leads (15–20 a week, plus repeat work), and she doesn't need software to run her field team. She loses money in the gap between *a request arriving* and *someone calling them back*. Requests are spread over five places (her cell, the website form inbox, texts, a notebook, her memory), and nothing reminds her when a lead is going cold. Fix that gap and she stops losing $2,000 jobs.

## What I built, and why

| Feature | Why — what she said |
|---|---|
| **Today screen**: one ranked list of who to call, in groups (Emergencies · New, not called yet · Follow-ups due · Waiting on their yes 2+ days · Said yes, needs scheduling · Quotes you owe · Gone quiet). Each card says *why* the job is there ("No reply in 3 days"), with big Call and Text buttons. | "I just want to wake up and know who I need to call today." "If someone is waiting on me and I forget, that is money walking out the door." |
| **Gone quiet after 2 days**: any open job with no contact for 2+ days comes back onto the list automatically. | "…this one has not heard from us in two days." |
| **Stages that match hers**: New → Waiting on quote → Waiting on their yes → Said yes → Scheduled → Done (or Lost). One tap to move a job. | "Waiting on quote, waiting on their yes, scheduled, done. That is it." |
| **Log contact sheet**: Talked to them / Left voicemail / Texted / Emailed / Sent quote $ / They said yes. Tapping **Call** dials, and the "How did the call go?" sheet is waiting when she comes back. A voicemail puts them back on tomorrow's list. | "Did I send the quote? Did they say yes?" The app can only remind her if logging takes two taps. |
| **One intake pipeline for every door**: website form, email, text and missed call webhooks all feed the same `intake()` function. | "Some people call… some fill out the form… a lot… just text me. I have a notebook too. It is a mess." |
| **"+" quick add**: paste a text or email, or dictate with the keyboard mic. AI organizes it into fields, she checks them, then saves. | Captures calls and notebook entries in seconds, from her phone, in the field. |
| **Repeat-customer matching by phone number**: "Repeat customer found: Tony's Diner · 3 past jobs". A text from a customer with an open job goes onto that job instead of creating a duplicate. | "A lot is repeat customers or referrals." |
| **Emergency alert email** the moment a "freezer down" comes in. | The Friday freezer job: an emergency can't wait for Monday's list. |
| **Morning email**: the same Today list in her inbox at 7am. | "If I had that list every morning I would be happy." |
| **Numbers**: open jobs, new this week, $ waiting on a yes, won and lost this month, and where leads come from. | "My husband keeps asking me for numbers." |
| **Mobile-first**, with a bottom tab bar and big tap targets. Desktop gets a sidebar and a column board. | She's on her phone, in the field. |

## What I didn't build, and why

| Not built | Why |
|---|---|
| Tech scheduling / dispatch | She said: "That would be nice later but I kind of know where everyone is." |
| Invoicing, payments, inventory | Her husband does the books. Not the problem she raised. |
| User accounts and roles | Two people use it. A shared passcode is enough. |
| Texting customers *from* the app | Reputation risk (automated texts to restaurant owners) and US carrier rules (A2P 10DLC registration). Call/Text buttons open her own phone apps, so customers see her number like always. |
| AI deciding priority | Ranking is plain, tested rules. She should always be able to see *why* someone is on her list, and the list must never "hallucinate". |
| Real-time sync, native app | One user, light volume. A web app saved to her home screen is enough. |

## Assumptions vs. what she said

| She said | I assumed |
|---|---|
| "Has not heard from us in two days" | 2 days without contact = gone quiet. One `config` value (`STALE_DAYS`). |
| 15–20 new jobs a week | Small enough to load all open jobs into memory and rank them in code. |
| (Location not mentioned) | Central time (`BUSINESS_TZ=America/Chicago`). "Today" is computed in her timezone, not the server's UTC. |
| Repeat customers text her | Phone number is the customer's identity. All numbers are normalized to E.164 (US default). |
| "I do not need anything fancy" | No settings screens, no custom fields, no tags. |
| (Not discussed) | Sending a quote counts as contact. A job she has scheduled a visit for doesn't show as "gone quiet" before the visit. After the visit date, it asks "mark done?". |

## How the Today ranking works

`lib/today.ts` is a pure function, `getTodayList(jobs, now, config)`, with no database, no AI and no clock of its own. Only open jobs (not Done or Lost) are considered. Each job appears **once**, in the **first** group it matches:

1. **Emergencies**: urgency = emergency and stage is New or Waiting on quote. *"Emergency · by call 40 min ago"*
2. **New, not called yet**: stage New and nobody has contacted them. *"New · via web form 2h ago"*
3. **Follow-ups due**: the follow-up date is today or earlier. A message from a customer on an open job also lands here. *"Follow-up due today"* / *"They messaged 10 min ago"*
4. **Waiting on their yes 2+ days**: quote sent 2+ days ago, sorted by quote amount (biggest money first). *"No reply in 3 days"*
5. **Said yes, needs scheduling**. *"Said yes · needs a date"*
6. **Quotes you owe**. *"Asked yesterday"*
7. **Gone quiet**: no contact for 2+ days in any open stage, unless she has set a future follow-up date or a visit is booked. *"No contact in 4 days"*

After 3 unanswered attempts the card asks **"Mark as lost?"**. It never marks anything lost by itself. All thresholds live in `lib/config.ts`. The header ("6 people to call today · 1 quote to write") and the sidebar badge come from the same count.

## Where AI is used, and where it deliberately isn't

**Used for exactly one thing: turning messy text into fields** (`lib/extract.ts`). Claude Haiku 4.5 reads a pasted text, email, form or voicemail transcript and returns name, business, phone, email, address, a short problem line, equipment, urgency, and whether it's a job request at all (spam and invoices are filtered out). It uses structured outputs with a JSON schema at temperature 0, and the result is validated with zod.

- If there's no API key, or the call errors, times out or returns something invalid, the **rule-based extractor** (`lib/extract-rules.ts`: regexes and keyword lists) takes over. **A lead is never dropped because a model call failed.**
- On the "+" screen the AI only fills a **preview**. Denise confirms before anything is saved.

**Not used for:** ranking, deduplication, phone normalization, stage rules, numbers. Those are plain code: free, instant, predictable and unit-tested.

## Intake architecture

```
 INTAKE (4 doors, 1 pipeline)
 Web form    ── POST /api/inbound/webform ─┐
 Email       ── POST /api/inbound/email ───┤    intake(raw, source):
 SMS*        ── POST /api/inbound/sms ─────┼──▶   1 extract fields (Claude, or rules as fallback)
 Missed call*── POST /api/inbound/call ────┤      2 not a job request (spam/invoice)? → log it, stop
 Denise "+"  ── /api/extract → confirm → save ┘   3 normalize phone (E.164, default US)
                                                  4 find customer by phone, then email
 * Phase 2: Twilio. In the demo, /demo posts      5 open job for them? → add the message to that job
   realistic payloads to these same routes.         (unless it's a new emergency) and put it on Today
                                                    else → new job (stage = new, auto_added = true)
                                                  6 emergency? → alert email now
                                       │
                       Postgres: customers · jobs · activities · inbound_log
                                       │
        Today = getTodayList(jobs, now, config)   Daily cron → morning email   Numbers (plain counts)
        (pure function, unit tested, no AI)       (vercel.json)
```

- Email, SMS and call webhooks require `?token=INBOUND_TOKEN`. The public web form uses a honeypot field instead.
- SMS and call routes accept Twilio's form-encoded payloads (`From`, `Body`, `TranscriptionText`) and plain JSON. The email route takes `{ from, subject, text }`, which works with any inbound-email service or a Zapier/Make forward.
- The sender's number from SMS and calls always overrides whatever extraction guessed.

## Running cost

| | Now | With texting (phase 2) |
|---|---|---|
| Hosting (Vercel) | $0 (Hobby) – $20 (Pro, for commercial use) | same |
| Database (Neon free tier) | $0 | $0 |
| Claude Haiku 4.5 (~80 messages/month × ~1.5k tokens) | well under $1 | well under $1 |
| Email (Resend free tier, 3,000/month) | $0 | $0 |
| Twilio number + SMS + A2P registration | — | roughly $2–5/month |
| **Total** | **~$0–21/month** | **~$5–26/month** |

For comparison, field-service suites (Jobber, Housecall Pro, ServiceTitan) run roughly **$50–300+/month**. They're built around scheduling and invoicing, which is exactly the part she said she doesn't need yet.

## Rollout plan

1. **Weeks 1–2: alongside the notebook.** Denise adds jobs with "+" (paste or dictate) and opens Today each morning. The notebook stays as a safety net. Check in at the end of week 1: is anything on the list that shouldn't be, or missing?
2. **Week 3: auto-forward the website form emails** to `/api/inbound/email`, so web leads appear without her touching them.
3. **Week 4+: a Twilio number** forwarding to her cell. Missed calls and voicemails become leads automatically, and texts to that number land on the right job. (Needs A2P 10DLC registration, which takes about a week.)
4. Turn on the 7am morning email once she trusts the list.

## Next steps

- Twilio number for missed calls and texts (the webhooks are already shaped for it).
- "Snooze until…" quick actions on Today cards (tomorrow, Monday).
- A share link so her husband gets a read-only Numbers page.
- Weekly "jobs you lost and why" note, using the lost reasons she already records.
- If she wants it later: the "who's closest" tech view she mentioned.

## Questions I'd ask Denise

1. Which timezone are you in, and what time do you start your day? (That sets "today" and the morning email.)
2. Is 2 days right for "gone quiet", or does it differ for quotes vs. new requests?
3. Who else should see this: your husband, or a tech who takes calls when you can't?
4. When an emergency comes in after hours, do you want a text alert, or is email enough?
5. Do you write quotes in something today (Word, QuickBooks)? Should the quote amount come from there?
6. Is the office line a cell you'd forward to a new number, or should it stay exactly as is?

## How we'll know it's working

- **Zero uncontacted leads at the end of each day.** No card left in "New, not called yet" overnight.
- **Time to first contact**: from the request arriving to the first logged call or text. Goal: same business day, under 1 hour for emergencies.
- **Quote → yes rate**, and how many quotes go 2+ days without a nudge (target: none).
- **Daily opens**: does she open Today every morning? That's the whole bet.

---

## Running it locally

Requires Node 22+.

```bash
npm install
npm run dev            # http://localhost:3000 — the database is created and seeded on first run
```

No accounts or keys are needed. Data lives in an embedded Postgres (PGlite) in `./.pglite`.

| Command | What it does |
|---|---|
| `npm run dev` | Start the app |
| `npm test` | Unit and integration tests (Vitest, in-memory Postgres) |
| `npm run lint` | ESLint |
| `npm run seed` | Reset to demo data (stop `npm run dev` first when using PGlite) |
| `npm run db:generate` | Generate a migration after editing `db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` (Neon). Runs automatically on `npm run build` |

**Try it:** open **/demo** and press *Simulate customer text*. FreshMart's reply to their quote lands on their existing job and jumps onto Today as "They messaged just now". *Simulate missed call* creates an emergency and prints the alert email in the server console. **/contact** is a stand-in for her website's form, and **/digest** previews the morning email.

### Environment variables

All optional. See [`.env.example`](.env.example).

| Variable | Effect when set |
|---|---|
| `DATABASE_URL` | Use Neon Postgres instead of PGlite |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Claude extraction (default `claude-haiku-4-5`) instead of rules |
| `RESEND_API_KEY`, `ALERT_EMAIL_TO`, `ALERT_EMAIL_FROM`, `APP_URL` | Really send emergency alerts and the morning email |
| `APP_PASSCODE` | Require a shared passcode (httpOnly cookie, 90 days). Log out from the sidebar or page footer |
| `SHOW_PASSCODE` | `true` prefills and shows the passcode on the login page (public demo only) |
| `INBOUND_TOKEN` | Require `?token=` on the email, SMS and call webhooks |
| `CRON_SECRET` | Protect `/api/cron/digest` (Vercel Cron sends it automatically) |
| `BUSINESS_TZ`, `OWNER_NAME`, `BUSINESS_NAME` | Localize to the customer |

### Deploying (Vercel + Neon)

1. Create a Neon database and copy its connection string.
2. Import the repo in Vercel. Set `DATABASE_URL`, `APP_PASSCODE`, `INBOUND_TOKEN`, `CRON_SECRET`, plus `ANTHROPIC_API_KEY` and the Resend variables if wanted.
3. Deploy. The build runs migrations. Load demo data once with `DATABASE_URL=… npm run seed`.
4. The cron in `vercel.json` sends the morning email daily at 12:00 UTC (7am Central in summer, 6am in winter).

Without a `DATABASE_URL`, a Vercel deploy still works as a throwaway demo. It uses PGlite in `/tmp`, which resets on cold start.

### Tests

- `lib/today.test.ts`: every Today group, ordering, one-group-only, future follow-up suppressing "gone quiet", booked visits, the "Mark as lost?" suggestion, config thresholds, and the timezone end-of-day edge (23:50 Chicago is still "today" when UTC has rolled over).
- `lib/jobs.test.ts`: logging contact and stage changes against a real (in-memory) Postgres.
- `lib/intake.test.ts`: new lead, repeat-customer text attaching to an open job, new emergency splitting off, spam ignored, missed call with no voicemail.
- `lib/extract.test.ts`: rule-based extraction on a messy SMS, a forwarded web-form email, a terse notebook note, a spam email and webhook text. The same fixtures run against Claude when `ANTHROPIC_API_KEY` is set.
- `lib/phone.test.ts`, `lib/numbers.test.ts`.

### Project layout

```
app/(app)/          Today, All jobs, Job detail, Add job, Numbers, /demo, /digest (behind the passcode)
app/contact         public sample contact form
app/api/inbound/*   the four intake webhooks
app/api/extract     text → fields for the "+" screen
app/api/cron/digest daily morning email
app/actions.ts      server actions (thin wrappers around lib/)
lib/today.ts        the Today ranking (pure, tested)
lib/intake.ts       the one intake pipeline
lib/extract*.ts     Claude extraction + rule-based fallback
lib/jobs.ts         every job state change (contact logging, stage moves)
db/schema.ts        customers · jobs · activities · inbound_log
```

## How I used Claude Code

- **Understanding the problem first.** I gave Claude Code the call transcript, a design export and a written brief (`CLAUDE.md`). We agreed on the one-sentence product and the out-of-scope list before any code.
- **Building in milestones**, each one runnable and committed: scaffold and schema → Today rules and tests → job detail → extraction → intake webhooks → board and numbers → passcode, alerts and digest → docs. After each one it ran lint and tests and checked the app.
- **Tests before screens for the risky parts.** The Today rules, the timezone edge case and the intake dedupe logic were written with tests that run against an in-memory Postgres. That caught real bugs: "not urgent yet" being flagged as an emergency, phone numbers leaking into problem summaries, and leads stuck in "New" after a call.
- **Checking it like a user.** Claude Code drove headless Chrome at phone width through the real flows (log a call, paste a message, repeat-customer match, simulated text, schedule a visit) and screenshotted every screen against the design in light and dark mode.
- **Judgment stayed mine.** Claude suggested options. I chose to keep AI out of ranking, to attach repeat-customer texts to open jobs instead of duplicating them, and to leave texting customers out of v1.
