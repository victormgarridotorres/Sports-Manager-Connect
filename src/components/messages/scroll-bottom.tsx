"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Contenedor de burbujas que se queda abajo al llegar mensajes nuevos. */
export function ScrollBottom({ children, count }: { children: ReactNode; count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [count]);
  return (
    <div ref={ref} className="msg-bubbles" aria-live="polite">
      {children}
    </div>
  );
}
