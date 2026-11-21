import type { Messages } from "@/i18n/dictionaries/es";

export type ErrorKey = keyof Messages["auth"]["errors"];
export type FieldErrorKey = keyof Messages["auth"]["fieldErrors"];

export type FormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; error: ErrorKey; fields?: Record<string, FieldErrorKey> };

export const initialFormState: FormState = { status: "idle" };
