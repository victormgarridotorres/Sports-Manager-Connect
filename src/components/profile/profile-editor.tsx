import Link from "next/link";
import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { requireAccount } from "@/lib/auth/dal";
import { countryOptions } from "@/lib/countries";
import { tabsForRole, type ProfileTab } from "@/lib/profile/completion";
import { languageOptions } from "@/lib/profile/options";
import { loadProfile } from "@/lib/profile/queries";
import {
  AvatarForm,
  BasicsForm,
  CareerManager,
  ClubForm,
  HighlightsManager,
  PlayerForm,
  ProfessionalForm,
  RosterManager,
  type EditorT,
} from "./editor-forms";

/** Contenido del editor (lee la sesión: debe ir dentro de <Suspense>). */
export async function ProfileEditor({ locale, tab, dict }: { locale: Locale; tab: ProfileTab; dict: Messages }) {
  const account = await requireAccount(locale, `/${locale}/dashboard/profile`);
  const full = await loadProfile(account.id);
  if (!full) redirect(`/${locale}/dashboard`);

  const tabs = tabsForRole(full.profile.role);
  if (!tabs.includes(tab)) redirect(`/${locale}/dashboard/profile`);

  const p = dict.profile;
  const t: EditorT = { p, o: dict.options, errors: dict.auth.errors, fe: dict.auth.fieldErrors };
  const tabLabel = (k: ProfileTab) => (k === "sport" && full.profile.role === "professional" ? p.tabs.professional : p.tabs[k]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav className="tabs !mb-0 flex-1" aria-label={p.editTitle.replace(/\*/g, "")}>
          {tabs.map((k) => (
            <Link
              key={k}
              href={k === "basics" ? `/${locale}/dashboard/profile` : `/${locale}/dashboard/profile/${k}`}
              className={`tab ${k === tab ? "active" : ""}`}
              aria-current={k === tab ? "page" : undefined}
            >
              {tabLabel(k)}
            </Link>
          ))}
        </nav>
        <Link href={`/${locale}/p/${full.profile.id}`} className="text-[13px] font-bold text-gold hover:underline">
          {p.nav.viewPublic} →
        </Link>
      </div>

      <section className="card-box">
        {tab === "basics" ? (
          <div className="flex flex-col gap-6">
            <AvatarForm profile={full.profile} t={t} />
            <div className="border-t border-line pt-6">
              <p className="form-section-title">{p.generalInfo}</p>
              <BasicsForm
                role={full.profile.role}
                profile={full.profile}
                countries={countryOptions(locale)}
                languages={languageOptions(locale)}
                t={t}
              />
            </div>
          </div>
        ) : null}
        {tab === "sport" && full.profile.role === "player" ? (
          <>
            <span className="type-badge">🤾 {p.playerBadge}</span>
            <PlayerForm data={full.player} t={t} />
          </>
        ) : null}
        {tab === "sport" && full.profile.role === "professional" ? (
          <>
            <span className="type-badge">📋 {p.professionalBadge}</span>
            <ProfessionalForm data={full.professional} t={t} />
          </>
        ) : null}
        {tab === "career" ? <CareerManager entries={full.career} t={t} /> : null}
        {tab === "highlights" ? <HighlightsManager items={full.highlights} t={t} /> : null}
        {tab === "club" ? <ClubForm data={full.club} t={t} /> : null}
        {tab === "roster" ? <RosterManager roster={full.roster} t={t} /> : null}
      </section>
    </>
  );
}
