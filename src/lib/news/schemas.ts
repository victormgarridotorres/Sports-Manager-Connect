import { z } from "zod";
import { BODY_MAX, newsLanguages, newsSections, SUMMARY_MAX } from "./options";

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const articleSchema = z.object({
  id: z.guid().optional(),
  intent: z.enum(["draft", "publish", "discard", "unpublish"]),
  section: z.enum(newsSections),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional()
    .transform((v) => v ?? null),
  competition: opt(60),
  language: z.enum(newsLanguages),
  title: z.string().trim().min(5).max(200),
  summary: opt(SUMMARY_MAX),
  body: opt(BODY_MAX),
  author_name: opt(80),
});

export const sourceSchema = z.object({
  id: z.guid().optional(),
  name: z.string().trim().min(2).max(80),
  feed_url: z.url({ protocol: /^https?$/ }).max(500),
  site_url: z
    .url({ protocol: /^https?$/ })
    .max(500)
    .optional()
    .transform((v) => v ?? null),
  language: z.enum(newsLanguages),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional()
    .transform((v) => v ?? null),
  default_section: z.enum(newsSections),
});
