import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VerificationForm } from "@/components/admin/forms";
import { AdminBody, AdminFrame, AdminHero } from "@/components/admin/shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { adminUser, adminUsers } from "@/lib/admin/queries";
import { countryFlag, countryName } from "@/lib/profile/display";

type Props = PageProps<"/[locale]/admin/verifications">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: (await getDictionary(locale)).admin.tabs.verifications, robots: { index: false } };
}

export default async function VerificationsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <>
      <AdminHero locale={locale} dict={dict} current={dict.admin.tabs.verifications} />
      <AdminBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <AdminFrame locale={locale} dict={dict} tab="verifications" next={`/${locale}/admin/verifications`}>
            <Queue locale={locale} dict={dict} />
          </AdminFrame>
        </Suspense>
      </AdminBody>
    </>
  );
}

async function Queue({ locale, dict }: { locale: Locale; dict: Messages }) {
  const t = dict.admin;
  const { rows } = await adminUsers({ filter: "pending", limit: 20 });
  const details = await Promise.all(rows.map((r) => adminUser(r.id)));
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[760px] text-[13.5px] text-on-dark">{t.verification.queueLead}</p>
      {details.length === 0 ? <div className="card-box text-[14px] text-muted">{t.verification.empty}</div> : null}
      {details.map((u) =>
        u ? (
          <article key={u.id} className="card-box flex flex-wrap items-start gap-5">
            <div className="min-w-0 flex-1">
              <h3 className="!mb-1">
                {u.display_name} {u.country ? <span aria-label={countryName(u.country, locale) ?? undefined}>{countryFlag(u.country)}</span> : null}
              </h3>
              <p className="text-[13px] text-muted">
                {dict.roles[u.role].name} · {u.email} · {format(t.users.joined, { date: new Date(u.created_at).toLocaleDateString(locale, { day: "numeric", month: "short" }) })}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-[13.5px]">
                {u.role === "club" ? (
                  <>
                    <li>🏟️ {[u.club_name, u.club_league, u.club_founded ? `${t.user.founded} ${u.club_founded}` : null].filter(Boolean).join(" · ") || t.verification.noData}</li>
                    {u.club_website ? (
                      <li>
                        🌐{" "}
                        <a href={u.club_website} target="_blank" rel="noopener noreferrer" className="break-all text-gold-deep underline">
                          {u.club_website}
                        </a>
                      </li>
                    ) : (
                      <li className="text-muted">🌐 {t.verification.noWebsite}</li>
                    )}
                  </>
                ) : (
                  <li>📋 {[u.professional_type ? dict.options.professionalTypes[u.professional_type] : null, u.current_entity, u.years_experience != null ? `${u.years_experience} ${t.user.years}` : null].filter(Boolean).join(" · ") || t.verification.noData}</li>
                )}
              </ul>
              <div className="mt-3 flex flex-wrap gap-3 text-[13px] font-bold">
                <Link href={`/${locale}/p/${u.id}`} className="text-gold-deep">
                  {t.user.viewProfile} →
                </Link>
                <Link href={`/${locale}/admin/users/${u.id}`} className="text-gold-deep">
                  {t.verification.review} →
                </Link>
              </div>
            </div>
            <div className="w-full sm:w-[320px]">
              <VerificationForm userId={u.id} current={u.verification_status} t={t} errors={dict.auth.errors} />
            </div>
          </article>
        ) : null,
      )}
    </div>
  );
}
