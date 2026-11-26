"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Messages } from "@/i18n/dictionaries/es";
import type { ConversationSummary } from "@/lib/messages/queries";
import { Avatar } from "../profile/avatar";
import { LocalTime } from "./local-time";

export function ConversationList({
  conversations,
  activeId,
  locale,
  t,
}: {
  conversations: ConversationSummary[];
  activeId?: string;
  locale: string;
  t: Messages["messages"];
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase(locale);
    return needle ? conversations.filter((c) => c.other_name.toLocaleLowerCase(locale).includes(needle)) : conversations;
  }, [q, conversations, locale]);

  return (
    <aside className="msg-list" aria-label={t.conversations}>
      <div className="msg-list-head">
        <h3>{t.conversations}</h3>
        <input className="msg-search-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPlaceholder} aria-label={t.searchPlaceholder} />
      </div>
      {conversations.length === 0 ? (
        <p className="px-[18px] py-4 text-[12.5px] text-muted">{t.noConversations}</p>
      ) : shown.length === 0 ? (
        <p className="px-[18px] py-4 text-[12.5px] text-muted">{t.noMatches}</p>
      ) : (
        <nav>
          {shown.map((c) => (
            <Link
              key={c.id}
              href={`/${locale}/messages/${c.id}`}
              className={`msg-conv ${c.id === activeId ? "active" : ""} ${c.unread ? "unread" : ""}`}
              aria-current={c.id === activeId ? "page" : undefined}
            >
              <Avatar path={c.other_avatar} name={c.other_name} size={42} className="rounded-full" />
              <div className="msg-conv-body">
                <div className="msg-conv-top">
                  <b>{c.other_name}</b>
                  <span className="msg-conv-time">
                    <LocalTime iso={c.last_message_at} locale={locale} mode="list" labels={t.time} />
                  </span>
                </div>
                <p>
                  {c.blocked ? `🚫 ${t.blockedShort}` : c.preview ? `${c.last_from_me ? `${t.you}: ` : ""}${c.preview}` : t.noMessagesYet}
                </p>
              </div>
              {c.unread ? <span className="msg-unread-dot" aria-label={t.unread} /> : null}
            </Link>
          ))}
        </nav>
      )}
    </aside>
  );
}
