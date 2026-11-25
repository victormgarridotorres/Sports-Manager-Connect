"use client";

import { startTransition, useOptimistic, useState } from "react";
import { setFavorite } from "@/lib/move/actions";

/**
 * Estrella de favorito (o botón "Seguir / Siguiendo" en el perfil). Cambia al
 * instante y vuelve atrás si el servidor lo rechaza.
 */
export function FavoriteButton({
  profileId,
  initial,
  variant = "star",
  labels,
}: {
  profileId: string;
  initial: boolean;
  variant?: "star" | "button";
  labels: { follow: string; following: string; error: string };
}) {
  const [saved, setSaved] = useState(initial);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [failed, setFailed] = useState(false);

  function toggle() {
    const next = !optimistic;
    setFailed(false);
    startTransition(async () => {
      setOptimistic(next);
      const res = await setFavorite(profileId, next);
      if (res.ok) setSaved(next);
      else setFailed(true);
    });
  }

  const label = optimistic ? labels.following : labels.follow;
  if (variant === "button") {
    return (
      <span className="flex flex-col items-start gap-1">
        <button type="button" onClick={toggle} aria-pressed={optimistic} className={`btn ${optimistic ? "btn-gold" : "btn-ghost"}`}>
          <span aria-hidden>{optimistic ? "★" : "☆"}</span> {label}
        </button>
        {failed ? <span role="alert" className="text-[12px] text-[#f3b0a6]">{labels.error}</span> : null}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={optimistic}
      aria-label={failed ? labels.error : label}
      title={failed ? labels.error : label}
      className={`fav-star ${optimistic ? "is-fav" : ""}`}
    >
      {optimistic ? "★" : "☆"}
    </button>
  );
}
