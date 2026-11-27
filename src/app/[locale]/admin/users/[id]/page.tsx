import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SuspendForm, StaffToggle, VerificationForm } from "@/components/admin/forms";
import { LogList } from "@/components/admin/log-list";
import { AdminBody, AdminFrame, AdminHero } from "@/components/admin/shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { getDictionary } from "@/i18n/get-dictionary";
import { getAccount } from "@/lib/auth/dal";
import { adminLog, adminUser } from "@/lib/admin/queries";
import { countryFlag, countryName } from "@/lib/profile/display";

type Props = PageProps<"/[locale]/admin/users/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: (await getDictionary(locale)).admin.tabs.users, robots: { index: false } };
}

export default function AdminUserPage({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <Loader params={params} />
    </Suspense>
  );
}

async function Loader({ params }: { params: Props["params"] }) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <>
      <AdminHero locale={locale} dict={dict} current={dict.admin.tabs.users} />
      <AdminBody>
        <AdminFrame locale={locale} dict={dict} tab="users" next={`/${locale}/admin/users/${id}`}>
          <Detail locale={locale} dict={dict} id={id} />
        </AdminFrame>
      </AdminBody>
    </>
  );
}

async function Detail({ locale, dict, id }: { locale: Locale; dict: Messages; id: string }) {
  const t = dict.admin;
  const [u, log, me] = await Promise.all([adminUser(id), adminLog(id, 30), getAccount()]);
  if (!u) return <div className="card-box text-[14px] text-muted">{t.users.notFound}</div>;
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : "—");
  const facts: [string, React.ReactNode][] = [
    [t.user.email, <span key="e" className="break-all">{u.email ?? "—"} {u.email_confirmed ? "✓" : `(${t.user.unconfirmed})`}</span>],
    [t.user.role, dict.roles[u.role].name],
    [t.user.country, u.country ? `${countryFlag(u.country)} ${countryName(u.country, locale)}${u.city ? ` · ${u.city}` : ""}` : "—"],
    [t.user.visibility, dict.options.visibility[u.visibility]],
    [t.user.joined, fmt(u.created_at)],
    [t.user.lastSignIn, fmt(u.last_sign_in_at)],
    [t.user.forumAlias, u.forum_alias ?? "—"],
    [t.user.activity, `${u.listings} ${t.user.listings} · ${u.forum_posts} ${t.user.forumPosts} · ${u.messages_sent} ${t.user.messages}`],
    [t.user.reportsReceived, String(u.reports_received)],
  ];
  if (u.role === "club") facts.push([t.user.club, [u.club_name, u.club_league, u.club_founded ? `${t.user.founded} ${u.club_founded}` : null].filter(Boolean).join(" · ") || "—"]);
  if (u.club_website) facts.push([t.user.website, <a key="w" href={u.club_website} target="_blank" rel="noopener noreferrer" className="break-all text-gold-deep underline">{u.club_website}</a>]);
  if (u.role === "professional")
    facts.push([t.user.professional, [u.professional_type ? dict.options.professionalTypes[u.professional_type] : null, u.current_entity, u.years_experience != null ? `${u.years_experience} ${t.user.years}` : null].filter(Boolean).join(" · ") || "—"]);
  const e = dict.auth.errors;
  const isMe = me?.id === u.id;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section className="card-box">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="!m-0">
              {u.display_name} {u.suspended_at ? <span className="status-pill err">{t.users.suspendedBadge}</span> : null}
            </h3>
            <Link href={`/${locale}/p/${u.id}`} className="btn btn-ghost-light btn-sm">
              {t.user.viewProfile}
            </Link>
          </div>
          <dl className="grid gap-x-6 gap-y-3 text-[13.5px] sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[11.5px] font-bold tracking-wide text-muted uppercase">{k}</dt>
                <dd className="m-0">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="card-box">
          <h3>{t.log.title}</h3>
          <LogList entries={log} locale={locale} dict={dict} />
        </section>
      </div>
      <aside className="flex flex-col gap-5">
        {u.role === "club" || u.role === "professional" ? (
          <section className="card-box">
            <h3>{t.verification.title}</h3>
            <p className="mb-3 text-[13px]">
              {t.verification.current}: <b>{dict.verification[u.verification_status]}</b>
            </p>
            <VerificationForm userId={u.id} current={u.verification_status} note={u.verification_note} t={t} errors={e} />
          </section>
        ) : null}
        <section className="card-box">
          <h3>{t.staff.title}</h3>
          {(["admin", "editor", "moderator"] as const).map((r) => (
            <StaffToggle key={r} userId={u.id} role={r} on={r === "admin" ? u.is_admin : r === "editor" ? u.is_editor : u.is_moderator} label={t.staff.roles[r]} t={t} errors={e} />
          ))}
        </section>
        {!isMe ? (
          <section className="card-box">
            <h3>{t.suspension.title}</h3>
            <SuspendForm userId={u.id} suspended={!!u.suspended_at} reason={u.suspension_reason} t={t} errors={e} />
          </section>
        ) : null}
      </aside>
    </div>
  );
}
