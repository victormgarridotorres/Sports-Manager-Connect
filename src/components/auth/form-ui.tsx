"use client";

import { startTransition, useActionState, type FormEvent, type ReactNode } from "react";
import { initialFormState, type FormState } from "@/lib/auth/form-state";

/**
 * Envuelve useActionState evitando el reseteo automático de formularios de
 * React 19: si el servidor devuelve un error, el usuario conserva lo escrito.
 */
export function useAuthForm(action: (prev: FormState, data: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState(action, initialFormState);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }
  const fields = state.status === "error" ? (state.fields ?? {}) : {};
  return { state, pending, onSubmit, fields };
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  full,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`form-field ${full ? "form-field-full" : ""}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="form-error">
          {error}
        </p>
      ) : hint ? (
        <p className="form-hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button type="submit" className="btn btn-gold" disabled={pending} aria-busy={pending}>
      {children}
      {pending ? <span aria-hidden>…</span> : null}
    </button>
  );
}

export function Alert({ tone, children }: { tone: "error" | "success" | "warning"; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`alert alert-${tone}`}>
      {children}
    </div>
  );
}
