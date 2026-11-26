import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getAccount } from "@/lib/auth/dal";
import { isNewsEditor } from "@/lib/news/editor";

/** Acceso a la redacción, solo visible para quien forma parte de ella. */
export async function EditorLink({ locale, label, articleId }: { locale: Locale; label: string; articleId?: string }) {
  if (!(await getAccount()) || !(await isNewsEditor())) return null;
  return (
    <Link href={`/${locale}/news/editor${articleId ? `/${articleId}` : ""}`} className="btn btn-ghost mb-[18px] w-full">
      ✏️ {label}
    </Link>
  );
}
