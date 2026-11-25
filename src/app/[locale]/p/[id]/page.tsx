import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { PageBody, SubHero } from "@/components/page-shell";
import { Avatar } from "@/components/profile/avatar";
import { PositionPitchView } from "@/components/profile/position-pitch";
import { VideoCard } from "@/components/profile/video-card";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { getAccount } from "@/lib/auth/dal";
import { ageFromBirthYear, countryFlag, countryName, languageNames } from "@/lib/profile/display";
import { loadProfile } from "@/lib/profile/queries";
import type { FullProfile } from "@/lib/profile/types";

export default function PublicProfilePage({ params }: PageProps<"/[locale]/p/[id]">) {
  // El perfil depende del visitante (visibilidad): todo va en Suspense.
  return (
    <Suspense fallback={<SubHero />}>
      <PublicProfile params={params} />
    </Suspense>
  );
}

async function PublicProfile({ params }: { params: PageProps<"/[locale]/p/[id]">["params"] }) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const [full, viewer] = await Promise.all([loadProfile(id), getAccount()]);

  if (!full) {
    return (
      <>
        <SubHero crumbs={[{ label: dict.nav.home, href: `/${locale}` }]} title={dict.publicProfile.unavailableTitle} />
        <PageBody narrow>
          <div className="card-box text-[14px] text-muted">{dict.publicProfile.unavailableBody}</div>
        </PageBody>
      </>
    );
  }
  return <ProfileView full={full} locale={locale} dict={dict} isOwner={viewer?.id === full.profile.id} />;
}

function ProfileView({ full, locale, dict, isOwner }: { full: FullProfile; locale: Locale; dict: Messages; isOwner: boolean }) {
  const { profile, player, professional, club } = full;
  const pp = dict.publicProfile;
  const o = dict.options;
  const role = profile.role;
  const age = ageFromBirthYear(player?.birth_year);
  const memberSince = new Date(profile.created_at).getFullYear();
  const country = countryName(profile.country, locale);
  const place = [profile.city, country].filter(Boolean).join(", ");

  const roleLine = (
    role === "player"
      ? [player?.position && o.positions[player.position], player?.current_club, player?.availability && o.availability[player.availability]]
      : role === "professional"
        ? [professional?.professional_type && o.professionalTypes[professional.professional_type], professional?.current_entity,
           professional?.availability && o.availability[professional.availability]]
        : role === "club"
          ? [club?.league, place, club?.founded_year && format(pp.foundedIn, { year: club.founded_year })]
          : [dict.roles.fan.name, format(pp.memberSince, { year: memberSince })]
  ).filter(Boolean);

  const stats: { value: string; label: string }[] = [];
  if (role === "player") {
    if (age) stats.push({ value: String(age), label: pp.years });
    if (player?.height_cm) stats.push({ value: `${(player.height_cm / 100).toLocaleString(locale, { minimumFractionDigits: 2 })} m`, label: pp.height });
    if (player?.weight_kg) stats.push({ value: `${player.weight_kg} kg`, label: pp.weight });
    if (player?.dominant_hand) stats.push({ value: o.hands[player.dominant_hand], label: pp.hand });
  } else if (role === "professional") {
    if (professional?.professional_type) stats.push({ value: o.professionalTypes[professional.professional_type], label: pp.specialty });
    if (professional?.years_experience != null) stats.push({ value: format(pp.yearsCount, { n: professional.years_experience }), label: pp.experience });
  } else if (role === "club") {
    if (club?.founded_year) stats.push({ value: String(club.founded_year), label: pp.founded });
    if (club?.league) stats.push({ value: club.league, label: pp.league });
    if (full.roster.length) stats.push({ value: String(full.roster.length), label: pp.players });
  }

  const details: [string, ReactNode][] = [];
  const add = (label: string, value: ReactNode | null | undefined | false) => value && details.push([label, value]);
  if (role === "player") {
    add(pp.position, player?.position && o.positions[player.position]);
    add(pp.age, age && format(pp.ageValue, { n: age }));
    add(pp.currentClub, player?.current_club);
    add(pp.league, player?.current_league);
    add(pp.availability, player?.availability && o.availability[player.availability]);
  } else if (role === "professional") {
    add(pp.specialty, professional?.professional_type && o.professionalTypes[professional.professional_type]);
    add(pp.experience, professional?.years_experience != null && format(pp.yearsCount, { n: professional.years_experience }));
    add(pp.entity, professional?.current_entity);
    add(pp.availability, professional?.availability && o.availability[professional.availability]);
  } else if (role === "club") {
    add(pp.founded, club?.founded_year);
    add(pp.league, club?.league);
    add(pp.venue, club?.venue);
    add(pp.website, club?.website && (
      <a href={club.website} target="_blank" rel="noopener noreferrer nofollow" className="text-link break-all">
        {club.website.replace(/^https?:\/\//, "")}
      </a>
    ));
  }
  add(pp.country, country && `${countryFlag(profile.country)} ${country}`);
  add(pp.city, role !== "club" && profile.city);
  add(pp.languages, profile.languages.length > 0 && languageNames(profile.languages, locale).join(", "));

  const crumbs = [{ label: dict.nav.home, href: `/${locale}` }, { label: dict.roles[role].name }, { label: profile.display_name }];

  return (
    <>
      <SubHero crumbs={crumbs}>
        <div className="flex flex-wrap items-end gap-[26px] pt-2">
          <Avatar path={profile.avatar_path} name={profile.display_name} size={96} className="rounded-[22px] border-[3px] border-white/15" />
          <div className="min-w-0">
            <h1 className="!mb-1.5 flex flex-wrap items-center gap-2.5">
              {profile.display_name}
              {profile.country ? <span aria-label={country ?? undefined}>{countryFlag(profile.country)}</span> : null}
              {profile.verification_status === "verified" ? (
                <span className="eyebrow-dark !mb-0 !px-2.5 !py-1 !text-[11px]">✓ {pp.verified}</span>
              ) : null}
            </h1>
            {roleLine.length ? <p className="!text-[14.5px]">{roleLine.join(" · ")}</p> : null}
          </div>
          {isOwner ? (
            <div className="flex flex-wrap gap-2.5 sm:ml-auto">
              <Link href={`/${locale}/dashboard/profile`} className="btn btn-gold">
                {pp.editMine}
              </Link>
            </div>
          ) : null}
        </div>
        {stats.length ? (
          <div className="profile-quickstats">
            {stats.map((s) => (
              <div key={s.label} className="qs">
                <b>{s.value}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </SubHero>

      <PageBody>
        <div className="profile-layout">
          <div className="flex flex-col gap-5">
            <section className="card-box">
              <h3>{role === "club" ? format(pp.aboutClub, { name: profile.display_name }) : pp.about}</h3>
              {profile.bio ? (
                <p className="mb-5 text-[14.5px] leading-relaxed whitespace-pre-line">{profile.bio}</p>
              ) : (
                <p className="mb-5 text-[13.5px] text-muted">{isOwner ? pp.emptyOwner : pp.empty}</p>
              )}
              {details.length ? (
                <div className="info-grid">
                  {details.map(([label, value]) => (
                    <div key={label}>
                      <b>{label}</b>
                      {value}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {role === "player" && (player?.position || player?.defense_position) ? (
              <section className="card-box">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3>{pp.attack}</h3>
                    <PositionPitchView mode="attack" title={pp.attack} primary={player?.position ?? null}
                      secondary={player?.secondary_position ?? null} labels={o.positionsShort} />
                  </div>
                  <div>
                    <h3>{pp.defense}</h3>
                    <PositionPitchView mode="defense" title={pp.defense} primary={player?.defense_position ?? null}
                      secondary={player?.secondary_defense_position ?? null} labels={o.defenseShort} />
                  </div>
                </div>
                <p className="mt-3 text-[12.5px] text-muted">{pp.positionsLegend}</p>
              </section>
            ) : null}

            {full.highlights.length ? (
              <section className="card-box">
                <h3>{pp.highlights}</h3>
                <div className="hl-grid">
                  {full.highlights.map((h) => (
                    <VideoCard key={h.id} video={{ provider: h.provider, videoId: h.video_id }}
                      title={h.title ?? dict.profile.untitledVideo} playLabel={dict.profile.play} />
                  ))}
                </div>
              </section>
            ) : null}

            {role === "professional" && (professional?.education || professional?.achievements) ? (
              <section className="card-box flex flex-col gap-5">
                {professional?.education ? (
                  <div>
                    <h3>{pp.education}</h3>
                    <p className="text-[14px] leading-relaxed whitespace-pre-line">{professional.education}</p>
                  </div>
                ) : null}
                {professional?.achievements ? (
                  <div>
                    <h3>{pp.achievements}</h3>
                    <p className="text-[14px] leading-relaxed whitespace-pre-line">{professional.achievements}</p>
                  </div>
                ) : null}
              </section>
            ) : null}

            {full.career.length ? (
              <section className="card-box">
                <h3>{pp.career}</h3>
                <ul className="timeline">
                  {full.career.map((e) => (
                    <li key={e.id} className="tl-item">
                      <b>{e.organization}</b>
                      <span>
                        {e.start_year} — {e.end_year ?? dict.profile.present}
                        {e.detail ? ` · ${e.detail}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {role === "club" && full.roster.length ? (
              <section className="card-box">
                <h3>{pp.roster}</h3>
                <ul className="divide-y divide-line">
                  {full.roster.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-2.5 text-[13.5px]">
                      <span className="w-8 text-center font-display font-extrabold text-gold-deep">{r.shirt_number ?? "–"}</span>
                      <span className="flex-1 font-semibold">{r.player_name}</span>
                      <span className="text-muted">{r.position ? o.positions[r.position] : ""}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {role === "club" && club?.honours ? (
              <section className="card-box">
                <h3>{pp.honours}</h3>
                <p className="text-[14px] leading-relaxed whitespace-pre-line">{club.honours}</p>
              </section>
            ) : null}
          </div>

          <aside className="card-box flex flex-col gap-3 text-[13.5px]">
            <h3 className="!mb-1">{dict.roles[role].name}</h3>
            <p className="text-muted">{dict.roles[role].description}</p>
            <p>
              <b>{pp.memberSinceLabel}:</b> {memberSince}
            </p>
            {role === "professional" || role === "club" ? (
              <p>
                <b>{pp.verificationLabel}:</b> {dict.verification[profile.verification_status]}
              </p>
            ) : null}
          </aside>
        </div>
      </PageBody>
    </>
  );
}
