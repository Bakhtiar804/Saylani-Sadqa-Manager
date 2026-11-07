import Image from "next/image";
import logo from "@/public/images/saylani_logo.webp";

export function Brand({ className }: { className: string }) {
  return <Image src={logo} alt="Saylani Welfare" className={`h-auto ${className}`} />;
}
