"use client";

import type { Messages } from "@/i18n/dictionaries/es";
import { applyToListing } from "@/lib/listings/actions";
import { Alert, Field, SubmitButton, useAuthForm } from "../auth/form-ui";

export function ApplyForm({ listingId, t, errors }: { listingId: string; t: Messages["listings"]; errors: Messages["auth"]["errors"] }) {
  const { state, pending, onSubmit } = useAuthForm(applyToListing);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="listingId" value={listingId} />
      {state.status === "error" ? <Alert tone="error">{errors[state.error]}</Alert> : null}
      <Field label={t.applyMessage} htmlFor="message" hint={t.applyMessageHint}>
        <textarea id="message" name="message" maxLength={1000} placeholder={t.applyMessagePlaceholder} />
      </Field>
      <SubmitButton pending={pending}>{t.apply}</SubmitButton>
    </form>
  );
}
