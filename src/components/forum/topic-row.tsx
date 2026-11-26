import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import type { TopicRow } from "@/lib/forum/queries";
import { timeAgo } from "@/lib/listings/time";
import { AnonAvatar } from "./anon-avatar";

export function TopicRowLink({ row, locale, dict, now, showCategory = true }: { row: TopicRow; locale: Locale; dict: Messages; now: Date; showCategory?: boolean }) {
  const t = dict.community;
  const author = row.is_mine ? t.byYou : format(t.startedBy, { alias: row.author_alias ?? t.deletedUser });
  return (
    <Link className="topic-row" href={`/${locale}/community/t/${row.id}`}>
      <AnonAvatar avatar={row.author_avatar} />
      <div className="topic-main">
        <b>
          {row.title}
          {row.locked ? <span className="topic-flag">🔒 {t.locked}</span> : null}
          {row.hidden ? <span className="topic-flag warn">{t.hiddenFlag}</span> : null}
        </b>
        <span>{showCategory ? `${t.categories[row.category].name} · ${author}` : author}</span>
      </div>
      <div className="topic-meta">
        <b>{format(row.reply_count === 1 ? t.repliesOne : t.replies, { n: row.reply_count })}</b>
        <span>{timeAgo(row.last_post_at, locale, now)}</span>
      </div>
    </Link>
  );
}

export function TopicList({ rows, locale, dict, now, showCategory, empty }: { rows: TopicRow[]; locale: Locale; dict: Messages; now: Date; showCategory?: boolean; empty: string }) {
  if (!rows.length) return <div className="card-box text-center text-[14px] text-muted">{empty}</div>;
  return (
    <div className="topic-list">
      {rows.map((r) => (
        <TopicRowLink key={r.id} row={r} locale={locale} dict={dict} now={now} showCategory={showCategory} />
      ))}
    </div>
  );
}
