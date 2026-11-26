import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Composer } from "@/components/messages/composer";
import { ConversationList } from "@/components/messages/conversation-list";
import { MessagesFrame } from "@/components/messages/messages-frame";
import { RealtimeSync } from "@/components/messages/realtime-sync";
import { Bubbles, ThreadHead } from "@/components/messages/thread";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import { getMessages, isUuid, listConversations, messagePrefs } from "@/lib/messages/queries";

export default function ConversationPage({ params }: PageProps<"/[locale]/messages/[id]">) {
  return (
    <Suspense fallback={null}>
      <Conversation params={params} />
    </Suspense>
  );
}

async function Conversation({ params }: { params: PageProps<"/[locale]/messages/[id]">["params"] }) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const account = await requireAccount(locale, `/${locale}/messages/${id}`);
  const conversations = await listConversations();
  const conv = isUuid(id) ? conversations.find((c) => c.id === id) : undefined;
  if (!conv) redirect(`/${locale}/messages`);
  const [messages, prefs] = await Promise.all([getMessages(conv.id), messagePrefs(account.id)]);
  const blockedByMe = prefs.blocked.some((b) => b.id === conv.other_id);
  const t = dict.messages;
  const canSend = account.permissions.includes("messages.send");

  return (
    <MessagesFrame locale={locale} dict={dict}>
      <div className="msg-shell has-thread">
        <RealtimeSync conversationId={conv.id} />
        <ConversationList conversations={conversations} activeId={conv.id} locale={locale} t={t} />
        <section className="msg-thread" aria-label={conv.other_name}>
          <ThreadHead
            locale={locale}
            dict={dict}
            other={{ id: conv.other_id, name: conv.other_name, avatar: conv.other_avatar, role: conv.other_role }}
            listing={conv.listing_id ? { id: conv.listing_id, title: conv.listing_title } : null}
            blockedByMe={blockedByMe}
            canBlock
          />
          <Bubbles locale={locale} dict={dict} messages={messages} viewerId={account.id} />
          {conv.blocked ? (
            <p className="border-t border-line bg-paper-soft px-5 py-3.5 text-[13px] text-muted">
              {blockedByMe ? t.youBlocked.replace("{name}", conv.other_name) : t.cannotSendHere}
            </p>
          ) : canSend ? (
            <Composer locale={locale} conversationId={conv.id} t={t} errors={dict.auth.errors} />
          ) : (
            <p className="border-t border-line bg-paper-soft px-5 py-3.5 text-[13px] text-muted">{t.cannotSendRole}</p>
          )}
        </section>
      </div>
    </MessagesFrame>
  );
}
