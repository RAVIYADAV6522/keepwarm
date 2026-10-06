import { JobsBoard, type BoardJob } from "@/components/JobsBoard";
import { jobMeta } from "@/lib/job-meta";
import { getAllJobs } from "@/lib/queries";
import { toCardJob } from "@/lib/view";

export default async function JobsPage() {
  const now = new Date();
  const jobs: BoardJob[] = (await getAllJobs()).map((j) => {
    const card = toCardJob(j);
    const [meta, tone] = jobMeta(j, now);
    return { id: j.id, name: card.name, contact: card.contact, phone: j.customer.phone ?? "", problem: j.problem, amount: card.amount, stage: j.stage, source: j.source, meta, tone };
  });
  return <JobsBoard jobs={jobs} />;
}
