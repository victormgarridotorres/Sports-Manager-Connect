import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { TopicForm } from "@/components/forum/forms";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import { isForumCategory } from "@/lib/forum/options";
import { myForumIdentity } from "@/lib/forum/queries";

type Props = PageProps<"/[locale]/community/new">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: (await getDictionary(locale)).community.form.crumb };
}

export default async function NewTopicPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.community;
  return (
    <>
      <SubHero
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: t.crumb, href: `/${locale}/community` }, { label: t.form.crumb }]}
        eyebrow={t.form.eyebrow}
        title={t.form.heading}
        lead={t.form.lead}
      />
      <PageBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <NewTopic locale={locale} dict={dict} searchParams={searchParams} />
        </Suspense>
      </PageBody>
    </>
  );
}

async function NewTopic({ locale, dict, searchParams }: { locale: Locale; dict: Messages; searchParams: Props["searchParams"] }) {
  const sp = await searchParams;
  const category = isForumCategory(sp.category) ? sp.category : "transfers";
  const path = `/${locale}/community/new${isForumCategory(sp.category) ? `?category=${category}` : ""}`;
  const account = await requireAccount(locale, path);
  if (!account.permissions.includes("content.comment")) {
    return <div className="card-box text-[14px] text-muted">{dict.community.cannotWrite}</div>;
  }
  const identity = await myForumIdentity(account.id);
  if (!identity) redirect(`/${locale}/dashboard/forum?next=${encodeURIComponent(path)}`);
  return <TopicForm locale={locale} initialCategory={category} identity={identity} t={dict.community} e={{ errors: dict.auth.errors, fe: dict.auth.fieldErrors }} />;
}
