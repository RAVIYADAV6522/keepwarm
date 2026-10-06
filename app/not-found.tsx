import { NotFound } from "@/components/NotFound";

export const metadata = { title: "Not found · KeepWarm" };

export default function RootNotFound() {
  return (
    <main className="px-5">
      <NotFound />
    </main>
  );
}
