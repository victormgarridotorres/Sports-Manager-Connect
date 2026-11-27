import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import type { AdminLogEntry } from "@/lib/admin/queries";

function describe(e: AdminLogEntry, dict: Messages) {
  const t = dict.admin.log;
  const d = e.details as Record<string, string | boolean | null>;
  switch (e.action) {
    case "verification":
      return `${t.verification}: ${dict.verification[(d.to as keyof Messages["verification"]) ?? "pending"]}${d.note ? ` — «${d.note}»` : ""}`;
    case "suspend":
      return `${t.suspend}${d.reason ? ` — «${d.reason}»` : ""}`;
    case "unsuspend":
      return t.unsuspend;
    case "staff":
      return `${d.on ? t.staffOn : t.staffOff}: ${dict.admin.staff.roles[(d.role as "admin" | "editor" | "moderator") ?? "admin"]}`;
    case "report_hide":
      return t.reportHide;
    case "report_dismiss":
      return t.reportDismiss;
    default:
      return e.action;
  }
}

export function LogList({ entries, locale, dict }: { entries: AdminLogEntry[]; locale: Locale; dict: Messages }) {
  if (!entries.length) return <p className="py-2 text-[13.5px] text-muted">{dict.admin.log.empty}</p>;
  return (
    <ul className="flex flex-col">
      {entries.map((e) => (
        <li key={e.id} className="editor-row !items-center">
          <div className="min-w-0 flex-1">
            <p className="!text-[13.5px] !text-ink">
              <b>{e.actor_name ?? "—"}</b> · {describe(e, dict)}
              {e.target_name && e.target_id ? (
                <>
                  {" · "}
                  <Link href={`/${locale}/admin/users/${e.target_id}`} className="font-semibold text-gold-deep hover:underline">
                    {e.target_name}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <time dateTime={e.created_at} className="flex-none text-[12px] text-muted">
            {new Date(e.created_at).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}
          </time>
        </li>
      ))}
    </ul>
  );
}
