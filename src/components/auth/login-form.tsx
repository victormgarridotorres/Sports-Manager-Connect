"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { signIn } from "@/lib/auth/actions";
import { Alert, Field, SubmitButton, useAuthForm } from "./form-ui";
import { EmailConfirmedNotice, NextInput, UrlError } from "./url-params";

export function LoginForm({ locale, t }: { locale: Locale; t: Messages["auth"] }) {
  const { state, pending, onSubmit, fields } = useAuthForm(signIn);

  return (
    <form onSubmit={onSubmit} className="card-box flex flex-col gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <NextInput />
      {state.status === "error" ? (
        <Alert tone="error">{t.errors[state.error]}</Alert>
      ) : state.status === "idle" ? (
        <>
          <UrlError errors={t.errors} />
          <EmailConfirmedNotice text={t.login.emailConfirmed} />
        </>
      ) : null}

      <Field label={t.email} htmlFor="email" error={fields.email && t.fieldErrors[fields.email]}>
        <input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fields.email} />
      </Field>
      <Field label={t.password} htmlFor="password" error={fields.password && t.fieldErrors.required}>
        <input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!fields.password} />
      </Field>
      <Link href={`/${locale}/forgot-password`} className="text-link -mt-1 self-end text-[13px]">
        {t.login.forgot}
      </Link>
      <SubmitButton pending={pending}>{t.login.submit}</SubmitButton>
      <p className="border-t border-line pt-4 text-center text-[13.5px] text-muted">
        {t.login.noAccount}{" "}
        <Link href={`/${locale}/signup`} className="text-link">
          {t.login.signupLink}
        </Link>
      </p>
    </form>
  );
}
