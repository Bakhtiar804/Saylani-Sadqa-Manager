import Image from "next/image";
import artwork from "@/public/images/charity-box-route-report.png";

export function HeroArt() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 sm:h-32 xl:inset-0 xl:h-auto">
      <Image
        src={artwork}
        alt=""
        fill
        sizes="100vw"
        className="object-contain object-bottom mask-[linear-gradient(transparent,black_35%)] xl:object-fill xl:mask-[linear-gradient(to_right,black_14%,transparent_26%,transparent_74%,black_86%)]"
      />
    </div>
  );
}
