import { LogoMark } from "@/components/Nav";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · KeepWarm" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  // Public demo only: prefill and show the passcode so reviewers can walk straight in.
  const demoPasscode = process.env.SHOW_PASSCODE === "true" ? process.env.APP_PASSCODE : undefined;
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center gap-6 px-5">
      {/* Soft brass glow behind the card. */}
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent opacity-[0.12] blur-[90px]" />
      <div className="flex flex-col gap-1">
        <LogoMark size={48} />
        <div className="mt-3 font-serif text-[40px] leading-none">KeepWarm</div>
        <div className="text-ink2">Keep every lead warm.</div>
      </div>
      <LoginForm next={typeof next === "string" ? next : "/"} demoPasscode={demoPasscode} />
    </div>
  );
}
