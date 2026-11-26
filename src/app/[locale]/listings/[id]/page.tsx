import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ApplyForm } from "@/components/listings/apply-form";
import { ListingRowCard } from "@/components/listings/listing-row";
import { ListingTitle } from "@/components/listings/listing-title";
import { SaveListingButton } from "@/components/listings/save-listing-button";
import { PageBody, SubHero } from "@/components/page-shell";
import { Avatar } from "@/components/profile/avatar";
import { QueryNotice } from "@/components/query-notice";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { requestNow } from "@/lib/request-time";
import { requireAccount, type Account } from "@/lib/auth/dal";
import { deleteListing, setApplicationStatus, setListingStatus, withdrawApplication } from "@/lib/listings/actions";
import { applicationStatuses, lines, listingAccent } from "@/lib/listings/options";
import { parseListingFilters } from "@/lib/listings/params";
import { getCandidates, getListing, searchListings, type ListingDetail } from "@/lib/listings/queries";
import { daysLeft, timeAgo } from "@/lib/listings/time";
import { countryFlag, countryName } from "@/lib/profile/display";

export default function ListingPage({ params }: PageProps<"/[locale]/listings/[id]">) {
  return (
    <Suspense fallback={<SubHero />}>
      <Listing params={params} />
    </Suspense>
  );
}

async function Listing({ params }: { params: PageProps<"/[locale]/listings/[id]">["params"] }) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const account = await requireAccount(locale, `/${locale}/listings/${id}`);
  const listing = await getListing(id, account.id);
  const l = dict.listings;

  if (!listing) {
    return (
      <>
        <SubHero crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: l.crumb, href: `/${locale}/listings` }]} title={l.unavailableTitle} />
        <PageBody narrow>
          <div className="card-box flex flex-col items-start gap-3 text-[14px] text-muted">
            {l.unavailableBody}
            <Link href={`/${locale}/listings`} className="text-link">← {l.back}</Link>
          </div>
        </PageBody>
      </>
    );
  }
  return <ListingView listing={listing} locale={locale} dict={dict} account={account} />;
}

async function ListingView({ listing, locale, dict, account }: { listing: ListingDetail; locale: Locale; dict: Messages; account: Account }) {
  const l = dict.listings;
  const now = await requestNow();
  const isOwner = listing.owner_id === account.id;
  const expired = new Date(listing.expires_at) <= now;
  const active = listing.status === "active" && !expired;
  const country = listing.country ? `${countryFlag(listing.country)} ${countryName(listing.country, locale)}` : `🌍 ${l.international}`;
  const canApply = !isOwner && listing.type === "club_seeks" && active && account.permissions.includes("offers.apply");
  const [candidates, similar] = await Promise.all([
    isOwner ? getCandidates(listing.id) : Promise.resolve([]),
    searchListings(parseListingFilters({ type: listing.type }), "board", listing.id, 3),
  ]);
  const sub = [listing.org_name, listing.league, listing.subtitle].filter(Boolean).join(" · ");
  const isClub = listing.type === "club_seeks";

  const facts: [string, string][] = [
    [l.facts.published, timeAgo(listing.created_at, locale, now)],
    ...(listing.league ? [[l.facts.league, listing.league] as [string, string]] : []),
    [l.facts.country, country],
    ...(listing.position ? [[l.form.position, dict.options.positions[listing.position]] as [string, string]] : []),
    ...(listing.salary ? [[l.facts.salary, listing.salary] as [string, string]] : []),
    [l.facts.interest, `🔥 ${format(listing.interest === 1 ? l.interestedOne : l.interested, { n: listing.interest })}`],
  ];

  return (
    <>
      <SubHero crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: l.crumb, href: `/${locale}/listings` }, { label: listing.title }]}>
        <span className={`offer-type ${listingAccent[listing.type]} mb-3.5`}>{l.types[listing.type]}</span>
        <h1>
          <ListingTitle title={listing.title} highlight={listing.highlight} />
        </h1>
        {sub ? <p>{sub}</p> : null}
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {isOwner ? (
            <Link href={`/${locale}/listings/${listing.id}/edit`} className="btn btn-gold">{l.edit}</Link>
          ) : (
            <>
              <SaveListingButton listingId={listing.id} initial={listing.is_saved} labels={{ save: l.save, saved: l.saved, error: dict.auth.errors.generic }} />
              {canApply && !listing.my_application ? <a href="#apply" className="btn btn-gold">{l.apply}</a> : null}
            </>
          )}
          {!active ? <span className="status-pill closed">{expired ? l.expired : l.closed}</span> : null}
        </div>
        <div className="profile-quickstats">
          {facts.slice(1, 5).map(([label, value]) => (
            <div key={label} className="qs"><b>{value}</b><span>{label}</span></div>
          ))}
        </div>
      </SubHero>

      <PageBody>
        <div className="mx-auto mb-5 flex max-w-[1180px] flex-col gap-2">
          <QueryNotice param="published" text={l.publishedNotice} />
          <QueryNotice param="saved" text={dict.profile.saved} />
        </div>
        <div className="profile-layout">
          <div className="flex flex-col gap-5">
            {isOwner ? <OwnerPanel listing={listing} locale={locale} dict={dict} now={now} expired={expired} candidates={candidates} /> : null}
            <section className="card-box">
              <h3>{l.sections.about}</h3>
              <p className="text-[14.5px] leading-relaxed whitespace-pre-line">{listing.description}</p>
            </section>
            {lines(listing.requirements).length ? (
              <section className="card-box">
                <h3>{isClub ? l.sections.requirementsClub : l.sections.requirementsOther}</h3>
                <ul className="flex flex-col gap-2 text-[14px]">
                  {lines(listing.requirements).map((x) => <li key={x} className="flex gap-2.5"><span className="font-bold text-ok">✓</span>{x}</li>)}
                </ul>
              </section>
            ) : null}
            {lines(listing.benefits).length ? (
              <section className="card-box">
                <h3>{isClub ? l.sections.benefitsClub : l.sections.benefitsOther}</h3>
                <ul className="flex flex-col gap-2 text-[14px]">
                  {lines(listing.benefits).map((x) => <li key={x} className="flex gap-2.5"><span className="font-bold text-ok">✓</span>{x}</li>)}
                </ul>
              </section>
            ) : null}
            <section className="card-box">
              <h3>{format(l.sections.aboutOrg, { name: listing.org_name })}</h3>
              <div className="flex items-start gap-4">
                <Avatar path={listing.owner_avatar} name={listing.owner_name} size={52} className="rounded-[12px]" />
                <div className="flex flex-col gap-2 text-[14px]">
                  {listing.about ? <p className="leading-relaxed whitespace-pre-line">{listing.about}</p> : null}
                  <p className="text-muted">
                    {dict.roles[listing.owner_role].name}
                    {listing.owner_verified ? ` · ✓ ${dict.publicProfile.verified}` : ""}
                    {listing.owner_city ? ` · ${listing.owner_city}` : ""}
                  </p>
                  <Link href={`/${locale}/p/${listing.owner_id}`} className="text-link">{format(l.viewProfile, { name: listing.owner_name })} →</Link>
                </div>
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-5">
            {!isOwner ? (
              <section id="apply" className="card-box scroll-mt-28">
                {listing.my_application ? (
                  <div className="flex flex-col items-start gap-3 text-[14px]">
                    <h3 className="!mb-0">{l.yourApplication}</h3>
                    <span className={`status-pill ${listing.my_application}`}>{l.applicationStatus[listing.my_application]}</span>
                    {listing.my_message ? <p className="text-muted italic">“{listing.my_message}”</p> : null}
                    <form action={withdrawApplication}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <button type="submit" className="btn btn-danger-outline btn-sm">{l.withdraw}</button>
                    </form>
                  </div>
                ) : canApply ? (
                  <>
                    <h3>{l.applyTitle}</h3>
                    <p className="mb-3 text-[13px] text-muted">{l.applyHint}</p>
                    <ApplyForm listingId={listing.id} t={l} errors={dict.auth.errors} />
                  </>
                ) : (
                  <div className="flex flex-col gap-3 text-[13.5px]">
                    <h3 className="!mb-0">{isClub ? l.applyTitle : l.contactTitle}</h3>
                    <p className="text-muted">
                      {!isClub ? l.contactHint : !active ? l.cannotApplyClosed : account.permissions.includes("offers.apply") ? l.cannotApply : l.cannotApplyRole}
                    </p>
                    <Link href={`/${locale}/p/${listing.owner_id}`} className="btn btn-ghost-light btn-sm self-start">{format(l.viewProfile, { name: listing.owner_name })}</Link>
                  </div>
                )}
              </section>
            ) : null}
            <section className="card-box">
              <h3>{l.facts.title}</h3>
              <dl className="flex flex-col gap-2.5 text-[13.5px]">
                {facts.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 border-b border-line pb-2 last:border-0">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-right font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </aside>
        </div>

        {similar.rows.length ? (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-extrabold text-white">{l.similar}</h2>
            <div className="tm-list">
              {similar.rows.map((r) => <ListingRowCard key={r.id} row={r} locale={locale} dict={dict} now={now} />)}
            </div>
          </section>
        ) : null}
      </PageBody>
    </>
  );
}

function OwnerPanel({ listing, locale, dict, now, expired, candidates }: {
  listing: ListingDetail; locale: Locale; dict: Messages; now: Date; expired: boolean; candidates: Awaited<ReturnType<typeof getCandidates>>;
}) {
  const l = dict.listings;
  const left = daysLeft(listing.expires_at, now);
  return (
    <section className="card-box flex flex-col gap-4 border-gold">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="!mb-0">{l.manage.title}</h3>
        <span className={`status-pill ${listing.status === "active" && !expired ? "active" : "closed"}`}>
          {listing.status === "closed" ? l.closed : expired ? l.expired : format(l.manage.daysLeft, { n: left })}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/${locale}/listings/${listing.id}/edit`} className="btn btn-ghost-light btn-sm">{l.edit}</Link>
        <form action={setListingStatus}>
          <input type="hidden" name="id" value={listing.id} />
          {listing.status === "active" && !expired ? (
            <button name="action" value="close" className="btn btn-ghost-light btn-sm">{l.manage.close}</button>
          ) : (
            <button name="action" value="reopen" className="btn btn-gold btn-sm">{l.manage.reopen}</button>
          )}
        </form>
        {listing.status === "active" && !expired && left < 30 ? (
          <form action={setListingStatus}>
            <input type="hidden" name="id" value={listing.id} />
            <button name="action" value="renew" className="btn btn-ghost-light btn-sm">{l.manage.renew}</button>
          </form>
        ) : null}
        <details className="group">
          <summary className="btn btn-danger-outline btn-sm list-none [&::-webkit-details-marker]:hidden">{l.manage.delete}</summary>
          <form action={deleteListing} className="mt-2 flex flex-col items-start gap-2 rounded-[10px] border border-[#e0b4ac] bg-[#fdf5f4] p-3">
            <input type="hidden" name="id" value={listing.id} />
            <input type="hidden" name="locale" value={locale} />
            <p className="text-[13px]">{l.manage.deleteConfirm}</p>
            <button type="submit" className="btn btn-danger-outline btn-sm">{l.manage.deleteFinal}</button>
          </form>
        </details>
      </div>

      {listing.type === "club_seeks" ? (
        <div className="border-t border-line pt-4">
          <p className="form-section-title">{format(candidates.length === 1 ? l.candidatesOne : l.candidates, { n: candidates.length })}</p>
          {candidates.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {candidates.map((c) => (
                <li key={c.id} className="flex flex-col gap-2 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar path={c.avatar_path} name={c.name} size={40} className="rounded-full" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/${locale}/p/${c.applicant_id}`} className="font-bold hover:underline">
                        {c.name} {c.country ? countryFlag(c.country) : ""}
                      </Link>
                      <p className="text-[12.5px] text-muted">
                        {[dict.roles[c.role].name, c.position && dict.options.positions[c.position], c.professional_type && dict.options.professionalTypes[c.professional_type], timeAgo(c.created_at, locale, now)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className={`status-pill ${c.status}`}>{l.applicationStatus[c.status]}</span>
                  </div>
                  {c.message ? <p className="rounded-[10px] bg-paper-soft px-3 py-2 text-[13.5px] whitespace-pre-line">{c.message}</p> : null}
                  <form action={setApplicationStatus} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    {applicationStatuses.filter((s) => s !== c.status).map((s) => (
                      <button key={s} name="status" value={s} className="btn btn-ghost-light btn-sm !px-3 !py-1.5 !text-[12.5px]">
                        {l.setStatus[s]}
                      </button>
                    ))}
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] text-muted">{l.manage.noCandidates}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
