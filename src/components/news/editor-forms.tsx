"use client";

import { useActionState, useState, startTransition, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { importNews, saveArticle, saveSource, testSource, type ImportState } from "@/lib/news/actions";
import type { EditorArticle, NewsSource } from "@/lib/news/editor";
import { newsLanguages, newsSections, SUMMARY_MAX } from "@/lib/news/options";
import { Alert, Field, SubmitButton, useAuthForm } from "../auth/form-ui";

type T = Messages["news"]["editor"];
type Shared = { t: T; sections: Messages["news"]["sections"]; errors: Messages["auth"]["errors"]; fe: Messages["auth"]["fieldErrors"] };
type Option = { code: string; name: string };

// ---------------------------------------------------------------------------
// Importar ahora (todas las fuentes activas o una)

export function ImportButton({ t, errors, sourceId, label }: { t: T; errors: Messages["auth"]["errors"]; sourceId?: string; label?: string }) {
  const [state, dispatch, pending] = useActionState<ImportState, FormData>(importNews, { status: "idle" });
  return (
    <form action={dispatch} className="flex flex-col gap-2">
      {sourceId ? <input type="hidden" name="sourceId" value={sourceId} /> : null}
      <button type="submit" className="btn btn-gold btn-sm" disabled={pending} aria-busy={pending}>
        {pending ? t.importing : (label ?? `⬇️ ${t.importNow}`)}
      </button>
      {state.status === "success" ? (
        <p role="status" className="text-[12.5px] text-on-dark">
          {format(t.imported, { n: state.imported ?? 0 })}
          {state.failed?.length ? ` ${format(t.importFailed, { names: state.failed.join(", ") })}` : ""}
        </p>
      ) : state.status === "error" ? (
        <p role="alert" className="text-[12.5px] text-[#f3b5ab]">
          {errors[state.error]}
        </p>
      ) : null}
    </form>
  );
}

export function TestSourceButton({ sourceId, t, errors }: { sourceId: string; t: T; errors: Messages["auth"]["errors"] }) {
  const [state, dispatch, pending] = useActionState<ImportState, FormData>(testSource, { status: "idle" });
  return (
    <form action={dispatch}>
      <input type="hidden" name="sourceId" value={sourceId} />
      <button type="submit" className="btn btn-ghost-light btn-sm" disabled={pending} aria-busy={pending}>
        {pending ? "…" : `🧪 ${t.test}`}
      </button>
      {state.status === "success" ? (
        <div role="status" className="mt-2 rounded-[10px] bg-[#e7f6ec] p-3 text-[12.5px] text-[#1f5c33]">
          <b>{format(t.testOk, { n: state.imported ?? 0 })}</b>
          <ul className="mt-1 list-disc pl-4">
            {state.preview?.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : state.status === "error" ? (
        <p role="alert" className="mt-2 rounded-[10px] bg-[#fdf5f4] p-3 text-[12.5px] text-danger">
          {errors[state.error]} {state.failed?.[0] ? `(${state.failed[0]})` : ""}
        </p>
      ) : null}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Fuente RSS (alta / edición)

export function SourceForm({ source, countries, s }: { source?: NewsSource; countries: Option[]; s: Shared }) {
  const { state, pending, onSubmit, fields } = useAuthForm(saveSource);
  const err = (k: string) => (fields[k] ? s.fe[fields[k]] : undefined);
  const id = source?.id ?? "new";
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      {source ? <input type="hidden" name="id" value={source.id} /> : null}
      {state.status === "error" ? <Alert tone="error">{s.errors[state.error]}</Alert> : null}
      {state.status === "success" && !source ? <Alert tone="success">{s.t.sourceSaved}</Alert> : null}
      <div className="form-row">
        <Field label={s.t.sourceName} htmlFor={`sn-${id}`} error={err("name")}>
          <input id={`sn-${id}`} name="name" defaultValue={source?.name} maxLength={80} required />
        </Field>
        <Field label={s.t.feedUrl} htmlFor={`sf-${id}`} error={err("feed_url")} hint={s.t.feedUrlHint}>
          <input id={`sf-${id}`} name="feed_url" type="url" defaultValue={source?.feed_url} maxLength={500} required placeholder="https://…/feed/" />
        </Field>
        <Field label={s.t.siteUrl} htmlFor={`ss-${id}`} error={err("site_url")}>
          <input id={`ss-${id}`} name="site_url" type="url" defaultValue={source?.site_url ?? ""} maxLength={500} placeholder="https://…" />
        </Field>
        <Field label={s.t.language} htmlFor={`sl-${id}`}>
          <select id={`sl-${id}`} name="language" defaultValue={source?.language ?? "es"}>
            {newsLanguages.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>
        <Field label={s.t.country} htmlFor={`sc-${id}`}>
          <select id={`sc-${id}`} name="country" defaultValue={source?.country ?? ""}>
            <option value="">🌍 {s.t.global}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={s.t.defaultSection} htmlFor={`sd-${id}`}>
          <select id={`sd-${id}`} name="default_section" defaultValue={source?.default_section ?? "other"}>
            {newsSections.map((x) => (
              <option key={x} value={x}>
                {s.sections[x]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div>
        <SubmitButton pending={pending}>{source ? s.t.save : s.t.addSource}</SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Noticia: revisar un borrador importado o escribir una propia

export function ArticleForm({ locale, article, countries, s }: { locale: Locale; article?: EditorArticle; countries: Option[]; s: Shared }) {
  const [state, dispatch, busy] = useActionState(saveArticle, { status: "idle" });
  const [summary, setSummary] = useState(article?.summary ?? "");
  const t = s.t;
  const fields = state.status === "error" ? (state.fields ?? {}) : {};
  const err = (k: string) => (fields[k] ? s.fe[fields[k]] : undefined);
  const isPublished = article?.status === "published";

  // Varios botones de envío: el que se pulsa decide (borrador, publicar, retirar, descartar).
  // Se envía a mano para que React no vacíe el formulario si hay un error.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    fd.set("intent", submitter?.value ?? "draft");
    startTransition(() => dispatch(fd));
  }

  return (
    <form onSubmit={onSubmit} className="card-box flex flex-col gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {article ? <input type="hidden" name="id" value={article.id} /> : null}
      {state.status === "error" ? <Alert tone="error">{s.errors[state.error]}</Alert> : null}

      {article?.source_url ? (
        <div className="news-source-box !mt-0">
          <span>
            {t.fromSource} <b className="text-ink">{article.source_name}</b>
          </span>
          <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-light btn-sm">
            {t.openOriginal} ↗
          </a>
        </div>
      ) : null}

      <div className="form-row">
        <Field label={t.fieldTitle} htmlFor="title" full error={err("title")}>
          <input id="title" name="title" defaultValue={article?.title} maxLength={200} required />
        </Field>
        <Field label={t.section} htmlFor="section">
          <select id="section" name="section" defaultValue={article?.section ?? "other"}>
            {newsSections.map((x) => (
              <option key={x} value={x}>
                {s.sections[x]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.competition} htmlFor="competition" hint={t.competitionHint}>
          <input id="competition" name="competition" defaultValue={article?.competition ?? ""} maxLength={60} placeholder="Liga ASOBAL, EHF Champions League…" />
        </Field>
        <Field label={t.country} htmlFor="country">
          <select id="country" name="country" defaultValue={article?.country ?? ""}>
            <option value="">🌍 {t.global}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.language} htmlFor="language">
          <select id="language" name="language" defaultValue={article?.language ?? locale}>
            {newsLanguages.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.summary} htmlFor="summary" full error={err("summary")} hint={article?.source_url ? t.summaryHintSource : t.summaryHint}>
          <textarea id="summary" name="summary" rows={4} maxLength={SUMMARY_MAX} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </Field>
        <p className="-mt-2 text-right text-[11.5px] text-muted sm:col-span-2">
          {summary.length}/{SUMMARY_MAX}
        </p>
        <Field label={t.body} htmlFor="body" full error={err("body")} hint={article?.source_url ? t.bodyHintSource : t.bodyHint}>
          <textarea id="body" name="body" rows={article?.source_url ? 4 : 12} defaultValue={article?.body ?? ""} />
        </Field>
        <Field label={t.author} htmlFor="author_name">
          <input id="author_name" name="author_name" defaultValue={article?.author_name ?? ""} maxLength={80} placeholder={t.newsroom} />
        </Field>
      </div>

      <div className="form-actions !justify-start flex-wrap">
        <button type="submit" name="intent" value="publish" className="btn btn-gold" disabled={busy}>
          {isPublished ? t.saveChanges : `✓ ${t.publish}`}
        </button>
        {isPublished ? (
          <button type="submit" name="intent" value="unpublish" className="btn btn-ghost-light" disabled={busy}>
            {t.unpublish}
          </button>
        ) : (
          <button type="submit" name="intent" value="draft" className="btn btn-ghost-light" disabled={busy}>
            {t.saveDraft}
          </button>
        )}
        {article && article.status !== "discarded" && !isPublished ? (
          <button type="submit" name="intent" value="discard" className="btn btn-danger-outline" disabled={busy}>
            {t.discard}
          </button>
        ) : null}
        {busy ? <span className="self-center text-[13px] text-muted">…</span> : null}
      </div>
    </form>
  );
}
