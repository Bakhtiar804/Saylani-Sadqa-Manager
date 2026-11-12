import Link from 'next/link';
export default function NotFound() {
  return <main className="grid min-h-[60vh] place-items-center p-8"><div className="text-center"><p className="text-5xl font-bold text-[#276431]">404</p><h1 className="my-4 text-xl font-bold">Page not found</h1><Link href="/" className="inline-block rounded-xl bg-[#276431] px-5 py-3 text-sm font-semibold text-white">Return home</Link></div></main>;
}
