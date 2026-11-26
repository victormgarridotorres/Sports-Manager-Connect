import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AliasNotice } from "@/components/forum/shared";
import { TopicList } from "@/components/forum/topic-row";
import { SimplePagination } from "@/components/listings/listing-filters";
import { Alert } from "@/components/auth/form-ui";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import { categoryIcon, forumCategories, isForumCategory, TOPICS_PAGE_SIZE, type ForumCategory } from "@/lib/forum/options";
import { listTopics, myForumIdentity, pageParam } from "@/lib/forum/queries";
import { requestNow } from "@/lib/request-time";

type Props = PageProps<"/[locale]/community/[category]">;

export function generateStaticParams() {
  return forumCategories.map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  if (!hasLocale(locale) || !isForumCategory(category)) return {};
  const t = (await getDictionary(locale)).community;
  return { title: `${t.categories[category].name} · ${t.crumb}`, description: t.categories[category].description };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, category } = await params;
  if (!hasLocale(locale) || !isForumCategory(category)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.community;
  return (
    <>
      <SubHero crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: t.crumb, href: `/${locale}/community` }, { label: t.categories[category].name }]}>
        <div className="flex flex-wrap items-center gap-[22px] pt-2">
          <div aria-hidden className="flex size-[88px] items-center justify-center rounded-[22px] bg-gold-soft text-[38px] text-gold-deep">
            {categoryIcon[category]}
          </div>
          <div className="min-w-0">
            <span className="eyebrow-dark">{t.categoryEyebrow}</span>
            <h1 className="!mb-1.5">{t.categories[category].name}</h1>
            <p className="!text-[14.5px]">{t.categories[category].description}</p>
          </div>
        </div>
      </SubHero>
      <PageBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <Topics locale={locale} dict={dict} category={category} searchParams={searchParams} />
        </Suspense>
      </PageBody>
    </>
  );
}

async function Topics({ locale, dict, category, searchParams }: { locale: Locale; dict: Messages; category: ForumCategory; searchParams: Props["searchParams"] }) {
  const base = `/${locale}/community/${category}`;
  const account = await requireAccount(locale, base);
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const t = dict.community;
  const [identity, { rows, total }, now] = await Promise.all([myForumIdentity(account.id), listTopics({ category, page }), requestNow()]);
  const canWrite = account.permissions.includes("content.comment");
  return (
    <>
      {sp.deleted ? <div className="mb-5"><Alert tone="success">{t.thread.deleted}</Alert></div> : null}
      {canWrite && !identity ? <AliasNotice locale={locale} t={t} next={base} /> : null}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="!m-0 text-[20px] font-extrabold text-white">{t.inCategory}</h2>
        {canWrite ? (
          <Link className="btn btn-gold" href={`/${locale}/community/new?category=${category}`}>
            + {t.newTopic}
          </Link>
        ) : null}
      </div>
      <TopicList rows={rows} locale={locale} dict={dict} now={now} showCategory={false} empty={t.emptyCategory} />
      <SimplePagination hrefFor={(p) => `${base}?page=${p}`} page={page} total={total} pageSize={TOPICS_PAGE_SIZE} t={dict.move} />
    </>
  );
}
