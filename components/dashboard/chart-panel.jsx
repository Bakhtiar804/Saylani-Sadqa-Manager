export default function ChartPanel({ title, description, children, className = "" }) {
  return <section className={`min-w-0 rounded-2xl border border-[#e3ebe0] bg-white p-5 shadow-[0_3px_14px_rgba(28,52,33,.035)] sm:p-6 ${className}`}><div className="mb-5"><h2 className="text-lg font-bold text-[#203526]">{title}</h2>{description && <p className="mt-1 text-sm text-[#718073]">{description}</p>}</div>{children}</section>;
}
