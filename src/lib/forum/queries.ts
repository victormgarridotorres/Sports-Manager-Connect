import "server-only";
import type { Role } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/messages/queries";
import { POSTS_PAGE_SIZE, TOPICS_PAGE_SIZE, type ForumAvatar, type ForumCategory } from "./options";

export type TopicRow = {
  id: string;
  category: ForumCategory;
  title: string;
  excerpt: string;
  author_alias: string | null;
  author_avatar: ForumAvatar | null;
  is_mine: boolean;
  created_at: string;
  last_post_at: string;
  reply_count: number;
  locked: boolean;
  hidden: boolean;
  total_count: number;
};

export type Topic = Omit<TopicRow, "excerpt" | "total_count"> & {
  body: string;
  edited_at: string | null;
  hidden_reason: "reports" | "moderator" | null;
  reported_by_me: boolean;
  can_reply: boolean;
  is_moderator: boolean;
};

export type Post = {
  id: string;
  body: string;
  author_alias: string | null;
  author_avatar: ForumAvatar | null;
  is_mine: boolean;
  is_op: boolean;
  created_at: string;
  edited_at: string | null;
  hidden: boolean;
  hidden_reason: "reports" | "moderator" | null;
  reported_by_me: boolean;
  total_count: number;
};

export type ForumIdentity = { alias: string; avatar: ForumAvatar };

export async function myForumIdentity(userId: string): Promise<ForumIdentity | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("forum_identities").select("alias, avatar").eq("profile_id", userId).maybeSingle();
  return (data as ForumIdentity | null) ?? null;
}

export async function categoryStats(): Promise<Partial<Record<ForumCategory, { topics: number; posts: number }>>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("forum_category_stats");
  if (error) console.error("[forum:stats]", error.code, error.message);
  const out: Partial<Record<ForumCategory, { topics: number; posts: number }>> = {};
  for (const r of (data ?? []) as { category: ForumCategory; topics: number; posts: number }[]) out[r.category] = { topics: Number(r.topics), posts: Number(r.posts) };
  return out;
}

export async function listTopics(opts: { category?: ForumCategory; alias?: string; page?: number; limit?: number }) {
  const supabase = await createClient();
  const limit = opts.limit ?? TOPICS_PAGE_SIZE;
  const { data, error } = await supabase.rpc("forum_list_topics", {
    p_category: opts.category ?? null,
    p_alias: opts.alias ?? null,
    p_limit: limit,
    p_offset: ((opts.page ?? 1) - 1) * limit,
  });
  if (error) console.error("[forum:list]", error.code, error.message);
  const rows = (data ?? []) as TopicRow[];
  return { rows, total: rows[0] ? Number(rows[0].total_count) : 0, error: !!error };
}

export async function getTopic(id: string): Promise<Topic | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("forum_get_topic", { p_id: id });
  if (error) console.error("[forum:topic]", error.code, error.message);
  return ((data ?? []) as Topic[])[0] ?? null;
}

export async function getPosts(topicId: string, page = 1) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("forum_get_posts", { p_topic: topicId, p_limit: POSTS_PAGE_SIZE, p_offset: (page - 1) * POSTS_PAGE_SIZE });
  if (error) console.error("[forum:posts]", error.code, error.message);
  const rows = (data ?? []) as Post[];
  return { rows, total: rows[0] ? Number(rows[0].total_count) : 0 };
}

export type ForumProfile = { alias: string; avatar: ForumAvatar; role: Role; member_since: string; topics: number; replies: number; is_me: boolean };

export async function forumProfile(alias: string): Promise<ForumProfile | null> {
  if (!alias || alias.length > 24) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("forum_profile", { p_alias: alias });
  if (error) console.error("[forum:profile]", error.code, error.message);
  const r = ((data ?? []) as ForumProfile[])[0];
  return r ? { ...r, topics: Number(r.topics), replies: Number(r.replies) } : null;
}

export function pageParam(v: string | string[] | undefined) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}
