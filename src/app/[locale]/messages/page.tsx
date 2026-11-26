import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ConversationList } from "@/components/messages/conversation-list";
import { MessagesFrame } from "@/components/messages/messages-frame";
import { RealtimeSync } from "@/components/messages/realtime-sync";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import { listConversations } from "@/lib/messages/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/messages">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).messages.crumb } : {};
}

export default async function InboxPage({ params }: PageProps<"/[locale]/messages">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <MessagesFrame locale={locale} dict={dict}>
      <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
        <Inbox locale={locale} dict={dict} />
      </Suspense>
    </MessagesFrame>
  );
}

async function Inbox({ locale, dict }: { locale: Locale; dict: Messages }) {
  const account = await requireAccount(locale, `/${locale}/messages`);
  const conversations = await listConversations();
  const t = dict.messages;
  const canSend = account.permissions.includes("messages.send");
  return (
    <div className="msg-shell">
      <RealtimeSync />
      <ConversationList conversations={conversations} locale={locale} t={t} />
      <section className="msg-thread">
        <div className="msg-empty-pane">
          <span aria-hidden className="text-3xl">✉️</span>
          <p className="font-bold text-ink">{conversations.length ? t.pickConversation : t.emptyTitle}</p>
          <p>{canSend ? t.emptyHint : t.cannotSendRole}</p>
          {canSend ? (
            <Link href={`/${locale}/move`} className="btn btn-gold btn-sm mt-2">
              {dict.favorites.goMove}
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
