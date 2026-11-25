"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * En escritorio los filtros se ven siempre; en móvil empiezan plegados para que
 * los resultados no queden enterrados (si hay filtros activos, se abren).
 */
export function CollapsibleFilters({ title, activeCount, children }: { title: string; activeCount: number; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 980px)").matches;
    if (ref.current && mobile && activeCount === 0) ref.current.open = false;
  }, [activeCount]);
  return (
    <details ref={ref} open className="filter-details">
      <summary className="text-[13.5px] font-extrabold">
        <span>
          {title}
          {activeCount ? <span className="ml-2 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] text-gold-deep">{activeCount}</span> : null}
        </span>
        <span className="chev" aria-hidden>▾</span>
      </summary>
      {children}
    </details>
  );
}
