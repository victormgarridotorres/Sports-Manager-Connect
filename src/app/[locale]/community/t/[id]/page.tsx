import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Alert } from "@/components/auth/form-ui";
import { DeleteTopicForm, EditTopicForm, ReplyForm, ReportForm } from "@/components/forum/forms";
import { HiddenNote, ModerateButtons, PostAuthor, ReplyItem, Tool } from "@/components/forum/post";
import { AliasNotice } from "@/components/forum/shared";
import { SimplePagination } from "@/components/listings/listing-filters";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import { POSTS_PAGE_SIZE } from "@/lib/forum/options";
import { getPosts, getTopic, myForumIdentity, pageParam } from "@/lib/forum/queries";
import { timeAgo } from "@/lib/listings/time";
import { requestNow } from "@/lib/request-time";

type Props = PageProps<"/[locale]/community/t/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  // El título del tema no se pone en <title>: el foro es solo para miembros.
  return { title: (await getDictionary(locale)).community.crumb };
}

export default function TopicPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<SubHero />}>
      <ThreadLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ThreadLoader({ params, searchParams }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();
  return <Thread locale={locale} dict={await getDictionary(locale)} id={id} searchParams={searchParams} />;
}

async function Thread({ locale, dict, id, searchParams }: { locale: Locale; dict: Messages; id: string; searchParams: Props["searchParams"] }) {
  const path = `/${locale}/community/t/${id}`;
  const account = await requireAccount(locale, path);
  const t = dict.community;
  const e = { errors: dict.auth.errors, fe: dict.auth.fieldErrors };
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const [topic, identity, now] = await Promise.all([getTopic(id), myForumIdentity(account.id), requestNow()]);
  const home = { label: dict.nav.home, href: `/${locale}` };
  const forum = { label: t.crumb, href: `/${locale}/community` };

  if (!topic) {
    return (
      <>
        <SubHero crumbs={[home, forum]} title={t.thread.notFoundTitle} />
        <PageBody narrow>
          <div className="card-box flex flex-col items-start gap-3 text-[14px]">
            <p className="text-muted">{t.thread.notFound}</p>
            <Link href={`/${locale}/community`} className="btn btn-gold btn-sm">
              {t.backToForum}
            </Link>
          </div>
        </PageBody>
      </>
    );
  }

  const { rows: posts, total } = await getPosts(topic.id, page);
  const canWrite = account.permissions.includes("content.comment");
  const author = topic.is_mine ? t.byYou : format(t.startedBy, { alias: topic.author_alias ?? t.deletedUser });
  const a = PostAuthor({ locale, t, alias: topic.author_alias, avatar: topic.author_avatar, isMine: topic.is_mine, createdAt: topic.created_at, editedAt: topic.edited_at, now, size: 44 });
  const lockedByMod = topic.hidden && topic.hidden_reason === "moderator";
  const repliesLabel = format(topic.reply_count === 1 ? t.repliesOne : t.replies, { n: topic.reply_count });

  return (
    <>
      <SubHero crumbs={[home, forum, { label: t.categories[topic.category].name, href: `/${locale}/community/${topic.category}` }, { label: topic.title }]}>
        <span className="eyebrow-dark">
          {t.categories[topic.category].name} · {author}
        </span>
        <h1 className="break-words">{topic.title}</h1>
        <p>
          <b>{repliesLabel}</b> · {timeAgo(topic.last_post_at, locale, now)}
          {topic.locked ? ` · 🔒 ${t.locked}` : null}
        </p>
      </SubHero>
      <PageBody>
        <div className="mx-auto flex max-w-[760px] flex-col gap-5">
          {sp.posted ? <Alert tone="success">{t.thread.posted}</Alert> : null}

          <section className="card-box" aria-labelledby="op-title">
            <h3 id="op-title">{t.thread.original}</h3>
            <article className="thread-post">
              {a.avatar}
              <div className="thread-post-body">
                {a.head}
                {topic.hidden ? <HiddenNote reason={topic.hidden_reason} t={t} /> : null}
                <p className={`thread-post-text ${topic.hidden ? "opacity-60" : ""}`}>{topic.body}</p>
                <div className="post-tools">
                  {topic.is_mine && !lockedByMod ? (
                    <Tool label={t.thread.edit}>
                      <EditTopicForm topicId={topic.id} title={topic.title} body={topic.body} t={t} e={e} />
                    </Tool>
                  ) : null}
                  {topic.is_mine || topic.is_moderator ? (
                    <Tool label={t.thread.delete}>
                      <DeleteTopicForm topicId={topic.id} category={topic.category} locale={locale} t={t} e={e} />
                    </Tool>
                  ) : null}
                  {!topic.is_mine && !topic.hidden ? (
                    topic.reported_by_me ? (
                      <span>✓ {t.report.done}</span>
                    ) : (
                      <Tool label={t.report.action}>
                        <ReportForm topicId={topic.id} t={t} e={e} />
                      </Tool>
                    )
                  ) : null}
                  {topic.is_moderator ? (
                    <ModerateButtons topicId={topic.id} actions={[topic.hidden ? "restore" : "hide", topic.locked ? "unlock" : "lock"]} t={t} />
                  ) : null}
                </div>
              </div>
            </article>
          </section>

          <section className="card-box" aria-labelledby="replies-title">
            <h3 id="replies-title">
              {t.thread.replies} <span className="text-[13px] font-semibold text-muted">({topic.reply_count})</span>
            </h3>
            {posts.length ? (
              <div>
                {posts.map((p) => (
                  <ReplyItem key={p.id} post={p} locale={locale} dict={dict} now={now} isModerator={topic.is_moderator} canReport />
                ))}
              </div>
            ) : (
              <p className="text-[13.5px] text-muted">{t.thread.noReplies}</p>
            )}
            <div className="[&_nav]:!text-ink">
              <SimplePagination hrefFor={(p) => `${path}?page=${p}`} page={page} total={total} pageSize={POSTS_PAGE_SIZE} t={dict.move} />
            </div>
          </section>

          <section className="card-box" aria-labelledby="reply-title">
            <h3 id="reply-title">{t.thread.yourReply}</h3>
            {topic.locked ? (
              <p className="text-[13.5px] text-muted">🔒 {t.thread.lockedHint}</p>
            ) : topic.hidden ? (
              <p className="text-[13.5px] text-muted">{t.thread.hiddenNoReplies}</p>
            ) : !canWrite ? (
              <p className="text-[13.5px] text-muted">{t.cannotWrite}</p>
            ) : !identity ? (
              <AliasNotice locale={locale} t={t} next={path} />
            ) : (
              <>
                <p className="mb-3 text-[12.5px] text-muted">{format(t.thread.postingAs, { alias: identity.alias })}</p>
                <ReplyForm topicId={topic.id} t={t} e={e} />
              </>
            )}
          </section>
        </div>
      </PageBody>
    </>
  );
}
