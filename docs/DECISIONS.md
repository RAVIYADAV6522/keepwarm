# Design notes

Why KeepWarm is built the way it is: the problem it targets, the decisions behind it, and what would come next.

## The problem

The first customer runs a commercial refrigeration repair company (walk-in coolers, freezers, ice machines) with four field technicians, serving restaurants, grocery stores and warehouses. In her words:

> "Last week a restaurant called on a Friday, freezer down, and I forgot to follow up because I was slammed, and by Monday they had called someone else. That is a two thousand dollar job gone."

> "Even the ones I do catch, I lose track of where they are. Did I send the quote? Did they say yes? Is tech scheduled?"

> "My husband keeps asking me for numbers and I cannot even tell him how many open jobs we have."

> "I just want to wake up and know who I need to call today… I do not need anything fancy."

**The underlying issue.** She is not short of leads (15–20 new requests a week, plus repeat work), and she does not need help running her field team. Money is lost in the gap between *a request arriving* and *someone calling back*. Requests are spread across her cell, a website form inbox, texts, a paper notebook and memory, and nothing tells her when a lead is going cold. Closing that gap is the whole product.

## How each feature maps to a need

| Need | Feature |
|---|---|
| "Know who I need to call today" | **Today**: one ranked list, each card showing why it is there, with one-tap Call and Text |
| "Has not heard from us in two days" | Open jobs with no contact for 2 days return to Today automatically |
| "Waiting on quote, waiting on their yes, scheduled, done. That is it." | Six stages in her own words, one tap to move |
| "Did I send the quote? Did they say yes?" | Two-tap contact logging, opened automatically after a call or text |
| "Call me next week" requests that would otherwise nag daily | Snooze until a chosen day; a message from the customer ends it early |
| Following up takes time she does not have | Ready-to-send texts for each stage, sent from her own phone |
| Requests arrive in five places | One intake pipeline behind the web form, email, SMS and missed-call webhooks, plus quick add |
| She thinks in customers, not jobs | Customer profiles with history, money earned and a pinned note shown on every job |
| Many requests are repeat customers | Customers matched by phone number; replies attach to the open job instead of duplicating it |
| The lost Friday freezer job | Emergency alert the moment a "freezer down" request arrives |
| "If I had that list every morning" | Daily morning email with the same list |
| "My husband keeps asking me for numbers" | **Numbers**: open jobs, money waiting on a yes, won and lost this month, leads by source, and a read-only link she can text him |
| She works from her phone in the field | Mobile-first layout with large tap targets |

## Key decisions

**Ranking is plain rules, not AI.** The Today list is a pure, tested function with seven explicit groups. She should always be able to see *why* someone is on her list, the result must be the same every time, and it costs nothing to run. A single blended score would be harder to trust and harder to explain.

**AI is used only to turn messy text into fields.** Texts, emails and voicemail transcripts are unstructured, which is where a language model genuinely helps. The output is schema-validated, and any failure falls back to a rule-based extractor, so a lead is never dropped because a model call failed. Manual entries are always shown for review before saving.

**One intake pipeline for every channel.** Each channel is a thin webhook that calls the same `intake()` function. Adding a new channel later (for example a Twilio number) does not touch the ranking or the data model.

**The phone number is the customer's identity.** Repeat customers mostly text or call, so numbers are normalized to E.164 and used to match customers. Email is the fallback.

**Call and Text open her own phone apps.** Customers keep seeing her number, and there is no carrier registration (A2P 10DLC) or risk of automated texts reaching restaurant owners.

**A shared passcode instead of accounts.** Two people use it. Accounts and roles would add setup without solving anything she raised.

**A web app, not a native app.** Saved to the home screen it behaves like an app, deploys instantly, and needs no app store.

What was deliberately left out, and why, is listed under [Scope](../README.md#scope) in the README.

## Assumptions

| What she said | Assumption |
|---|---|
| "Has not heard from us in two days" | 2 days without contact means a job has gone quiet. One setting (`STALE_DAYS`) |
| 15–20 new jobs a week | Small enough to load all open jobs and rank them in code |
| Location not mentioned | Central time (`BUSINESS_TZ`); "today" is calculated in her timezone, not the server's |
| "I do not need anything fancy" | No settings screens, custom fields or tags |
| Not discussed | Sending a quote counts as contact. A job with a booked visit does not go "quiet" before the visit date |

## Running cost

| | Today | With a Twilio number |
|---|---|---|
| Hosting (Vercel) | $0–20/month | same |
| Database (Neon free tier) | $0 | $0 |
| Claude Haiku (~80 messages/month) | under $1 | under $1 |
| Email (Resend free tier) | $0 | $0 |
| Twilio number and SMS | — | about $2–5/month |
| **Total** | **about $0–21/month** | **about $5–26/month** |

General field-service suites typically cost $50–300+ per month and are built around scheduling and invoicing, the parts she said she does not need yet.

## Rollout plan

1. **Weeks 1–2:** use it alongside the notebook. New requests are added with quick add, and Today is opened each morning. Check in after week 1: is anything missing from the list, or on it that shouldn't be?
2. **Week 3:** forward website-form emails to the email webhook, so web leads arrive on their own.
3. **Week 4+:** a Twilio number forwarding to her cell, so missed calls, voicemails and texts become leads automatically.
4. Turn on the morning email once she trusts the list.

## Open questions for the customer

1. Which timezone are you in, and when does your day start? (Sets "today" and the morning email time.)
2. Is 2 days right for "gone quiet", or should quotes and new requests differ?
3. Who else should see this: your husband, or a tech who answers calls when you can't?
4. For an after-hours emergency, is an email alert enough, or do you want a text?
5. Where do you write quotes today? Should the amount come from there?
6. Can the office line be forwarded through a new number, or must it stay exactly as it is?

## How success is measured

- **No uncontacted leads at the end of the day.** Nothing left in "New, not called yet" overnight.
- **Time to first contact.** Same business day for every request; under an hour for emergencies.
- **Quote follow-up.** Quote-to-yes rate, and no quote left more than 2 days without a nudge.
- **Daily use.** Today is opened every morning. That habit is the whole bet.
