import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";

export function Brand({ locale, title }: { locale: Locale; title: string }) {
  return (
    <Link href={`/${locale}`} className="flex flex-none items-center gap-2.5 whitespace-nowrap text-white" aria-label={title}>
      <Image src="/brand/logo.png" alt="" width={38} height={38} priority className="size-[38px] object-contain" />
      <span className="flex flex-col leading-none" aria-hidden>
        <span className="font-display text-[13.5px] font-extrabold tracking-[.02em]">SPORTS MANAGER</span>
        <span className="mt-0.5 font-display text-[10.5px] font-bold tracking-[.16em] text-gold">CONNECT</span>
      </span>
    </Link>
  );
}
