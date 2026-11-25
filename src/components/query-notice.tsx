"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Alert } from "./auth/form-ui";

function Inner({ param, text }: { param: string; text: string }) {
  return useSearchParams().get(param) === "1" ? <Alert tone="success">{text}</Alert> : null;
}

/** Aviso que aparece solo si la URL lleva ?<param>=1 (p. ej. tras borrar la cuenta). */
export function QueryNotice({ param, text }: { param: string; text: string }) {
  return (
    <Suspense>
      <Inner param={param} text={text} />
    </Suspense>
  );
}
