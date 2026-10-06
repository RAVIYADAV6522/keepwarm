// Shown the instant a link is tapped (it's prefetched), while the server fetches the page's data.
export default function Loading() {
  return (
    <div className="flex flex-col gap-7" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-3">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-10 w-72 max-w-full" />
      </div>
      <div className="skeleton h-[74px] w-full rounded-[18px]" />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card flex flex-col gap-3 p-4">
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-4 w-5/6" />
            <div className="mt-1 flex gap-2">
              <div className="skeleton h-12 flex-1 rounded-xl" />
              <div className="skeleton h-12 flex-1 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
