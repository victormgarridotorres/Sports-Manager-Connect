import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import type { MoveRow } from "@/lib/move/queries";
import { ageFromBirthYear, countryFlag } from "@/lib/profile/display";
import { Avatar } from "../profile/avatar";
import { FavoriteButton } from "./favorite-button";

/** Fila de resultado de Move / Favoritos (prototipo: .tm-row). */
export function MoveCard({
  row,
  locale,
  dict,
  canFollow,
  now,
}: {
  row: MoveRow;
  locale: Locale;
  dict: Messages;
  canFollow: boolean;
  now: Date;
}) {
  const o = dict.options;
  const m = dict.move;
  const pp = dict.publicProfile;

  let headline: string | null = null;
  let sub: (string | null | undefined)[] = [];
  const stats: { value: string; label: string }[] = [];

  if (row.role === "player") {
    headline = row.position ? o.positions[row.position] : null;
    sub = [
      row.defense_position && `${m.defenseShort}: ${o.defenseShort[row.defense_position]}`,
      row.current_club ?? m.noClub,
      row.availability && o.availability[row.availability],
    ];
    const age = ageFromBirthYear(row.birth_year, now);
    if (age) stats.push({ value: String(age), label: pp.years });
    if (row.height_cm) stats.push({ value: (row.height_cm / 100).toLocaleString(locale, { minimumFractionDigits: 2 }), label: pp.height });
    if (row.weight_kg) stats.push({ value: `${row.weight_kg} kg`, label: pp.weight });
    if (row.dominant_hand) stats.push({ value: o.hands[row.dominant_hand], label: pp.hand });
  } else if (row.role === "professional") {
    headline = row.professional_type ? o.professionalTypes[row.professional_type] : dict.roles.professional.name;
    sub = [row.current_entity, row.availability && o.availability[row.availability]];
    if (row.years_experience != null) stats.push({ value: format(pp.yearsCount, { n: row.years_experience }), label: pp.experience });
  } else if (row.role === "club") {
    headline = dict.roles.club.name;
    sub = [row.club_league, row.city, row.founded_year ? format(pp.foundedIn, { year: row.founded_year }) : null];
    if (row.roster_count) stats.push({ value: String(row.roster_count), label: pp.players });
  } else {
    headline = dict.roles.fan.name;
    sub = [row.city];
  }

  return (
    <article className="tm-row">
      <Avatar path={row.avatar_path} name={row.display_name} size={52} className="rounded-full" />
      <div className="tm-row-id">
        <span className="row-name">
          <Link href={`/${locale}/p/${row.id}`} className="truncate">
            {row.display_name}
          </Link>
          {row.country ? <span aria-hidden>{countryFlag(row.country)}</span> : null}
          {row.verification_status === "verified" ? (
            <span className="text-[11px] text-gold-deep" title={pp.verified} aria-label={pp.verified}>
              ✓
            </span>
          ) : null}
        </span>
        {headline ? <span className="row-pos">{headline}</span> : null}
        <span className="row-sub">{sub.filter(Boolean).join(" · ")}</span>
      </div>
      {stats.length ? (
        <div className="tm-row-stats">
          {stats.map((s) => (
            <div key={s.label} className="stat-item">
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="tm-row-signal">{row.followers > 0 ? format(m.followers, { n: row.followers }) : ""}</div>
      {canFollow ? (
        <FavoriteButton
          profileId={row.id}
          initial={row.is_favorite}
          labels={{ follow: m.follow, following: m.following, error: dict.auth.errors.generic }}
        />
      ) : null}
      <span className="tm-row-go" aria-hidden>
        →
      </span>
    </article>
  );
}
