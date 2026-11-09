import type { ReactNode } from "react";

type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export default function PageHeading({ eyebrow, title, description, actions }: PageHeadingProps) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><span hidden aria-hidden="true" data-dashboard-ready="true"/><div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-[#4f8a47]">{eyebrow || "SAYLANI SADQA MANAGER"}</p><h1 className="text-[clamp(28px,3vw,38px)] font-bold tracking-[-1px] text-[#192d21]">{title}</h1><p className="mt-2 max-w-3xl text-[15px] leading-6 text-[#617265]">{description}</p></div>{actions}</div>;
}
