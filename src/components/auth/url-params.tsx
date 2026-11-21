"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Messages } from "@/i18n/dictionaries/es";
import type { ErrorKey } from "@/lib/auth/form-state";
import { Alert } from "./form-ui";

/*
 * Las partes del formulario que dependen de la URL (?next=, ?error=) van
 * aisladas en su propio Suspense: así el formulario entero se prerenderiza
 * en el HTML estático y no espera a que cargue JavaScript.
 */

function NextInputInner() {
  return <input type="hidden" name="next" value={useSearchParams().get("next") ?? ""} />;
}

export function NextInput() {
  return (
    <Suspense>
      <NextInputInner />
    </Suspense>
  );
}

function UrlErrorInner({ errors, only }: { errors: Messages["auth"]["errors"]; only?: ErrorKey[] }) {
  const key = useSearchParams().get("error");
  if (!key || !(key in errors) || (only && !only.includes(key as ErrorKey))) return null;
  return <Alert tone="error">{errors[key as ErrorKey]}</Alert>;
}

export function UrlError(props: { errors: Messages["auth"]["errors"]; only?: ErrorKey[] }) {
  return (
    <Suspense>
      <UrlErrorInner {...props} />
    </Suspense>
  );
}
