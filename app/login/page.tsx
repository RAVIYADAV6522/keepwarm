import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · KeepWarm" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center gap-6 px-5">
      <div className="flex flex-col gap-1">
        <div className="font-serif text-[40px]">KeepWarm</div>
        <div className="text-ink2">Keep every lead warm.</div>
      </div>
      <LoginForm next={typeof next === "string" ? next : "/"} />
    </div>
  );
}
