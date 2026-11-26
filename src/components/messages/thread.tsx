import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Messages as Dict } from "@/i18n/dictionaries/es";
import type { Role } from "@/lib/auth/permissions";
import { setBlocked } from "@/lib/messages/actions";
import { format } from "@/i18n/format";
import { formatBytes } from "@/lib/messages/options";
import type { Message } from "@/lib/messages/queries";
import { Avatar } from "../profile/avatar";
import { LocalTime } from "./local-time";
import { ScrollBottom } from "./scroll-bottom";

export function ThreadHead({
  locale,
  dict,
  other,
  listing,
  blockedByMe,
  canBlock,
}: {
  locale: Locale;
  dict: Dict;
  other: { id: string; name: string; avatar: string | null; role: Role };
  listing?: { id: string; title: string | null } | null;
  blockedByMe?: boolean;
  canBlock: boolean;
}) {
  const t = dict.messages;
  return (
    <div className="msg-thread-head">
      <Link href={`/${locale}/messages`} className="text-xl leading-none text-ink md:hidden" aria-label={t.back}>
        ‹
      </Link>
      <Avatar path={other.avatar} name={other.name} size={38} className="rounded-full" />
      <div className="min-w-0 flex-1">
        <b className="truncate">{other.name}</b>
        <span className="sub">{dict.roles[other.role].name}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {listing ? (
          <Link href={`/${locale}/listings/${listing.id}`} className="btn btn-ghost-light btn-sm" title={listing.title ?? undefined}>
            📋 {t.viewListing}
          </Link>
        ) : null}
        <Link href={`/${locale}/p/${other.id}`} className="btn btn-ghost-light btn-sm">
          {t.viewProfile}
        </Link>
        {canBlock && blockedByMe ? (
          <form action={setBlocked}>
            <input type="hidden" name="userId" value={other.id} />
            <input type="hidden" name="block" value="0" />
            <button type="submit" className="btn btn-ghost-light btn-sm">
              {t.unblock}
            </button>
          </form>
        ) : canBlock ? (
          <details className="relative">
            <summary className="btn btn-danger-outline btn-sm list-none [&::-webkit-details-marker]:hidden">{t.block}</summary>
            <form action={setBlocked} className="absolute right-0 top-full z-20 mt-2 flex w-64 max-w-[80vw] flex-col items-start gap-2 rounded-[10px] border border-[#e0b4ac] bg-[#fdf5f4] p-3 shadow-lg">
              <input type="hidden" name="userId" value={other.id} />
              <input type="hidden" name="block" value="1" />
              <p className="text-[13px] font-normal">{format(t.blockConfirm, { name: other.name })}</p>
              <button type="submit" className="btn btn-danger-outline btn-sm">
                {t.blockFinal}
              </button>
            </form>
          </details>
        ) : null}
      </div>
    </div>
  );
}

export function Bubbles({ locale, dict, messages, viewerId, empty }: { locale: Locale; dict: Dict; messages: Message[]; viewerId: string; empty?: ReactNode }) {
  const t = dict.messages;
  const day = (iso: string) => iso.slice(0, 10);
  return (
    <ScrollBottom count={messages.length}>
      {messages.length === 0 ? (
        <div className="msg-empty-pane">{empty ?? t.noMessagesYet}</div>
      ) : (
        messages.map((m, i) => (
          <div key={m.id} className="contents">
            {i === 0 || day(messages[i - 1]!.created_at) !== day(m.created_at) ? (
              <span className="msg-day">
                <LocalTime iso={m.created_at} locale={locale} mode="day" labels={t.time} />
              </span>
            ) : null}
            <div className={`msg-bubble ${m.sender_id === viewerId ? "sent" : "received"}`}>
              {m.attachment ? (
                m.attachment.url ? (
                  <a href={m.attachment.url} target="_blank" rel="noopener noreferrer" className="msg-attachment" download={m.attachment.name}>
                    <span aria-hidden>{m.attachment.type === "application/pdf" ? "📄" : "🖼️"}</span>
                    <span className="min-w-0">
                      <span className="msg-attachment-name">{m.attachment.name}</span>
                      <span className="msg-attachment-size">{formatBytes(m.attachment.size, locale)}</span>
                    </span>
                  </a>
                ) : (
                  <span className="msg-attachment opacity-70">📎 {m.attachment.name}</span>
                )
              ) : null}
              {m.body ? <p>{m.body}</p> : null}
              <span className="msg-bubble-time">
                <LocalTime iso={m.created_at} locale={locale} mode="bubble" labels={t.time} />
              </span>
            </div>
          </div>
        ))
      )}
    </ScrollBottom>
  );
}
