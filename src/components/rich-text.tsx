import Link from "next/link";
import { Fragment } from "react";

/**
 * Pinta los fragmentos *entre asteriscos* resaltados en dorado, como los
 * <em> del prototipo ("El ecosistema global del *balonmano*…").
 * Con `links`, el fragmento resaltado n.º i se convierte en enlace a links[i]
 * (se abre en otra pestaña para no perder lo escrito en un formulario).
 */
export function Rich({ text, links }: { text: string; links?: string[] }) {
  const parts = text.split(/\*([^*]+)\*/g);
  let n = 0;
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const href = links?.[n++];
        return href ? (
          <Link key={i} href={href} target="_blank" className="hl underline-offset-2 hover:underline">
            {part}
          </Link>
        ) : (
          <em key={i} className="hl">
            {part}
          </em>
        );
      })}
    </>
  );
}
