/** Titular del anuncio con la palabra destacada en dorado (como en el prototipo). */
export function ListingTitle({ title, highlight }: { title: string; highlight: string | null }) {
  return (
    <>
      {title}
      {highlight ? (
        <>
          {" "}
          <em className="hl">{highlight}</em>
        </>
      ) : null}
    </>
  );
}
