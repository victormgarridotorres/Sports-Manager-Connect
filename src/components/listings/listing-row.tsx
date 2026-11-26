import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { listingAccent } from "@/lib/listings/options";
import type { ListingRow as Row } from "@/lib/listings/queries";
import { isNew, timeAgo } from "@/lib/listings/time";
import { countryFlag, countryName } from "@/lib/profile/display";
import { Avatar } from "../profile/avatar";
import { ListingTitle } from "./listing-title";

/** Fila del tablón (prototipo: .offer-row). */
export function ListingRowCard({ row, locale, dict, now }: { row: Row; locale: Locale; dict: Messages; now: Date }) {
  const l = dict.listings;
  const country = row.country ? `${countryFlag(row.country)} ${countryName(row.country, locale)}` : `🌍 ${l.international}`;
  const expired = new Date(row.expires_at) <= now;
  return (
    <article className="offer-row">
      <Avatar path={row.owner_avatar} name={row.org_name} size={52} className="rounded-[12px]" />
      <div className="offer-row-id">
        <div className="row-top">
          <span className={`offer-type ${listingAccent[row.type]}`}>{l.types[row.type]}</span>
          <h4>
            <Link href={`/${locale}/listings/${row.id}`}>
              <ListingTitle title={row.title} highlight={row.highlight} />
            </Link>
          </h4>
        </div>
        <p className="row-org">
          {[row.org_name, row.league, row.subtitle].filter(Boolean).join(" · ")}
          {row.owner_verified ? <span className="ml-1 text-gold-deep" title={dict.publicProfile.verified}>✓</span> : null}
        </p>
      </div>
      <div className="offer-row-tags">
        {row.position ? <span>{dict.options.positions[row.position]}</span> : null}
        <span>{country}</span>
        {row.status === "closed" || expired ? <span className="status-pill closed">{expired ? l.expired : l.closed}</span> : null}
        {row.my_application ? <span className={`status-pill ${row.my_application}`}>{l.applicationStatus[row.my_application]}</span> : null}
      </div>
      <div className="offer-row-meta">
        {row.applications != null ? (
          <span className="interest">{format(row.applications === 1 ? l.candidatesOne : l.candidates, { n: row.applications })}</span>
        ) : row.interest > 0 ? (
          <span className="interest">🔥 {format(row.interest === 1 ? l.interestedOne : l.interested, { n: row.interest })}</span>
        ) : null}
        <span className="time">
          {timeAgo(row.created_at, locale, now)} {isNew(row.created_at, now) ? <span className="badge-new">{l.new}</span> : null}
        </span>
      </div>
      <span className="offer-row-go" aria-hidden>
        →
      </span>
    </article>
  );
}
