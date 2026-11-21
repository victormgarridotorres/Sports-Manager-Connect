"use client";

import Link from "next/link";
import { localeNames, locales, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { signUp } from "@/lib/auth/actions";
import { requiresVerification, type Role } from "@/lib/auth/permissions";
import { Rich } from "../rich-text";
import { Alert, Field, SubmitButton, useAuthForm } from "./form-ui";

type Props = {
  locale: Locale;
  role: Role;
  t: Pick<Messages["auth"], "signup" | "errors" | "fieldErrors" | "email" | "password" | "passwordHint">;
  countries: { code: string; name: string }[];
};

export function SignupForm({ locale, role, t, countries }: Props) {
  const { state, pending, onSubmit, fields } = useAuthForm(signUp);
  const s = t.signup;
  const fieldError = (name: string) => (fields[name] ? t.fieldErrors[fields[name]] : undefined);

  if (state.status === "success") {
    return (
      <div className="card-box flex flex-col items-center gap-3 py-10 text-center" role="status">
        <div aria-hidden className="text-4xl">✉️</div>
        <h2 className="text-xl font-extrabold">{s.checkEmailTitle}</h2>
        <p className="max-w-md text-[14.5px] text-muted">{s.checkEmailBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card-box" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="role" value={role} />
      <p className="form-section-title">{s.accountData}</p>

      <div className="flex flex-col gap-4">
        {state.status === "error" ? <Alert tone="error">{t.errors[state.error]}</Alert> : null}
        {requiresVerification(role) ? <Alert tone="warning">{s.verificationNotice}</Alert> : null}

        <div className="form-row">
          <Field label={role === "club" ? s.clubName : s.displayName} htmlFor="displayName" error={fieldError("displayName")}>
            <input
              id="displayName"
              name="displayName"
              placeholder={role === "club" ? s.clubNamePlaceholder : s.displayNamePlaceholder}
              autoComplete={role === "club" ? "organization" : "name"}
              minLength={2}
              maxLength={80}
              required
              aria-invalid={!!fields.displayName}
            />
          </Field>
          <Field label={t.email} htmlFor="email" error={fieldError("email")}>
            <input
              id="email"
              name="email"
              type="email"
              placeholder={s.emailPlaceholder}
              autoComplete="email"
              required
              aria-invalid={!!fields.email}
            />
          </Field>
          <Field label={t.password} htmlFor="password" error={fieldError("password")} hint={t.passwordHint}>
            <input
              id="password"
              name="password"
              type="password"
              placeholder={s.passwordPlaceholder}
              autoComplete="new-password"
              minLength={10}
              maxLength={72}
              required
              aria-invalid={!!fields.password}
            />
          </Field>
          <Field label={s.country} htmlFor="country" error={fieldError("country")}>
            <select id="country" name="country" defaultValue="" autoComplete="country">
              <option value="">{s.countryPlaceholder}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={s.language} htmlFor="preferredLocale" full>
            <select id="preferredLocale" name="preferredLocale" defaultValue={locale}>
              {locales.map((l) => (
                <option key={l} value={l} lang={l}>
                  {localeNames[l]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-col gap-2.5">
          <label className="form-check">
            <input type="checkbox" name="adult" required aria-invalid={!!fields.adult} />
            <span>{role === "club" ? s.adultClub : s.adult}</span>
          </label>
          <label className="form-check">
            <input type="checkbox" name="legal" required aria-invalid={!!fields.legal} />
            <span>
              <Rich text={s.legal} links={[`/${locale}/legal/legal-notice`, `/${locale}/legal/privacy`]} />
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <SubmitButton pending={pending}>{s.submit}</SubmitButton>
          <p className="text-[13.5px] text-muted">
            {s.haveAccount}{" "}
            <Link href={`/${locale}/login`} className="text-link">
              {s.loginLink}
            </Link>
          </p>
        </div>
      </div>
    </form>
  );
}
