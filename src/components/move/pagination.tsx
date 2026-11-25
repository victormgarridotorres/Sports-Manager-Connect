import Link from "next/link";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { PAGE_SIZE, toQuery, type MoveFilters } from "@/lib/move/params";

export function Pagination({ base, filters, total, t }: { base: string; filters: MoveFilters; total: number; t: Messages["move"] }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const page = Math.min(filters.page, pages);
  return (
    <nav className="mt-6 flex items-center justify-center gap-3 text-[13.5px] text-on-dark" aria-label={t.pagination}>
      {page > 1 ? (
        <Link className="btn btn-ghost btn-sm" href={`${base}${toQuery(filters, { page: page - 1 })}`} rel="prev">
          ← {t.prev}
        </Link>
      ) : null}
      <span>{format(t.pageOf, { page, pages })}</span>
      {page < pages ? (
        <Link className="btn btn-ghost btn-sm" href={`${base}${toQuery(filters, { page: page + 1 })}`} rel="next">
          {t.next} →
        </Link>
      ) : null}
    </nav>
  );
}
