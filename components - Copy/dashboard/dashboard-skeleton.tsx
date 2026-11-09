export default function DashboardSkeleton() {
  return (
    <main aria-label="Loading dashboard" aria-busy="true" className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-3 w-36 rounded bg-[#e5eee2]" />
        <div className="h-9 w-72 max-w-full rounded-lg bg-[#e5eee2]" />
        <div className="h-4 w-full max-w-2xl rounded bg-[#edf3eb]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 rounded-2xl border border-[#e8eee6] bg-white p-5"><div className="h-3 w-24 rounded bg-[#edf3eb]" /><div className="mt-5 h-7 w-32 rounded bg-[#e5eee2]" /><div className="mt-4 h-3 w-40 rounded bg-[#edf3eb]" /></div>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-80 rounded-2xl border border-[#e8eee6] bg-white p-5"><div className="h-5 w-48 rounded bg-[#e5eee2]" /><div className="mt-6 h-60 rounded-xl bg-[#f1f5ef]" /></div>
        <div className="h-80 rounded-2xl border border-[#e8eee6] bg-white p-5"><div className="h-5 w-40 rounded bg-[#e5eee2]" /><div className="mt-6 h-60 rounded-xl bg-[#f1f5ef]" /></div>
      </div>
      <div className="rounded-2xl border border-[#e8eee6] bg-white p-5">
        <div className="h-5 w-56 rounded bg-[#e5eee2]" />
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="mt-5 h-10 rounded-lg bg-[#f1f5ef]" />)}
      </div>
    </main>
  );
}
