"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { createTopic, deleteTopic, editPost, editTopic, replyToTopic, reportContent, saveForumIdentity } from "@/lib/forum/actions";
import { forumAvatarIds, forumCategories, POST_BODY, reportReasons, suggestAlias, TOPIC_BODY, TOPIC_TITLE, type ForumAvatar, type ForumCategory } from "@/lib/forum/options";
import { Alert, Field, SubmitButton, useAuthForm } from "../auth/form-ui";
import { AnonAvatar } from "./anon-avatar";

type T = Messages["community"];
type Errors = { errors: Messages["auth"]["errors"]; fe: Messages["auth"]["fieldErrors"] };

/** Tras un envío correcto: vacía el formulario o cierra el <details> que lo contiene. */
function useOnSuccess(status: string, form: React.RefObject<HTMLFormElement | null>, mode: "reset" | "close") {
  useEffect(() => {
    if (status !== "success" || !form.current) return;
    if (mode === "reset") form.current.reset();
    else form.current.closest("details")?.removeAttribute("open");
  }, [status, form, mode]);
}

function ErrorAlert({ state, errors }: { state: ReturnType<typeof useAuthForm>["state"]; errors: Errors["errors"] }) {
  return state.status === "error" ? <Alert tone="error">{errors[state.error]}</Alert> : null;
}

// ---------------------------------------------------------------------------
// Perfil del foro: alias + avatar con vista previa

export function IdentityForm({
  locale,
  initial,
  next,
  t,
  e,
  isNew,
}: {
  locale: Locale;
  initial: { alias: string; avatar: ForumAvatar };
  next?: string;
  t: T;
  e: Errors;
  isNew: boolean;
}) {
  const { state, pending, onSubmit, fields } = useAuthForm(saveForumIdentity);
  const [alias, setAlias] = useState(initial.alias);
  const [avatar, setAvatar] = useState<ForumAvatar>(initial.avatar);
  return (
    <form onSubmit={onSubmit} className="card-box flex flex-col gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <ErrorAlert state={state} errors={e.errors} />
      {state.status === "success" ? <Alert tone="success">{t.identity.saved}</Alert> : null}
      <p className="form-section-title">{t.identity.yourAlias}</p>
      <div className="form-row">
        <Field label={t.identity.aliasLabel} htmlFor="alias" full error={fields.alias ? e.fe[fields.alias] : undefined} hint={t.identity.aliasHint}>
          <input
            id="alias"
            name="alias"
            value={alias}
            onChange={(ev) => setAlias(ev.target.value)}
            maxLength={24}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!fields.alias}
            aria-describedby={fields.alias ? "alias-error" : undefined}
          />
        </Field>
      </div>
      <button type="button" className="btn btn-ghost-light btn-sm w-fit" onClick={() => setAlias(suggestAlias(locale))}>
        🔄 {t.identity.regenerate}
      </button>

      <fieldset className="mt-2">
        <legend className="form-section-title">{t.identity.avatarTitle}</legend>
        <p className="picker-caption -mt-1 mb-3">{t.identity.avatarHint}</p>
        <div className="avatar-picker">
          {forumAvatarIds.map((id) => (
            <label key={id} title={t.identity.avatars[id]}>
              <input type="radio" name="avatar" value={id} checked={avatar === id} onChange={() => setAvatar(id)} />
              <AnonAvatar avatar={id} size={52} />
              <span className="sr-only">{t.identity.avatars[id]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="form-section-title mt-2">{t.identity.preview}</p>
      <div className="anon-preview">
        <AnonAvatar avatar={avatar} size={44} />
        <div className="min-w-0">
          <div className="name truncate">{alias || "…"}</div>
          <div className="sub">{format(t.startedBy, { alias: alias || "…" })}</div>
        </div>
      </div>
      <div className="form-actions">
        <SubmitButton pending={pending}>{isNew || next ? t.identity.saveAndGo : t.identity.save}</SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Crear tema con vista previa en vivo

export function TopicForm({
  locale,
  initialCategory,
  identity,
  t,
  e,
}: {
  locale: Locale;
  initialCategory: ForumCategory;
  identity: { alias: string; avatar: ForumAvatar };
  t: T;
  e: Errors;
}) {
  const { state, pending, onSubmit, fields } = useAuthForm(createTopic);
  const [category, setCategory] = useState<ForumCategory>(initialCategory);
  const [title, setTitle] = useState("");
  const err = (k: string) => (fields[k] ? e.fe[fields[k]] : undefined);
  return (
    <div className="registro-layout">
      <form onSubmit={onSubmit} className="card-box flex flex-col gap-4" noValidate>
        <input type="hidden" name="locale" value={locale} />
        <ErrorAlert state={state} errors={e.errors} />
        <div className="form-row">
          <Field label={t.form.category} htmlFor="category" full>
            <select id="category" name="category" value={category} onChange={(ev) => setCategory(ev.target.value as ForumCategory)}>
              {forumCategories.map((c) => (
                <option key={c} value={c}>
                  {t.categories[c].name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.form.title} htmlFor="title" full error={err("title")}>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              placeholder={t.form.titlePlaceholder}
              minLength={TOPIC_TITLE.min}
              maxLength={TOPIC_TITLE.max}
              required
              aria-invalid={!!fields.title}
            />
          </Field>
          <Field label={t.form.body} htmlFor="body" full error={err("body")}>
            <textarea id="body" name="body" rows={9} placeholder={t.form.bodyPlaceholder} minLength={TOPIC_BODY.min} maxLength={TOPIC_BODY.max} required aria-invalid={!!fields.body} />
          </Field>
        </div>
        <p className="form-hint">{t.form.rulesHint}</p>
        <div className="form-actions !justify-start !border-t-0 !pt-0">
          <SubmitButton pending={pending}>{t.form.submit}</SubmitButton>
        </div>
      </form>
      <aside className="registro-summary !text-left">
        <p className="form-section-title">{t.form.preview}</p>
        <div className="topic-list">
          <div className="topic-row">
            <AnonAvatar avatar={identity.avatar} />
            <div className="topic-main">
              <b>{title.trim() || t.form.titlePlaceholder}</b>
              <span>
                {t.categories[category].name} · {format(t.startedBy, { alias: identity.alias })}
              </span>
            </div>
            <div className="topic-meta">
              <b>{format(t.replies, { n: 0 })}</b>
              <span>{t.justNow}</span>
            </div>
          </div>
        </div>
        <p className="form-hint mt-3.5 block">{t.form.previewHint}</p>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Responder

export function ReplyForm({ topicId, t, e }: { topicId: string; t: T; e: Errors }) {
  const { state, pending, onSubmit } = useAuthForm(replyToTopic);
  const form = useRef<HTMLFormElement>(null);
  useOnSuccess(state.status, form, "reset");
  return (
    <form ref={form} onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="topicId" value={topicId} />
      <ErrorAlert state={state} errors={e.errors} />
      <div className="form-field form-field-full">
        <label htmlFor="reply" className="sr-only">
          {t.thread.yourReply}
        </label>
        <textarea id="reply" name="body" rows={5} placeholder={t.thread.replyPlaceholder} maxLength={POST_BODY.max} required />
      </div>
      <div>
        <SubmitButton pending={pending}>{t.thread.postReply}</SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Editar (tema o respuesta) — dentro de un <details>

export function EditTopicForm({ topicId, title, body, t, e }: { topicId: string; title: string; body: string; t: T; e: Errors }) {
  const { state, pending, onSubmit, fields } = useAuthForm(editTopic);
  const form = useRef<HTMLFormElement>(null);
  useOnSuccess(state.status, form, "close");
  return (
    <form ref={form} onSubmit={onSubmit} className="tool-panel w-full" noValidate>
      <input type="hidden" name="topicId" value={topicId} />
      <ErrorAlert state={state} errors={e.errors} />
      <label className="sr-only" htmlFor={`et-${topicId}`}>
        {t.form.title}
      </label>
      <input id={`et-${topicId}`} name="title" defaultValue={title} maxLength={TOPIC_TITLE.max} className="w-full" aria-invalid={!!fields.title} />
      {fields.title ? <p className="form-error">{e.fe[fields.title]}</p> : null}
      <label className="sr-only" htmlFor={`eb-${topicId}`}>
        {t.form.body}
      </label>
      <textarea id={`eb-${topicId}`} name="body" defaultValue={body} rows={7} maxLength={TOPIC_BODY.max} className="w-full" aria-invalid={!!fields.body} />
      {fields.body ? <p className="form-error">{e.fe[fields.body]}</p> : null}
      <SubmitButton pending={pending}>{t.thread.saveEdit}</SubmitButton>
    </form>
  );
}

export function EditPostForm({ postId, body, t, e }: { postId: string; body: string; t: T; e: Errors }) {
  const { state, pending, onSubmit } = useAuthForm(editPost);
  const form = useRef<HTMLFormElement>(null);
  useOnSuccess(state.status, form, "close");
  return (
    <form ref={form} onSubmit={onSubmit} className="tool-panel w-full" noValidate>
      <input type="hidden" name="postId" value={postId} />
      <ErrorAlert state={state} errors={e.errors} />
      <label className="sr-only" htmlFor={`ep-${postId}`}>
        {t.thread.edit}
      </label>
      <textarea id={`ep-${postId}`} name="body" defaultValue={body} rows={5} maxLength={POST_BODY.max} className="w-full" />
      <SubmitButton pending={pending}>{t.thread.saveEdit}</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Denunciar

export function ReportForm({ topicId, postId, t, e }: { topicId?: string; postId?: string; t: T; e: Errors }) {
  const { state, pending, onSubmit } = useAuthForm(reportContent);
  const id = topicId ?? postId;
  if (state.status === "success") return <p className="tool-panel text-[12.5px] font-semibold text-ink">{t.report.thanks}</p>;
  return (
    <form onSubmit={onSubmit} className="tool-panel" noValidate>
      {topicId ? <input type="hidden" name="topicId" value={topicId} /> : null}
      {postId ? <input type="hidden" name="postId" value={postId} /> : null}
      <ErrorAlert state={state} errors={e.errors} />
      <label htmlFor={`rr-${id}`} className="text-[12.5px] font-bold text-ink">
        {t.report.reasonLabel}
      </label>
      <select id={`rr-${id}`} name="reason" defaultValue="spam">
        {reportReasons.map((r) => (
          <option key={r} value={r}>
            {t.report.reasons[r]}
          </option>
        ))}
      </select>
      <label htmlFor={`rn-${id}`} className="sr-only">
        {t.report.noteLabel}
      </label>
      <textarea id={`rn-${id}`} name="note" rows={2} maxLength={500} placeholder={t.report.notePlaceholder} className="w-full" />
      <p className="text-[11.5px]">{t.report.hint}</p>
      <button type="submit" className="btn btn-danger-outline btn-sm" disabled={pending}>
        {t.report.submit}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Borrar tema (con confirmación; el servidor impide borrarlo si ya hay respuestas de otros)

export function DeleteTopicForm({ topicId, category, locale, t, e }: { topicId: string; category: string; locale: Locale; t: T; e: Errors }) {
  const { state, pending, onSubmit } = useAuthForm(deleteTopic);
  return (
    <form onSubmit={onSubmit} className="tool-panel">
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="locale" value={locale} />
      <ErrorAlert state={state} errors={e.errors} />
      <p className="text-[12.5px] text-ink">{t.thread.deleteTopicConfirm}</p>
      <button type="submit" className="btn btn-danger-outline btn-sm" disabled={pending}>
        {t.thread.deleteFinal}
      </button>
    </form>
  );
}
