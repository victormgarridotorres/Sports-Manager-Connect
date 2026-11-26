"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Messages } from "@/i18n/dictionaries/es";
import { sendMessage, type SendState } from "@/lib/messages/actions";
import { ATTACHMENT_MAX_BYTES, attachmentTypes, formatBytes, MESSAGE_MAX_CHARS } from "@/lib/messages/options";

/** Caja de escribir: Intro envía, Mayús+Intro salta de línea; adjunto opcional (PDF/imagen, 5 MB). */
export function Composer({
  locale,
  conversationId,
  to,
  listing,
  t,
  errors,
}: {
  locale: string;
  conversationId?: string;
  to?: string;
  listing?: string;
  t: Messages["messages"];
  errors: Messages["auth"]["errors"];
}) {
  const router = useRouter();
  const [state, dispatch, pending] = useActionState<SendState, FormData>(sendMessage, { status: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Al llegar un envío correcto se quita el adjunto (ajuste de estado durante el render, sin efecto).
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.status === "success") setFile(null);
  }

  useEffect(() => {
    if (state.status !== "success") return;
    if (!conversationId && state.conversationId) {
      router.replace(`/${locale}/messages/${state.conversationId}`);
      return;
    }
    form.current?.reset();
    text.current?.focus();
  }, [state, conversationId, locale, router]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (pending || !form.current) return;
    const fd = new FormData(form.current);
    if (file) fd.set("attachment", file);
    else fd.delete("attachment");
    if (!String(fd.get("body") ?? "").trim() && !file) return;
    startTransition(() => dispatch(fd));
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  function pick(f: File | undefined) {
    setFileError(null);
    if (!f) return;
    if (!(f.type in attachmentTypes)) return setFileError(errors.invalidAttachment);
    if (f.size > ATTACHMENT_MAX_BYTES) return setFileError(errors.attachmentTooLarge);
    setFile(f);
  }

  return (
    <form ref={form} onSubmit={submit} className="flex flex-none flex-col" noValidate>
      {conversationId ? <input type="hidden" name="conversationId" value={conversationId} /> : null}
      {to ? <input type="hidden" name="to" value={to} /> : null}
      {listing ? <input type="hidden" name="listing" value={listing} /> : null}
      {state.status === "error" || fileError ? (
        <p role="alert" className="border-t border-line bg-[#fdf5f4] px-[18px] py-2 text-[12.5px] text-danger">
          {fileError ?? (state.status === "error" ? errors[state.error] : "")}
        </p>
      ) : null}
      {file ? (
        <div className="msg-attach-pending">
          <span aria-hidden>📎</span>
          <span className="min-w-0 flex-1 truncate">
            {file.name} · {formatBytes(file.size, locale)}
          </span>
          <button type="button" className="text-muted hover:text-ink" onClick={() => setFile(null)} aria-label={t.removeAttachment}>
            ✕
          </button>
        </div>
      ) : null}
      <div className="msg-composer">
        <label className="msg-attach-btn" title={t.attach}>
          <span aria-hidden>📎</span>
          <span className="sr-only">{t.attach}</span>
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <textarea ref={text} name="body" rows={1} maxLength={MESSAGE_MAX_CHARS} placeholder={t.placeholder} aria-label={t.placeholder} onKeyDown={onKey} autoFocus={!!to} />
        <button type="submit" className="btn btn-gold" disabled={pending} aria-busy={pending}>
          {pending ? "…" : t.send}
        </button>
      </div>
    </form>
  );
}
