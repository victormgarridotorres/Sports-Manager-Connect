import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminBody, AdminFrame, AdminHero } from "@/components/admin/shell";
import { SimplePagination } from "@/components/listings/listing-filters";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { roles, type Role } from "@/lib/auth/permissions";
import { ADMIN_PAGE_SIZE, adminUsers, userFilters, type UserFilter } from "@/lib/admin/queries";
import { countryFlag } from "@/lib/profile/display";

type Props = PageProps<"/[locale]/admin/users">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: (await getDictionary(locale)).admin.tabs.users, robots: { index: false } };
}

export default async function AdminUsersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <>
      <AdminHero locale={locale} dict={dict} current={dict.admin.tabs.users} />
      <AdminBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <AdminFrame locale={locale} dict={dict} tab="users" next={`/${locale}/admin/users`}>
            <Users locale={locale} dict={dict} searchParams={searchParams} />
          </AdminFrame>
        </Suspense>
      </AdminBody>
    </>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Users({ locale, dict, searchParams }: { locale: Locale; dict: Messages; searchParams: Props["searchParams"] }) {
  const t = dict.admin;
  const sp = await searchParams;
  const q = one(sp.q)?.trim().slice(0, 80) || undefined;
  const role = (roles as readonly string[]).includes(one(sp.role) ?? "") ? (one(sp.role) as Role) : undefined;
  const filter = (userFilters as readonly string[]).includes(one(sp.filter) ?? "") ? (one(sp.filter) as UserFilter) : undefined;
  const pageNum = Number(one(sp.page));
  const page = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;
  const { rows, total } = await adminUsers({ q, role, filter, page });
  const base = `/${locale}/admin/users`;
  const href = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (role) s.set("role", role);
    if (filter) s.set("filter", filter);
    if (p > 1) s.set("page", String(p));
    return s.size ? `${base}?${s}` : base;
  };

  return (
    <div className="flex flex-col gap-4">
      <form method="get" action={base} className="card-box flex flex-wrap items-end gap-3" role="search">
        <div className="form-field min-w-[220px] flex-1">
          <label htmlFor="q">{t.users.search}</label>
          <input id="q" name="q" defaultValue={q} placeholder={t.users.searchPlaceholder} maxLength={80} />
        </div>
        <div className="form-field">
          <label htmlFor="role">{t.users.role}</label>
          <select id="role" name="role" defaultValue={role ?? ""}>
            <option value="">{t.users.all}</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {dict.roles[r].name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="filter">{t.users.filter}</label>
          <select id="filter" name="filter" defaultValue={filter ?? ""}>
            <option value="">{t.users.all}</option>
            {userFilters.map((f) => (
              <option key={f} value={f}>
                {t.users.filters[f]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-gold">
          {t.users.apply}
        </button>
      </form>

      <p className="text-[14px] font-bold text-white">{format(total === 1 ? t.users.countOne : t.users.count, { n: total })}</p>

      {rows.length ? (
        <div className="card-box !py-1">
          {rows.map((u) => (
            <Link key={u.id} href={`/${locale}/admin/users/${u.id}`} className="editor-row hover:bg-paper-soft">
              <div className="min-w-0 flex-1">
                <h4>
                  {u.display_name} {u.country ? <span aria-hidden>{countryFlag(u.country)}</span> : null}
                </h4>
                <p className="break-all">{u.email}</p>
                <p>
                  {dict.roles[u.role].name}
                  {u.verification_status !== "not_required" ? ` · ${dict.verification[u.verification_status]}` : ""} ·{" "}
                  {format(t.users.joined, { date: new Date(u.created_at).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) })}
                </p>
              </div>
              <div className="flex flex-none flex-wrap justify-end gap-1.5">
                {u.suspended ? <span className="status-pill err">{t.users.suspendedBadge}</span> : null}
                {u.verification_status === "pending" ? <span className="status-pill">{dict.verification.pending}</span> : null}
                {u.is_admin ? <span className="status-pill ok">{t.staff.roles.admin}</span> : null}
                {u.is_editor ? <span className="status-pill ok">{t.staff.roles.editor}</span> : null}
                {u.is_moderator ? <span className="status-pill ok">{t.staff.roles.moderator}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card-box text-[14px] text-muted">{t.users.empty}</div>
      )}
      <SimplePagination hrefFor={href} page={page} total={total} pageSize={ADMIN_PAGE_SIZE} t={dict.move} />
    </div>
  );
}
