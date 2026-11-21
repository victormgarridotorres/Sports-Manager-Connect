"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { requestPasswordReset } from "@/lib/auth/actions";
import { Alert, Field, SubmitButton, useAuthForm } from "./form-ui";
import { UrlError } from "./url-params";

export function ForgotPasswordForm({ locale, t }: { locale: Locale; t: Messages["auth"] }) {
  const { state, pending, onSubmit, fields } = useAuthForm(requestPasswordReset);

  return (
    <form onSubmit={onSubmit} className="card-box flex flex-col gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {state.status === "success" ? <Alert tone="success">{t.forgot.sent}</Alert> : null}
      {state.status === "error" ? <Alert tone="error">{t.errors[state.error]}</Alert> : null}
      {state.status === "idle" ? <UrlError errors={t.errors} only={["linkInvalid"]} /> : null}

      <Field label={t.email} htmlFor="email" error={fields.email && t.fieldErrors[fields.email]}>
        <input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fields.email} />
      </Field>
      <SubmitButton pending={pending}>{t.forgot.submit}</SubmitButton>
      <Link href={`/${locale}/login`} className="text-link border-t border-line pt-4 text-center text-[13.5px]">
        {t.forgot.back}
      </Link>
    </form>
  );
}
