"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { localeNames, locales, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { changeEmail, changePassword, deleteAccount, savePreferences } from "@/lib/profile/account-actions";
import { visibilities, type Visibility } from "@/lib/profile/options";
import { Alert, Field, SubmitButton, useAuthForm } from "../auth/form-ui";

type T = {
  a: Messages["account"];
  p: Messages["profile"];
  o: Messages["options"];
  errors: Messages["auth"]["errors"];
  fe: Messages["auth"]["fieldErrors"];
  passwordHint: string;
};

function Status({ state, t, success }: { state: ReturnType<typeof useAuthForm>["state"]; t: T; success: string }) {
  if (state.status === "error") return <Alert tone="error">{t.errors[state.error]}</Alert>;
  if (state.status === "success") return <Alert tone="success">{success}</Alert>;
  return null;
}

function SavedInner({ text }: { text: string }) {
  return useSearchParams().get("saved") === "1" ? <Alert tone="success">{text}</Alert> : null;
}

export function PreferencesForm({
  locale,
  current,
  t,
}: {
  locale: Locale;
  current: { preferredLocale: string; visibility: Visibility; marketing: boolean };
  t: T;
}) {
  const { state, pending, onSubmit } = useAuthForm(savePreferences);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {state.status === "idle" ? (
        <Suspense>
          <SavedInner text={t.p.saved} />
        </Suspense>
      ) : (
        <Status state={state} t={t} success={t.p.saved} />
      )}
      <Field label={t.a.preferredLanguage} htmlFor="preferredLocale" hint={t.a.preferredLanguageHint}>
        <select id="preferredLocale" name="preferredLocale" defaultValue={current.preferredLocale}>
          {locales.map((l) => (
            <option key={l} value={l} lang={l}>
              {localeNames[l]}
            </option>
          ))}
        </select>
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[12px] font-bold text-muted">{t.a.visibilityTitle}</legend>
        {visibilities.map((v) => (
          <label key={v} className="form-check">
            <input type="radio" name="visibility" value={v} defaultChecked={current.visibility === v} />
            <span>
              <b className="text-ink">{t.o.visibility[v]}</b> — {t.a.visibilityHelp[v]}
            </span>
          </label>
        ))}
      </fieldset>
      <label className="form-check">
        <input type="checkbox" name="marketing" defaultChecked={current.marketing} />
        <span>{t.a.marketing}</span>
      </label>
      <div className="flex justify-end border-t border-line pt-4">
        <SubmitButton pending={pending}>{t.p.save}</SubmitButton>
      </div>
    </form>
  );
}

export function EmailForm({ locale, email, t }: { locale: Locale; email: string; t: T }) {
  const { state, pending, onSubmit, fields } = useAuthForm(changeEmail);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Status state={state} t={t} success={t.a.emailSent} />
      <p className="text-[13.5px] text-muted">
        {t.a.currentEmail}: <b className="text-ink">{email}</b>
      </p>
      <Field label={t.a.newEmail} htmlFor="email" error={fields.email && t.fe[fields.email]} hint={t.a.newEmailHint}>
        <input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fields.email} />
      </Field>
      <div className="flex justify-end border-t border-line pt-4">
        <SubmitButton pending={pending}>{t.a.changeEmail}</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm({ t }: { t: T }) {
  const { state, pending, onSubmit, fields } = useAuthForm(changePassword);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Status state={state} t={t} success={t.a.passwordChanged} />
      <div className="form-row">
        <Field label={t.a.currentPassword} htmlFor="current" error={fields.current && t.fe[fields.current]} full>
          <input id="current" name="current" type="password" autoComplete="current-password" required aria-invalid={!!fields.current} />
        </Field>
        <Field label={t.a.newPassword} htmlFor="password" error={fields.password && t.fe[fields.password]} hint={t.passwordHint}>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required aria-invalid={!!fields.password} />
        </Field>
        <Field label={t.a.confirmPassword} htmlFor="confirm" error={fields.confirm && t.errors.passwordMismatch}>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!fields.confirm} />
        </Field>
      </div>
      <div className="flex justify-end border-t border-line pt-4">
        <SubmitButton pending={pending}>{t.a.updatePassword}</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteAccountForm({ locale, t }: { locale: Locale; t: T }) {
  const [open, setOpen] = useState(false);
  const { state, pending, onSubmit, fields } = useAuthForm(deleteAccount);
  if (!open) {
    return (
      <button type="button" className="btn btn-danger-outline self-start" onClick={() => setOpen(true)}>
        {t.a.deleteButton}
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-[10px] border border-[#e0b4ac] bg-white p-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <p className="text-[13.5px] text-ink">{t.a.deleteConfirm}</p>
      <Status state={state} t={t} success="" />
      <Field label={t.a.currentPassword} htmlFor="delete-current" error={fields.current && t.fe[fields.current]}>
        <input id="delete-current" name="current" type="password" autoComplete="current-password" required aria-invalid={!!fields.current} />
      </Field>
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" className="btn btn-danger-outline" disabled={pending}>
          {pending ? "…" : t.a.deleteFinal}
        </button>
        <button type="button" className="btn btn-ghost-light" onClick={() => setOpen(false)}>
          {t.a.cancel}
        </button>
      </div>
    </form>
  );
}
