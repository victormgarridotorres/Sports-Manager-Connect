"use client";

import { startTransition, useOptimistic, useState } from "react";
import { setListingSaved } from "@/lib/listings/actions";

export function SaveListingButton({ listingId, initial, labels }: { listingId: string; initial: boolean; labels: { save: string; saved: string; error: string } }) {
  const [saved, setSaved] = useState(initial);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex flex-col items-start gap-1">
      <button
        type="button"
        aria-pressed={optimistic}
        className={`btn ${optimistic ? "btn-gold" : "btn-ghost"}`}
        onClick={() => {
          const next = !optimistic;
          setFailed(false);
          startTransition(async () => {
            setOptimistic(next);
            const res = await setListingSaved(listingId, next);
            if (res.ok) setSaved(next);
            else setFailed(true);
          });
        }}
      >
        <span aria-hidden>{optimistic ? "🔖" : "＋"}</span> {optimistic ? labels.saved : labels.save}
      </button>
      {failed ? <span role="alert" className="text-[12px] text-[#f3b0a6]">{labels.error}</span> : null}
    </span>
  );
}
