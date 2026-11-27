"use client";

import { useActionState } from "react";
import type { Messages } from "@/i18n/dictionaries/es";
import type { VerificationStatus } from "@/lib/auth/permissions";
import { setStaff, setSuspended, setVerification } from "@/lib/admin/actions";
import type { FormState } from "@/lib/auth/form-state";

type T = Messages["admin"];
type E = Messages["auth"]["errors"];
const idle: FormState = { status: "idle" };

function Feedback({ state, t, errors }: { state: FormState; t: T; errors: E }) {
  if (state.status === "success") return <p role="status" className="text-[12.5px] font-semibold text-[#1f7a3d]">✓ {t.done}</p>;
  if (state.status === "error") return <p role="alert" className="text-[12.5px] font-semibold text-danger">{errors[state.error]}</p>;
  return null;
}

/** Verificar / rechazar (con motivo que verá la persona) / volver a pendiente. */
export function VerificationForm({ userId, current, note, t, errors, compact }: { userId: string; current: VerificationStatus; note?: string | null; t: T; errors: E; compact?: boolean }) {
  const [state, action, pending] = useActionState(setVerification, idle);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      {!compact ? (
        <>
          <label htmlFor={`vn-${userId}`} className="text-[12.5px] font-bold text-ink">
            {t.verification.noteLabel}
          </label>
          <textarea id={`vn-${userId}`} name="note" rows={2} maxLength={500} defaultValue={note ?? ""} placeholder={t.verification.notePlaceholder} className="w-full" />
        </>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {current !== "verified" ? (
          <button type="submit" name="status" value="verified" className="btn btn-gold btn-sm" disabled={pending}>
            ✓ {t.verification.approve}
          </button>
        ) : null}
        {current !== "rejected" && !compact ? (
          <button type="submit" name="status" value="rejected" className="btn btn-danger-outline btn-sm" disabled={pending}>
            {t.verification.reject}
          </button>
        ) : null}
        {current !== "pending" ? (
          <button type="submit" name="status" value="pending" className="btn btn-ghost-light btn-sm" disabled={pending}>
            {t.verification.backToPending}
          </button>
        ) : null}
      </div>
      <Feedback state={state} t={t} errors={errors} />
    </form>
  );
}

export function SuspendForm({ userId, suspended, reason, t, errors }: { userId: string; suspended: boolean; reason?: string | null; t: T; errors: E }) {
  const [state, action, pending] = useActionState(setSuspended, idle);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="suspend" value={suspended ? "0" : "1"} />
      {!suspended ? (
        <>
          <label htmlFor={`sr-${userId}`} className="text-[12.5px] font-bold text-ink">
            {t.suspension.reasonLabel}
          </label>
          <textarea id={`sr-${userId}`} name="note" rows={2} maxLength={500} placeholder={t.suspension.reasonPlaceholder} className="w-full" />
          <p className="text-[12px] text-muted">{t.suspension.hint}</p>
        </>
      ) : reason ? (
        <p className="text-[13px]">
          {t.suspension.reasonLabel}: <b>{reason}</b>
        </p>
      ) : null}
      <div>
        <button type="submit" className={`btn btn-sm ${suspended ? "btn-gold" : "btn-danger-outline"}`} disabled={pending}>
          {suspended ? t.suspension.lift : t.suspension.suspend}
        </button>
      </div>
      <Feedback state={state} t={t} errors={errors} />
    </form>
  );
}

export function StaffToggle({ userId, role, on, label, t, errors }: { userId: string; role: "admin" | "editor" | "moderator"; on: boolean; label: string; t: T; errors: E }) {
  const [state, action, pending] = useActionState(setStaff, idle);
  return (
    <form action={action} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="on" value={on ? "0" : "1"} />
      <span className="text-[13.5px]">
        <b>{label}</b> · <span className={`status-pill ${on ? "ok" : ""}`}>{on ? t.staff.yes : t.staff.no}</span>
      </span>
      <div className="flex items-center gap-2">
        <Feedback state={state} t={t} errors={errors} />
        <button type="submit" className={`btn btn-sm ${on ? "btn-ghost-light" : "btn-gold"}`} disabled={pending}>
          {on ? t.staff.remove : t.staff.add}
        </button>
      </div>
    </form>
  );
}
