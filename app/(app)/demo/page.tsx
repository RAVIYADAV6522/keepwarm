import { DemoPanel } from "@/components/DemoPanel";

export default function DemoPage() {
  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-[clamp(30px,3.4vw,36px)]">Demo: leads coming in</h1>
        <p className="text-base leading-relaxed text-pretty text-ink2">
          Jobs reach Denise through four doors. Each button below sends a realistic message to the same webhook a real
          phone number, inbox or website form would use. Watch it get read, matched to a customer, and put on the Today list.
        </p>
      </div>
      <DemoPanel />
    </div>
  );
}
