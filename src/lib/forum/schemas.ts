import { z } from "zod";
import { ALIAS_RE, forumAvatarIds, forumCategories, POST_BODY, reportReasons, TOPIC_BODY, TOPIC_TITLE } from "./options";

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

export const identitySchema = z.object({
  alias: z.string().trim().regex(ALIAS_RE),
  avatar: z.enum(forumAvatarIds as [string, ...string[]]),
});

export const topicSchema = z.object({
  category: z.enum(forumCategories),
  title: trimmed(TOPIC_TITLE.min, TOPIC_TITLE.max),
  body: trimmed(TOPIC_BODY.min, TOPIC_BODY.max),
});

export const replySchema = z.object({ topicId: z.guid(), body: trimmed(POST_BODY.min, POST_BODY.max) });
export const editPostSchema = z.object({ postId: z.guid(), body: trimmed(POST_BODY.min, POST_BODY.max) });
export const editTopicSchema = topicSchema.omit({ category: true }).extend({ topicId: z.guid() });

export const reportSchema = z
  .object({
    topicId: z.guid().optional(),
    postId: z.guid().optional(),
    reason: z.enum(reportReasons),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => !!v.topicId !== !!v.postId);

export const moderateSchema = z
  .object({
    action: z.enum(["hide", "restore", "lock", "unlock"]),
    topicId: z.guid().optional(),
    postId: z.guid().optional(),
  })
  .refine((v) => !!v.topicId !== !!v.postId);
