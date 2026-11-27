import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminBody, AdminFrame, AdminHero } from "@/components/admin/shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { resolveReports } from "@/lib/admin/actions";
import { adminReports } from "@/lib/admin/queries";
import type { ReportReason } from "@/lib/forum/options";

type Props = PageProps<"/[locale]/admin/reports">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: (await getDictionary(locale)).admin.tabs.reports, robots: { index: false } };
}

export default async function ReportsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <>
      <AdminHero locale={locale} dict={dict} current={dict.admin.tabs.reports} />
      <AdminBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <AdminFrame locale={locale} dict={dict} tab="reports" next={`/${locale}/admin/reports`}>
            <Reports locale={locale} dict={dict} searchParams={searchParams} />
          </AdminFrame>
        </Suspense>
      </AdminBody>
    </>
  );
}

async function Reports({ locale, dict, searchParams }: { locale: Locale; dict: Messages; searchParams: Props["searchParams"] }) {
  const t = dict.admin.reports;
  const resolved = (await searchParams).show === "resolved";
  const rows = await adminReports(resolved);
  const base = `/${locale}/admin/reports`;
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[760px] text-[13.5px] text-on-dark">{t.lead}</p>
      <div className="flex gap-2">
        <Link href={base} className={`chip ${!resolved ? "active" : ""}`} aria-current={!resolved ? "page" : undefined}>
          {t.open}
        </Link>
        <Link href={`${base}?show=resolved`} className={`chip ${resolved ? "active" : ""}`} aria-current={resolved ? "page" : undefined}>
          {t.resolved}
        </Link>
      </div>
      {rows.length === 0 ? <div className="card-box text-[14px] text-muted">{resolved ? t.emptyResolved : t.empty}</div> : null}
      {rows.map((r) => (
        <article key={r.topic_id ?? r.post_id} className="card-box flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
            <span className="status-pill">{r.topic_id ? t.kindTopic : t.kindReply}</span>
            {r.hidden ? <span className="status-pill err">{r.hidden_reason === "moderator" ? t.hiddenByMod : t.hiddenAuto}</span> : null}
            <span>{format(r.reports === 1 ? t.countOne : t.count, { n: r.reports })}</span>
            <span>· {r.reasons.map((x) => dict.community.report.reasons[x as ReportReason] ?? x).join(", ")}</span>
          </div>
          <div>
            {r.thread_id ? (
              <Link href={`/${locale}/community/t/${r.thread_id}${r.post_id ? `#post-${r.post_id}` : ""}`} className="font-bold hover:underline">
                {r.thread_title}
              </Link>
            ) : null}
            <p className="mt-1 rounded-[10px] bg-paper-soft p-3 text-[13.5px] whitespace-pre-line text-ink">{r.body}</p>
            <p className="mt-1 text-[12.5px] text-muted">
              {t.author}: <b>{r.author_alias ?? dict.community.deletedUser}</b>
              {r.author_id ? (
                <>
                  {" · "}
                  <Link href={`/${locale}/admin/users/${r.author_id}`} className="font-semibold text-gold-deep">
                    {t.viewAccount}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          {r.notes.length ? (
            <ul className="list-disc pl-5 text-[13px] text-muted">
              {r.notes.map((n, i) => (
                <li key={i}>«{n}»</li>
              ))}
            </ul>
          ) : null}
          {!resolved ? (
            <div className="flex flex-wrap gap-2">
              {(["hide", "dismiss"] as const).map((a) => (
                <form key={a} action={resolveReports}>
                  {r.topic_id ? <input type="hidden" name="topicId" value={r.topic_id} /> : null}
                  {r.post_id ? <input type="hidden" name="postId" value={r.post_id} /> : null}
                  <input type="hidden" name="action" value={a} />
                  <button type="submit" className={`btn btn-sm ${a === "hide" ? "btn-danger-outline" : "btn-ghost-light"}`}>
                    {a === "hide" ? t.hide : t.dismiss}
                  </button>
                </form>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
