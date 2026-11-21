import { Fragment } from "react";
import type { Block, Inline } from "@/content/legal";

function Text({ c }: { c: Inline }) {
  return (
    <>
      {c.map((g, i) => {
        let node: React.ReactNode = g.text.split("\n").map((line, j) => (
          <Fragment key={j}>
            {j > 0 ? <br /> : null}
            {line}
          </Fragment>
        ));
        if (g.href) {
          node = (
            <a href={g.href} className="text-link break-all" target="_blank" rel="noopener noreferrer">
              {node}
            </a>
          );
        }
        return g.b ? <strong key={i}>{node}</strong> : <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}

/** Pinta un documento legal guardado como bloques (párrafos, listas, tablas). */
export function LegalDocument({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-3.5 text-[14.5px] leading-relaxed text-ink [&_strong]:font-bold">
      {blocks.map((bl, i) => {
        switch (bl.t) {
          case "h":
            return (
              <h2 key={i} className="mt-4 text-lg font-extrabold">
                <Text c={bl.c} />
              </h2>
            );
          case "p":
            return (
              <p key={i}>
                <Text c={bl.c} />
              </p>
            );
          case "ul":
          case "ol": {
            const List = bl.t;
            return (
              <List key={i} className={`flex flex-col gap-1.5 pl-5 ${bl.t === "ol" ? "list-decimal" : "list-disc"}`}>
                {bl.items.map((it, j) => (
                  <li key={j} style={{ marginLeft: `${it.d * 1.25}rem` }}>
                    <Text c={it.c} />
                  </li>
                ))}
              </List>
            );
          }
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-[10px] border border-line">
                <table className="w-full border-collapse text-left text-[13.5px]">
                  <tbody>
                    {bl.rows.map((row, r) => (
                      <tr key={r} className={r === 0 ? "bg-paper-soft" : "border-t border-line"}>
                        {row.map((cell, k) => {
                          const Cell = r === 0 || cell.h ? "th" : "td";
                          return (
                            <Cell key={k} className="px-3.5 py-2.5 align-top">
                              {cell.c.map((p, m) => (
                                <p key={m} className={m > 0 ? "mt-1.5" : ""}>
                                  <Text c={p} />
                                </p>
                              ))}
                            </Cell>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
