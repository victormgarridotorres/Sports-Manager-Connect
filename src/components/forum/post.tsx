import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { deletePost, moderate } from "@/lib/forum/actions";
import type { ForumAvatar } from "@/lib/forum/options";
import { timeAgo } from "@/lib/listings/time";
import { AnonAvatar } from "./anon-avatar";
import { EditPostForm, ReportForm } from "./forms";

type Errors = { errors: Messages["auth"]["errors"]; fe: Messages["auth"]["fieldErrors"] };

/** Cabecera de autor: alias (enlace a su perfil del foro), etiqueta de autor del tema y fecha. */
export function PostAuthor({
  locale,
  t,
  alias,
  avatar,
  isOp,
  isMine,
  createdAt,
  editedAt,
  now,
  size = 40,
}: {
  locale: Locale;
  t: Messages["community"];
  alias: string | null;
  avatar: ForumAvatar | null;
  isOp?: boolean;
  isMine?: boolean;
  createdAt: string;
  editedAt: string | null;
  now: Date;
  size?: number;
}) {
  return {
    avatar: <AnonAvatar avatar={avatar} size={size} />,
    head: (
      <>
        {alias ? (
          <Link href={`/${locale}/community/u/${encodeURIComponent(alias)}`} className="font-extrabold hover:underline">
            {alias}
          </Link>
        ) : (
          <b className="text-muted">{t.deletedUser}</b>
        )}
        {isOp ? <span className="op-badge">{t.thread.op}</span> : null}
        {isMine ? <span className="op-badge !bg-paper-soft !text-muted">{t.you}</span> : null}
        <span className="thread-post-meta">
          {timeAgo(createdAt, locale, now)}
          {editedAt ? ` · ${t.thread.edited}` : null}
        </span>
      </>
    ),
  };
}

export function HiddenNote({ reason, t }: { reason: "reports" | "moderator" | null; t: Messages["community"] }) {
  return <p className="thread-post-hidden mb-2">🚫 {reason === "moderator" ? t.thread.hiddenByModerator : t.thread.hiddenByReports}</p>;
}

export function ModerateButtons({ topicId, postId, actions, t }: { topicId?: string; postId?: string; actions: ("hide" | "restore" | "lock" | "unlock")[]; t: Messages["community"] }) {
  return (
    <>
      {actions.map((a) => (
        <form key={a} action={moderate}>
          {topicId ? <input type="hidden" name="topicId" value={topicId} /> : null}
          {postId ? <input type="hidden" name="postId" value={postId} /> : null}
          <input type="hidden" name="action" value={a} />
          <button type="submit" className="link">
            🛡️ {t.moderation[a]}
          </button>
        </form>
      ))}
    </>
  );
}

export function Tool({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details>
      <summary>{label}</summary>
      {children}
    </details>
  );
}

export function ReplyItem({
  post,
  locale,
  dict,
  now,
  isModerator,
  canReport,
}: {
  post: import("@/lib/forum/queries").Post;
  locale: Locale;
  dict: Messages;
  now: Date;
  isModerator: boolean;
  canReport: boolean;
}) {
  const t = dict.community;
  const e: Errors = { errors: dict.auth.errors, fe: dict.auth.fieldErrors };
  const a = PostAuthor({ locale, t, alias: post.author_alias, avatar: post.author_avatar, isOp: post.is_op, isMine: post.is_mine, createdAt: post.created_at, editedAt: post.edited_at, now });
  const lockedByMod = post.hidden && post.hidden_reason === "moderator";
  return (
    <article className="reply-item" id={`post-${post.id}`}>
      {a.avatar}
      <div className="thread-post-body">
        {a.head}
        {post.hidden ? <HiddenNote reason={post.hidden_reason} t={t} /> : null}
        <p className={`thread-post-text ${post.hidden ? "opacity-60" : ""}`}>{post.body}</p>
        <div className="post-tools">
          {post.is_mine && !lockedByMod ? (
            <Tool label={t.thread.edit}>
              <EditPostForm postId={post.id} body={post.body} t={t} e={e} />
            </Tool>
          ) : null}
          {post.is_mine || isModerator ? (
            <Tool label={t.thread.delete}>
              <form action={deletePost} className="tool-panel">
                <input type="hidden" name="postId" value={post.id} />
                <p className="text-[12.5px] text-ink">{t.thread.deletePostConfirm}</p>
                <button type="submit" className="btn btn-danger-outline btn-sm">
                  {t.thread.deleteFinal}
                </button>
              </form>
            </Tool>
          ) : null}
          {!post.is_mine && canReport && !post.hidden ? (
            post.reported_by_me ? (
              <span>✓ {t.report.done}</span>
            ) : (
              <Tool label={t.report.action}>
                <ReportForm postId={post.id} t={t} e={e} />
              </Tool>
            )
          ) : null}
          {isModerator ? <ModerateButtons postId={post.id} actions={[post.hidden ? "restore" : "hide"]} t={t} /> : null}
        </div>
      </div>
    </article>
  );
}
