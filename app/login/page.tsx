import { LogoMark } from "@/components/Nav";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · KeepWarm" };

// The front door. Always midnight (whatever the OS theme), with the product previewed on the left.
const EMBERS = [
  { left: "8%", delay: "0s", dur: "9s", size: 3 },
  { left: "18%", delay: "2.5s", dur: "11s", size: 2 },
  { left: "27%", delay: "5s", dur: "8s", size: 4 },
  { left: "39%", delay: "1s", dur: "12s", size: 2 },
  { left: "48%", delay: "6.5s", dur: "10s", size: 3 },
  { left: "57%", delay: "3.5s", dur: "9.5s", size: 2 },
  { left: "66%", delay: "7.5s", dur: "11.5s", size: 3 },
  { left: "74%", delay: "0.8s", dur: "8.5s", size: 2 },
  { left: "83%", delay: "4.2s", dur: "10.5s", size: 4 },
  { left: "92%", delay: "6s", dur: "9s", size: 2 },
];

const PREVIEW = [
  { name: "Tony's Diner", line: "Walk-in freezer down, product at risk", chip: "Emergency · by call 40 min ago", tone: "red", amount: "" },
  { name: "FreshMart Grocery", line: "Reach-in cooler making a loud noise", chip: "No reply in 3 days", tone: "violet", amount: "$1,250" },
  { name: "Bay Cold Storage", line: "Ice machine not making ice", chip: "Said yes · needs a date", tone: "green", amount: "$680" },
] as const;

const CHIP = {
  red: "bg-[#e8838a]/15 text-[#f0a0a6]",
  violet: "bg-[#b8a3ec]/15 text-[#c9b8f2]",
  green: "bg-[#7cc7a3]/15 text-[#93d6b5]",
};

const POINTS = [
  "Calls, texts, emails and your website form in one list",
  "Quotes and quiet leads come back after two days, automatically",
  "Built for the phone in your pocket",
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  // Public demo only: prefill and show the passcode so reviewers can walk straight in.
  const demoPasscode = process.env.SHOW_PASSCODE === "true" ? process.env.APP_PASSCODE : undefined;

  return (
    <div className="login-scene relative isolate min-h-dvh overflow-hidden bg-[#070a12] text-[#eef1f8]">
      {/* Atmosphere: brass glows, a faint grid, embers drifting up. */}
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[#c9a35b] opacity-[0.10] blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -right-32 bottom-[-180px] h-[560px] w-[560px] rounded-full bg-[#b08a45] opacity-[0.12] blur-[130px]" />
      <div aria-hidden className="login-grid pointer-events-none absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {EMBERS.map((e, i) => (
          <span key={i} className="ember" style={{ left: e.left, width: e.size, height: e.size, animationDelay: e.delay, animationDuration: e.dur }} />
        ))}
      </div>

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1180px] grid-cols-1 items-center gap-12 px-5 py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:px-10">
        {/* Story + product preview */}
        <section className="flex min-w-0 flex-col gap-8">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <span className="font-serif text-[26px] tracking-[-0.01em]">KeepWarm</span>
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="font-serif text-[clamp(38px,5.2vw,64px)] leading-[1.02] tracking-[-0.02em]">
              Wake up knowing exactly <span className="login-gold">who to call.</span>
            </h1>
            <p className="max-w-[460px] text-[17px] leading-relaxed text-[#9aa3b8]">
              Every job request in one list, a status for each, and a short morning list of the people who need you today.
            </p>
          </div>
          <ul className="hidden flex-col gap-3 sm:flex">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[15px] text-[#c9cfdc]">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#c9a35b]/15 text-[#dcbb7a]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                </span>
                {p}
              </li>
            ))}
          </ul>

          <div aria-hidden className="login-preview relative hidden h-[400px] lg:block">
            {PREVIEW.map((c, i) => (
              <div
                key={c.name}
                className="login-card absolute w-[360px] rounded-2xl border border-white/10 bg-[#121827]/90 p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur"
                style={{ left: i * 46, top: i * 108, zIndex: i + 1, animationDelay: `${i * 0.6}s` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[15px] font-semibold">{c.name}</div>
                  {c.amount && <div className="text-[14px] font-semibold text-[#eef1f8]">{c.amount}</div>}
                </div>
                <div className="mt-1 text-[13px] text-[#9aa3b8]">{c.line}</div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${CHIP[c.tone]}`}>{c.chip}</span>
                </div>
                {i === PREVIEW.length - 1 && (
                <div className="mt-3 flex gap-2">
                  <span className="flex h-8 flex-1 items-center justify-center rounded-lg bg-gradient-to-b from-[#dcbb7a] to-[#c9a35b] text-[13px] font-semibold text-[#141a2b]">Call</span>
                  <span className="flex h-8 flex-1 items-center justify-center rounded-lg border border-white/10 text-[13px] font-semibold">Text</span>
                </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Sign in */}
        <section className="w-full min-w-0 lg:justify-self-end">
          <div className="login-panel relative mx-auto w-full max-w-[420px] rounded-[26px] p-[1px]">
            <div className="rounded-[25px] bg-[#0e1322]/85 p-7 backdrop-blur-xl sm:p-8">
              <div className="mb-6 flex flex-col gap-1.5">
                <h2 className="font-serif text-[30px] leading-tight">Welcome back</h2>
                <p className="text-[15px] text-[#9aa3b8]">Enter the passcode to open your list.</p>
              </div>
              <LoginForm next={typeof next === "string" ? next : "/"} demoPasscode={demoPasscode} />
            </div>
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 text-[13px] text-[#7f889c]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
              <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
            </svg>
            Private to your business · stays signed in on this device
          </p>
        </section>
      </div>
    </div>
  );
}
