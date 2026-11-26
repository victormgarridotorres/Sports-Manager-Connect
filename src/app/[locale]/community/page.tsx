import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AliasNotice, fmtNumber } from "@/components/forum/shared";
import { TopicList } from "@/components/forum/topic-row";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import { categoryIcon, forumCategories } from "@/lib/forum/options";
import { categoryStats, listTopics, myForumIdentity } from "@/lib/forum/queries";
import { requestNow } from "@/lib/request-time";

export async function generateMetadata({ params }: PageProps<"/[locale]/community">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = (await getDictionary(locale)).community;
  return { title: t.crumb, description: t.lead };
}

export default async function CommunityPage({ params }: PageProps<"/[locale]/community">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.community;
  return (
    <>
      <SubHero crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: t.crumb }]} eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
      <PageBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <Forum locale={locale} dict={dict} />
        </Suspense>
      </PageBody>
    </>
  );
}

async function Forum({ locale, dict }: { locale: Locale; dict: Messages }) {
  const account = await requireAccount(locale, `/${locale}/community`);
  const t = dict.community;
  const [identity, stats, recent, now] = await Promise.all([myForumIdentity(account.id), categoryStats(), listTopics({ limit: 12 }), requestNow()]);
  const canWrite = account.permissions.includes("content.comment");
  return (
    <>
      {canWrite && !identity ? <AliasNotice locale={locale} t={t} next={`/${locale}/community`} /> : null}
      <div className="forum-cat-grid">
        {forumCategories.map((c) => {
          const s = stats[c] ?? { topics: 0, posts: 0 };
          return (
            <Link key={c} className="forum-cat" href={`/${locale}/community/${c}`}>
              <div className="ic" aria-hidden>
                {categoryIcon[c]}
              </div>
              <div>
                <h3>{t.categories[c].name}</h3>
                <p>{t.categories[c].description}</p>
                <span className="n">
                  {format(s.topics === 1 ? t.topicsCountOne : t.topicsCount, { n: fmtNumber(s.topics, locale) })} ·{" "}
                  {format(s.posts === 1 ? t.postsCountOne : t.postsCount, { n: fmtNumber(s.posts, locale) })}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="!m-0 text-[20px] font-extrabold text-white">{t.recent}</h2>
        {canWrite ? (
          <Link className="btn btn-gold" href={`/${locale}/community/new`}>
            + {t.newTopic}
          </Link>
        ) : null}
      </div>
      {recent.error ? (
        <div className="card-box text-[14px] text-muted">{dict.auth.errors.generic}</div>
      ) : (
        <TopicList rows={recent.rows} locale={locale} dict={dict} now={now} empty={t.emptyForum} />
      )}
    </>
  );
}
