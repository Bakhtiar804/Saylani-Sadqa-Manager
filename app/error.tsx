'use client';

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return <section role="alert" className="mx-auto my-12 max-w-lg rounded-2xl border border-[#e3ebe0] bg-white p-8 text-center shadow-sm">
    <div aria-hidden="true" className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-amber-50 text-2xl text-amber-700">!</div>
    <h1 className="text-xl font-bold text-[#203526]">Unable to load this page</h1>
    <p className="my-3 text-sm text-[#657568]">Check your connection and try again. Your saved records are safe.</p>
    <button onClick={() => retry()} className="rounded-xl bg-[#276431] px-5 py-3 text-sm font-semibold text-white">Try again</button>
  </section>;
}
