import { attackLayout, defenseLayout } from "@/lib/profile/options";

type Mode = "attack" | "defense";
export type PitchMarkerProps = {
  pos: string;
  x: number;
  y: number;
  ly: number;
  label: string;
  state: "primary" | "secondary" | null;
};

export const layoutFor = (mode: Mode) => (mode === "attack" ? attackLayout : defenseLayout);

/** Dibujo de media pista del prototipo; la portería arriba (ataque) o abajo (defensa). */
export function Pitch({
  mode,
  title,
  children,
  className = "",
}: {
  mode: Mode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const goalTop = mode === "attack";
  const gid = `pitch-grad-${mode}`;
  return (
    <svg viewBox="0 0 340 210" className={`pitch-svg ${className}`} role="group" aria-label={title}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="210" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1c2842" />
          <stop offset="1" stopColor="#111a2c" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="340" height="210" rx="16" fill={`url(#${gid})`} />
      <rect x="14" y="14" width="312" height="182" rx="6" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1.5" />
      {goalTop ? (
        <>
          <rect x="152" y="9" width="36" height="10" rx="1.5" fill="#fff" opacity=".85" />
          <path d="M115,14 A55,55 0 0 0 225,14" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
          <path d="M75,14 A95,95 0 0 0 265,14" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
        </>
      ) : (
        <>
          <rect x="152" y="191" width="36" height="10" rx="1.5" fill="#fff" opacity=".85" />
          <path d="M115,196 A55,55 0 0 1 225,196" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
          <path d="M75,196 A95,95 0 0 1 265,196" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
        </>
      )}
      {children}
    </svg>
  );
}

export function MarkerShape({ x, y, ly, label }: Pick<PitchMarkerProps, "x" | "y" | "ly" | "label">) {
  return (
    <>
      <circle className="pm-halo" cx={x} cy={y} r="15" />
      <circle className="pm-dot" cx={x} cy={y} r="9" />
      <text className="pm-label" x={x} y={ly} textAnchor="middle">
        {label}
      </text>
    </>
  );
}

/** Vista de sólo lectura (perfil público). */
export function PositionPitchView({
  mode,
  title,
  primary,
  secondary,
  labels,
}: {
  mode: Mode;
  title: string;
  primary: string | null;
  secondary: string | null;
  labels: Record<string, string>;
}) {
  return (
    <Pitch mode={mode} title={title}>
      {layoutFor(mode).map((m) => (
        <g key={m.pos} className={m.pos === primary ? "is-primary" : m.pos === secondary ? "is-secondary" : ""}>
          <MarkerShape x={m.x} y={m.y} ly={m.ly} label={labels[m.pos] ?? m.pos} />
        </g>
      ))}
    </Pitch>
  );
}
