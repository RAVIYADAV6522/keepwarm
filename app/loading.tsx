import { LoadingState } from "@/components/LoadingState";

// Shown the instant a link is tapped (it's prefetched), while the server fetches the page's data.
export default function Loading() {
  return <LoadingState />;
}
