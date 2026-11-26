import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Composer } from "@/components/messages/composer";
import { ConversationList } from "@/components/messages/conversation-list";
import { MessagesFrame } from "@/components/messages/messages-frame";
import { Bubbles, ThreadHead } from "@/components/messages/thread";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import { canMessage, getRecipient, isUuid, listConversations } from "@/lib/messages/queries";

export default function NewMessagePage({ params, searchParams }: PageProps<"/[locale]/messages/new">) {
  return (
    <Suspense fallback={null}>
      <NewMessage params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function NewMessage({ params, searchParams }: { params: PageProps<"/[locale]/messages/new">["params"]; searchParams: PageProps<"/[locale]/messages/new">["searchParams"] }) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.messages;
  const sp = await searchParams;
  const to = typeof sp.to === "string" ? sp.to : undefined;
  const listing = typeof sp.listing === "string" && isUuid(sp.listing) ? sp.listing : undefined;
  const account = await requireAccount(locale, `/${locale}/messages/new${to ? `?to=${to}` : ""}`);
  if (!isUuid(to) || to === account.id) redirect(`/${locale}/messages`);

  const conversations = await listConversations();
  const existing = conversations.find((c) => c.other_id === to);
  if (existing) redirect(`/${locale}/messages/${existing.id}`);

  const [recipient, allowed] = await Promise.all([getRecipient(to), canMessage(to)]);

  return (
    <MessagesFrame locale={locale} dict={dict}>
      <div className="msg-shell has-thread">
        <ConversationList conversations={conversations} locale={locale} t={t} />
        <section className="msg-thread">
          {recipient ? (
            <ThreadHead locale={locale} dict={dict} other={{ id: recipient.id, name: recipient.display_name, avatar: recipient.avatar_path, role: recipient.role }} canBlock={false} />
          ) : null}
          {recipient && allowed ? (
            <>
              <Bubbles locale={locale} dict={dict} messages={[]} viewerId={account.id} empty={t.firstMessage.replace("{name}", recipient.display_name)} />
              <Composer locale={locale} to={to} listing={listing} t={t} errors={dict.auth.errors} />
            </>
          ) : (
            <div className="msg-empty-pane">
              <p className="font-bold text-ink">{t.cannotStartTitle}</p>
              <p>{account.permissions.includes("messages.send") ? t.cannotStart : t.cannotSendRole}</p>
              <Link href={`/${locale}/messages`} className="text-link">← {t.back}</Link>
            </div>
          )}
        </section>
      </div>
    </MessagesFrame>
  );
}
