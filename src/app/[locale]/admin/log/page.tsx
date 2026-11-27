import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LogList } from "@/components/admin/log-list";
import { AdminBody, AdminFrame, AdminHero } from "@/components/admin/shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { getDictionary } from "@/i18n/get-dictionary";
import { adminLog } from "@/lib/admin/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/log">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: (await getDictionary(locale)).admin.tabs.log, robots: { index: false } };
}

export default async function AdminLogPage({ params }: PageProps<"/[locale]/admin/log">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <>
      <AdminHero locale={locale} dict={dict} current={dict.admin.tabs.log} />
      <AdminBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <AdminFrame locale={locale} dict={dict} tab="log" next={`/${locale}/admin/log`}>
            <Log locale={locale} dict={dict} />
          </AdminFrame>
        </Suspense>
      </AdminBody>
    </>
  );
}

async function Log({ locale, dict }: { locale: Locale; dict: Messages }) {
  const entries = await adminLog(undefined, 300);
  return (
    <section className="card-box">
      <p className="mb-2 text-[13px] text-muted">{dict.admin.log.lead}</p>
      <LogList entries={entries} locale={locale} dict={dict} />
    </section>
  );
}
