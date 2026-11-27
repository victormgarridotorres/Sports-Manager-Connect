import "server-only";
import type { Role, VerificationStatus } from "@/lib/auth/permissions";
import type { ProfessionalType } from "@/lib/profile/options";
import { createClient } from "@/lib/supabase/server";

export type AdminStats = Record<
  | "users" | "fans" | "players" | "professionals" | "clubs" | "pending_verifications" | "suspended" | "open_reports"
  | "hidden_content" | "news_drafts" | "listings_active" | "signups_7d" | "messages_7d" | "forum_posts_7d",
  number
>;

export type AdminUserRow = {
  id: string; display_name: string; email: string | null; role: Role; country: string | null;
  verification_status: VerificationStatus; suspended: boolean; created_at: string; last_sign_in_at: string | null;
  is_admin: boolean; is_editor: boolean; is_moderator: boolean; total_count: number;
};

export type AdminUser = {
  id: string; display_name: string; email: string | null; email_confirmed: boolean; role: Role; country: string | null; city: string | null;
  visibility: "public" | "verified_only"; verification_status: VerificationStatus; verification_note: string | null;
  suspended_at: string | null; suspension_reason: string | null; created_at: string; last_sign_in_at: string | null;
  is_admin: boolean; is_editor: boolean; is_moderator: boolean; forum_alias: string | null;
  listings: number; forum_posts: number; messages_sent: number; reports_received: number;
  club_name: string | null; club_league: string | null; club_website: string | null; club_founded: number | null;
  professional_type: ProfessionalType | null; current_entity: string | null; years_experience: number | null;
};

export type AdminReport = {
  topic_id: string | null; post_id: string | null; thread_id: string | null; thread_title: string | null; body: string | null;
  author_id: string | null; author_alias: string | null; hidden: boolean; hidden_reason: string | null;
  reports: number; reasons: string[]; notes: string[]; last_reported_at: string;
};

export type AdminLogEntry = { id: number; actor_name: string | null; action: string; target_id: string | null; target_name: string | null; details: Record<string, unknown>; created_at: string };

export const ADMIN_PAGE_SIZE = 30;
export const userFilters = ["pending", "verified", "rejected", "suspended", "staff"] as const;
export type UserFilter = (typeof userFilters)[number];

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) console.error(`[admin:${fn}]`, error.code, error.message);
  return (data ?? []) as T[];
}

export async function adminStats(): Promise<AdminStats | null> {
  const r = (await rpc<Record<string, number | string>>("admin_stats"))[0];
  return r ? (Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)])) as AdminStats) : null;
}

export async function adminUsers(o: { q?: string; role?: Role; filter?: UserFilter; page?: number; limit?: number }) {
  const limit = o.limit ?? ADMIN_PAGE_SIZE;
  const rows = await rpc<AdminUserRow>("admin_users", {
    p_query: o.q ?? null,
    p_role: o.role ?? null,
    p_filter: o.filter ?? null,
    p_limit: limit,
    p_offset: ((o.page ?? 1) - 1) * limit,
  });
  return { rows, total: rows[0] ? Number(rows[0].total_count) : 0 };
}

export async function adminUser(id: string): Promise<AdminUser | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const r = (await rpc<AdminUser>("admin_user", { p_id: id }))[0];
  return r ? { ...r, listings: Number(r.listings), forum_posts: Number(r.forum_posts), messages_sent: Number(r.messages_sent), reports_received: Number(r.reports_received) } : null;
}

export async function adminReports(resolved = false) {
  return (await rpc<AdminReport>("admin_reports", { p_resolved: resolved, p_limit: 100 })).map((r) => ({ ...r, reports: Number(r.reports) }));
}

export async function adminLog(target?: string, limit = 100) {
  return rpc<AdminLogEntry>("admin_log_list", { p_target: target ?? null, p_limit: limit });
}
