"use client";

import { useState } from "react";
import { layoutFor, MarkerShape, Pitch } from "./position-pitch";

/**
 * Selector del prototipo: el primer toque marca la posición principal, el
 * segundo una secundaria; tocar una marcada la desmarca. Envía dos inputs ocultos.
 */
export function PositionPicker({
  mode,
  title,
  caption,
  name,
  secondaryName,
  initialPrimary,
  initialSecondary,
  labels,
  fullLabels,
  legend,
}: {
  mode: "attack" | "defense";
  title: string;
  caption: string;
  name: string;
  secondaryName: string;
  initialPrimary: string | null;
  initialSecondary: string | null;
  labels: Record<string, string>;
  fullLabels: Record<string, string>;
  legend: { primary: string; secondary: string };
}) {
  const [primary, setPrimary] = useState(initialPrimary);
  const [secondary, setSecondary] = useState(initialPrimary ? initialSecondary : null);

  function toggle(pos: string) {
    if (pos === primary) {
      setPrimary(secondary);
      setSecondary(null);
    } else if (pos === secondary) {
      setSecondary(null);
    } else if (!primary) {
      setPrimary(pos);
    } else {
      setSecondary(pos);
    }
  }

  return (
    <div>
      <p className="form-section-title !mb-1">{title}</p>
      <p className="mb-3 text-[12.5px] text-muted">{caption}</p>
      <input type="hidden" name={name} value={primary ?? ""} />
      <input type="hidden" name={secondaryName} value={secondary ?? ""} />
      <Pitch mode={mode} title={title} className="picker">
        {layoutFor(mode).map((m) => {
          const state = m.pos === primary ? "primary" : m.pos === secondary ? "secondary" : null;
          return (
            <g
              key={m.pos}
              className={`pos-marker ${state ? `is-${state}` : ""}`}
              role="checkbox"
              tabIndex={0}
              aria-checked={!!state}
              aria-label={`${fullLabels[m.pos] ?? m.pos}${state ? ` (${legend[state]})` : ""}`}
              onClick={() => toggle(m.pos)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(m.pos);
                }
              }}
            >
              <MarkerShape x={m.x} y={m.y} ly={m.ly} label={labels[m.pos] ?? m.pos} />
            </g>
          );
        })}
      </Pitch>
      <p className="mt-2 flex flex-wrap gap-3 text-[12px] text-muted" aria-live="polite">
        <span>
          <span aria-hidden className="mr-1 inline-block size-2.5 rounded-full bg-gold" />
          {legend.primary}: <b className="text-ink">{primary ? fullLabels[primary] : "—"}</b>
        </span>
        <span>
          <span aria-hidden className="mr-1 inline-block size-2.5 rounded-full border-2 border-gold" />
          {legend.secondary}: <b className="text-ink">{secondary ? fullLabels[secondary] : "—"}</b>
        </span>
      </p>
    </div>
  );
}
