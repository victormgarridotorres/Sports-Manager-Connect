import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AnonAvatar } from "@/components/forum/anon-avatar";
import { TopicList } from "@/components/forum/topic-row";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import { forumProfile, listTopics } from "@/lib/forum/queries";
import { requestNow } from "@/lib/request-time";

type Props = PageProps<"/[locale]/community/u/[alias]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: (await getDictionary(locale)).community.crumb, robots: { index: false } };
}

export default function ForumProfilePage({ params }: Props) {
  return (
    <Suspense fallback={<SubHero />}>
      <ProfileLoader params={params} />
    </Suspense>
  );
}

async function ProfileLoader({ params }: { params: Props["params"] }) {
  const { locale, alias } = await params;
  if (!hasLocale(locale)) notFound();
  return <Profile locale={locale} dict={await getDictionary(locale)} alias={decodeURIComponent(alias)} />;
}

async function Profile({ locale, dict, alias }: { locale: Locale; dict: Messages; alias: string }) {
  await requireAccount(locale, `/${locale}/community/u/${encodeURIComponent(alias)}`);
  const t = dict.community;
  const crumbs = [
    { label: dict.nav.home, href: `/${locale}` },
    { label: t.crumb, href: `/${locale}/community` },
  ];
  const [profile, now] = await Promise.all([forumProfile(alias), requestNow()]);
  if (!profile) {
    return (
      <>
        <SubHero crumbs={crumbs} title={t.profile.notFoundTitle} />
        <PageBody narrow>
          <div className="card-box text-[14px] text-muted">{t.profile.notFound}</div>
        </PageBody>
      </>
    );
  }
  const { rows } = await listTopics({ alias: profile.alias, limit: 20 });
  const since = new Date(profile.member_since).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const stats = [
    { value: profile.topics, label: t.profile.topics },
    { value: profile.replies, label: t.profile.replies },
  ];
  return (
    <>
      <SubHero crumbs={[...crumbs, { label: profile.alias }]}>
        <div className="flex flex-wrap items-end gap-[26px] pt-2">
          <AnonAvatar avatar={profile.avatar} size={96} />
          <div className="min-w-0">
            <h1 className="!mb-1.5 break-all">{profile.alias}</h1>
            <p className="!text-[14.5px]">
              {dict.roles[profile.role].name} · {format(t.profile.memberSince, { date: since })} · 🕶️ {t.profile.anonymous}
            </p>
          </div>
          {profile.is_me ? (
            <Link href={`/${locale}/dashboard/forum`} className="btn btn-gold sm:ml-auto">
              {t.profile.editMine}
            </Link>
          ) : null}
        </div>
        <div className="profile-quickstats">
          {stats.map((s) => (
            <div key={s.label} className="qs">
              <b>{s.value.toLocaleString(locale)}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </SubHero>
      <PageBody>
        <h2 className="mb-5 text-[20px] font-extrabold text-white">{format(t.profile.topicsBy, { alias: profile.alias })}</h2>
        <TopicList rows={rows} locale={locale} dict={dict} now={now} empty={t.profile.noTopics} />
      </PageBody>
    </>
  );
}
