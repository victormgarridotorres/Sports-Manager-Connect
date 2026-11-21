import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Alert } from "@/components/auth/form-ui";
import { PageBody, SubHero } from "@/components/page-shell";
import { RoleIcon } from "@/components/role-icon";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import { initials } from "@/lib/initials";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).nav.dashboard } : {};
}

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <Suspense
      fallback={
        <>
          <SubHero lead={dict.dashboard.loading} />
          <PageBody>{null}</PageBody>
        </>
      }
    >
      <Dashboard locale={locale} dict={dict} />
    </Suspense>
  );
}

async function Dashboard({ locale, dict }: { locale: Locale; dict: Messages }) {
  const account = await requireAccount(locale, `/${locale}/dashboard`);
  const d = dict.dashboard;
  const status = account.verificationStatus;

  return (
    <>
      <SubHero>
        <div className="flex flex-wrap items-center gap-[18px]">
          <div aria-hidden className="avatar-tile size-16 rounded-2xl border-[3px] border-white/15 text-xl">
            {initials(account.displayName)}
          </div>
          <div className="min-w-0">
            <h1 className="!mb-0.5">{format(d.welcome, { name: account.displayName })}</h1>
            <p>{d.summary}</p>
          </div>
          <div className="sm:ml-auto sm:text-right">
            <span className="text-[13px] text-on-dark-muted">{d.yourProfile}</span>
            <b className="flex items-center gap-2 text-[15px] sm:justify-end">
              <span className="cat-icon !m-0 size-6 rounded-md !shadow-none [&_svg]:size-3.5">
                <RoleIcon role={account.role} />
              </span>
              {dict.roles[account.role].name}
              {status !== "not_required" ? (
                <span className="font-semibold text-on-dark"> · {dict.verification[status]}</span>
              ) : null}
            </b>
          </div>
        </div>
      </SubHero>
      <PageBody>
        <div className="flex flex-col gap-5">
          {status === "pending" ? <Alert tone="warning">{d.pendingNotice}</Alert> : null}
          {status === "rejected" ? <Alert tone="error">{d.rejectedNotice}</Alert> : null}

          <section className="card-box">
            <h3>{d.permissionsTitle}</h3>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {account.permissions.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[13.5px]">
                  <span aria-hidden className="check-dot on" />
                  {dict.permissions[p]}
                </li>
              ))}
            </ul>
            {account.lockedPermissions.length > 0 ? (
              <>
                <p className="form-section-title mt-6">{d.lockedTitle}</p>
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {account.lockedPermissions.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-[13.5px] text-muted">
                      <span aria-hidden className="check-dot off" />
                      {dict.permissions[p]}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        </div>
      </PageBody>
    </>
  );
}
