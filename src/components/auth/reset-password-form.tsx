"use client";

import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { updatePassword } from "@/lib/auth/actions";
import { Alert, Field, SubmitButton, useAuthForm } from "./form-ui";

export function ResetPasswordForm({ locale, t }: { locale: Locale; t: Messages["auth"] }) {
  const { state, pending, onSubmit, fields } = useAuthForm(updatePassword);

  return (
    <form onSubmit={onSubmit} className="card-box flex flex-col gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {state.status === "error" ? <Alert tone="error">{t.errors[state.error]}</Alert> : null}
      <Field label={t.reset.newPassword} htmlFor="password" error={fields.password && t.fieldErrors.password} hint={t.passwordHint}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          required
          aria-invalid={!!fields.password}
        />
      </Field>
      <SubmitButton pending={pending}>{t.reset.submit}</SubmitButton>
    </form>
  );
}
