import Link from "next/link";
import type { ReactNode } from "react";
import { Rich } from "./rich-text";

type Crumb = { label: string; href?: string };

/** Cabecera de sub-página del prototipo: migas, etiqueta, título y entradilla. */
export function SubHero({
  crumbs,
  eyebrow,
  title,
  lead,
  children,
}: {
  crumbs?: Crumb[];
  eyebrow?: string;
  title?: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <section className="subhero">
      <div className="wrap">
        {crumbs?.length ? (
          <nav className="crumb" aria-label="breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 ? " / " : null}
                {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              </span>
            ))}
          </nav>
        ) : null}
        {eyebrow ? <span className="eyebrow-dark">{eyebrow}</span> : null}
        {title ? (
          <h1>
            <Rich text={title} />
          </h1>
        ) : null}
        {lead ? <p>{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}

export function PageBody({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <section className="page-body">
      <div className={`wrap ${narrow ? "!max-w-[520px]" : ""}`}>{children}</div>
    </section>
  );
}
