"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { Messages } from "@/i18n/dictionaries/es";
import { format } from "@/i18n/format";
import { initialFormState, type FormState } from "@/lib/auth/form-state";
import type { Role } from "@/lib/auth/permissions";
import {
  addCareerEntry,
  addHighlight,
  addRosterEntry,
  deleteItem,
  removeAvatar,
  saveBasics,
  saveClub,
  savePlayer,
  saveProfessional,
  uploadAvatar,
} from "@/lib/profile/actions";
import { availabilities, hands, playerPositions, professionalTypes } from "@/lib/profile/options";
import type { CareerEntry, ClubData, FullProfile, Highlight, PlayerData, ProfessionalData, RosterEntry } from "@/lib/profile/types";
import { Alert, Field, SubmitButton, useAuthForm } from "../auth/form-ui";
import { Avatar } from "./avatar";
import { PositionPicker } from "./position-picker";
import { VideoCard } from "./video-card";

export type EditorT = {
  p: Messages["profile"];
  o: Messages["options"];
  errors: Messages["auth"]["errors"];
  fe: Messages["auth"]["fieldErrors"];
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

/** Formulario con mensajes de error/guardado; con `resetOnSuccess` se vacía tras añadir. */
function EditorForm({
  action,
  t,
  submit,
  resetOnSuccess = false,
  children,
}: {
  action: Action;
  t: EditorT;
  submit?: string;
  resetOnSuccess?: boolean;
  children: (fieldError: (name: string) => string | undefined) => ReactNode;
}) {
  const { state, pending, onSubmit, fields } = useAuthForm(action);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state.status === "success") ref.current?.reset();
  }, [state, resetOnSuccess]);
  const fieldError = (name: string) => (fields[name] ? t.fe[fields[name]] : undefined);

  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {state.status === "error" ? <Alert tone="error">{t.errors[state.error]}</Alert> : null}
      {state.status === "success" && !resetOnSuccess ? <Alert tone="success">{t.p.saved}</Alert> : null}
      {children(fieldError)}
      <div className="flex justify-end border-t border-line pt-4">
        <SubmitButton pending={pending}>{submit ?? t.p.save}</SubmitButton>
      </div>
    </form>
  );
}

function Select({
  name,
  value,
  options,
  labels,
  placeholder,
  id,
}: {
  name: string;
  value: string | null | undefined;
  options: readonly string[];
  labels: Record<string, string>;
  placeholder: string;
  id?: string;
}) {
  return (
    <select id={id ?? name} name={name} defaultValue={value ?? ""}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {labels[o] ?? o}
        </option>
      ))}
    </select>
  );
}

const num = (v: number | null | undefined) => (v == null ? "" : String(v));

// --- Datos básicos + foto ----------------------------------------------------

export function AvatarForm({ profile, t }: { profile: FullProfile["profile"]; t: EditorT }) {
  const [state, dispatch, pending] = useActionState(uploadAvatar, initialFormState);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const blob = await squareResize(file, 400).catch(() => null);
    const fd = new FormData();
    if (blob) fd.set("avatar", new File([blob], `avatar.${blob.type.split("/")[1]}`, { type: blob.type }));
    else fd.set("avatar", file); // el servidor validará tipo y tamaño
    startTransition(() => dispatch(fd));
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar path={profile.avatar_path} name={profile.display_name} size={88} className="rounded-2xl" />
      <div className="flex flex-col gap-2">
        <p className="form-section-title !mb-0">{t.p.avatar.title}</p>
        <div className="flex flex-wrap gap-2">
          <label className={`btn btn-ghost-light btn-sm ${pending ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
            {pending ? t.p.avatar.processing : t.p.avatar.change}
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          {profile.avatar_path ? (
            <form action={removeAvatar}>
              <button type="submit" className="btn btn-danger-outline btn-sm">
                {t.p.avatar.remove}
              </button>
            </form>
          ) : null}
        </div>
        <p className="form-hint">{t.p.avatar.hint}</p>
        {state.status === "error" ? <Alert tone="error">{t.errors[state.error]}</Alert> : null}
      </div>
    </div>
  );
}

/** Recorta al centro y reduce a size×size (WebP si el navegador lo admite). */
async function squareResize(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.getContext("2d")!.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/webp", 0.85),
  );
}

export function BasicsForm({
  role,
  profile,
  countries,
  languages,
  t,
}: {
  role: Role;
  profile: FullProfile["profile"];
  countries: { code: string; name: string }[];
  languages: { code: string; name: string }[];
  t: EditorT;
}) {
  const f = t.p.fields;
  return (
    <EditorForm action={saveBasics} t={t}>
      {(err) => (
        <>
          <div className="form-row">
            <Field label={role === "club" ? f.clubName : f.displayName} htmlFor="displayName" error={err("displayName")}>
              <input id="displayName" name="displayName" defaultValue={profile.display_name} maxLength={80} required />
            </Field>
            <Field label={f.country} htmlFor="country" error={err("country")}>
              <select id="country" name="country" defaultValue={profile.country ?? ""}>
                <option value="">{t.p.select}</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={f.city} htmlFor="city" error={err("city")}>
              <input id="city" name="city" defaultValue={profile.city ?? ""} maxLength={80} />
            </Field>
          </div>
          <fieldset className="form-field">
            <legend className="mb-1.5 text-[12px] font-bold text-muted">{f.languages}</legend>
            <div className="flex flex-wrap gap-2">
              {languages.map((l) => (
                <label key={l.code} className="chip">
                  <input
                    type="checkbox"
                    name="languages"
                    value={l.code}
                    defaultChecked={profile.languages.includes(l.code)}
                    className="sr-only"
                  />
                  {l.name}
                </label>
              ))}
            </div>
            {err("languages") ? <p className="form-error">{err("languages")}</p> : null}
          </fieldset>
          <Field label={role === "club" ? f.aboutClub : f.bio} htmlFor="bio" error={err("bio")}>
            <textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={1500} placeholder={f.bioPlaceholder} />
          </Field>
        </>
      )}
    </EditorForm>
  );
}

// --- Datos deportivos / profesionales / club ---------------------------------

export function PlayerForm({ data, t }: { data: PlayerData | null; t: EditorT }) {
  const f = t.p.fields;
  const o = t.o;
  const legend = { primary: f.primary, secondary: f.secondary };
  return (
    <EditorForm action={savePlayer} t={t}>
      {(err) => (
        <>
          <div className="form-row">
            <Field label={f.birthYear} htmlFor="birth_year" error={err("birth_year")} hint={f.birthYearHint}>
              <input id="birth_year" name="birth_year" type="number" inputMode="numeric" min={1940} defaultValue={num(data?.birth_year)} />
            </Field>
            <Field label={f.height} htmlFor="height_cm" error={err("height_cm")}>
              <input id="height_cm" name="height_cm" type="number" inputMode="numeric" min={120} max={230} defaultValue={num(data?.height_cm)} />
            </Field>
            <Field label={f.weight} htmlFor="weight_kg" error={err("weight_kg")}>
              <input id="weight_kg" name="weight_kg" type="number" inputMode="numeric" min={40} max={160} defaultValue={num(data?.weight_kg)} />
            </Field>
            <Field label={f.hand} htmlFor="dominant_hand">
              <Select name="dominant_hand" value={data?.dominant_hand} options={hands} labels={o.hands} placeholder={t.p.select} />
            </Field>
            <Field label={f.availability} htmlFor="availability">
              <Select name="availability" value={data?.availability} options={availabilities} labels={o.availability} placeholder={t.p.select} />
            </Field>
            <Field label={f.currentClub} htmlFor="current_club" error={err("current_club")}>
              <input id="current_club" name="current_club" defaultValue={data?.current_club ?? ""} maxLength={120} />
            </Field>
            <Field label={f.currentLeague} htmlFor="current_league" error={err("current_league")} full>
              <input id="current_league" name="current_league" defaultValue={data?.current_league ?? ""} maxLength={120} placeholder={f.currentLeaguePlaceholder} />
            </Field>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <PositionPicker
              mode="attack"
              title={f.attack}
              caption={f.pickerHint}
              name="position"
              secondaryName="secondary_position"
              initialPrimary={data?.position ?? null}
              initialSecondary={data?.secondary_position ?? null}
              labels={o.positionsShort}
              fullLabels={o.positions}
              legend={legend}
            />
            <PositionPicker
              mode="defense"
              title={f.defense}
              caption={f.pickerHint}
              name="defense_position"
              secondaryName="secondary_defense_position"
              initialPrimary={data?.defense_position ?? null}
              initialSecondary={data?.secondary_defense_position ?? null}
              labels={o.defenseShort}
              fullLabels={o.defense}
              legend={legend}
            />
          </div>
        </>
      )}
    </EditorForm>
  );
}

export function ProfessionalForm({ data, t }: { data: ProfessionalData | null; t: EditorT }) {
  const f = t.p.fields;
  return (
    <EditorForm action={saveProfessional} t={t}>
      {(err) => (
        <div className="form-row">
          <Field label={f.specialty} htmlFor="professional_type">
            <Select name="professional_type" value={data?.professional_type} options={professionalTypes} labels={t.o.professionalTypes} placeholder={t.p.select} />
          </Field>
          <Field label={f.yearsExperience} htmlFor="years_experience" error={err("years_experience")}>
            <input id="years_experience" name="years_experience" type="number" inputMode="numeric" min={0} max={60} defaultValue={num(data?.years_experience)} />
          </Field>
          <Field label={f.availability} htmlFor="availability">
            <Select name="availability" value={data?.availability} options={availabilities} labels={t.o.availability} placeholder={t.p.select} />
          </Field>
          <Field label={f.currentEntity} htmlFor="current_entity" error={err("current_entity")}>
            <input id="current_entity" name="current_entity" defaultValue={data?.current_entity ?? ""} maxLength={120} placeholder={f.currentEntityPlaceholder} />
          </Field>
          <Field label={f.education} htmlFor="education" error={err("education")} full>
            <textarea id="education" name="education" defaultValue={data?.education ?? ""} maxLength={2000} placeholder={f.educationPlaceholder} />
          </Field>
          <Field label={f.achievements} htmlFor="achievements" error={err("achievements")} full>
            <textarea id="achievements" name="achievements" defaultValue={data?.achievements ?? ""} maxLength={2000} placeholder={f.achievementsPlaceholder} />
          </Field>
        </div>
      )}
    </EditorForm>
  );
}

export function ClubForm({ data, t }: { data: ClubData | null; t: EditorT }) {
  const f = t.p.fields;
  return (
    <EditorForm action={saveClub} t={t}>
      {(err) => (
        <div className="form-row">
          <Field label={f.city} htmlFor="city" error={err("city")}>
            <input id="city" name="city" defaultValue={data?.city ?? ""} maxLength={80} />
          </Field>
          <Field label={f.foundedYear} htmlFor="founded_year" error={err("founded_year")}>
            <input id="founded_year" name="founded_year" type="number" inputMode="numeric" min={1850} defaultValue={num(data?.founded_year)} />
          </Field>
          <Field label={f.league} htmlFor="league" error={err("league")}>
            <input id="league" name="league" defaultValue={data?.league ?? ""} maxLength={120} placeholder={f.currentLeaguePlaceholder} />
          </Field>
          <Field label={f.venue} htmlFor="venue" error={err("venue")}>
            <input id="venue" name="venue" defaultValue={data?.venue ?? ""} maxLength={120} />
          </Field>
          <Field label={f.website} htmlFor="website" error={err("website")} full>
            <input id="website" name="website" type="url" defaultValue={data?.website ?? ""} maxLength={200} placeholder="https://" />
          </Field>
          <Field label={f.honours} htmlFor="honours" error={err("honours")} full>
            <textarea id="honours" name="honours" defaultValue={data?.honours ?? ""} maxLength={2000} placeholder={f.honoursPlaceholder} />
          </Field>
        </div>
      )}
    </EditorForm>
  );
}

// --- Listas: trayectoria, highlights, plantilla --------------------------------

function DeleteButton({ kind, id, label }: { kind: "career" | "highlight" | "roster"; id: string; label: string }) {
  return (
    <form action={deleteItem}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-[12.5px] font-bold text-danger hover:underline" aria-label={label}>
        ✕
      </button>
    </form>
  );
}

export function CareerManager({ entries, t }: { entries: CareerEntry[]; t: EditorT }) {
  const f = t.p.fields;
  return (
    <div className="flex flex-col gap-6">
      {entries.length ? (
        <ul className="timeline">
          {entries.map((e) => (
            <li key={e.id} className="tl-item flex items-start justify-between gap-3">
              <div>
                <b>{e.organization}</b>
                <span>
                  {e.start_year} — {e.end_year ?? t.p.present}
                  {e.detail ? ` · ${e.detail}` : ""}
                </span>
              </div>
              <DeleteButton kind="career" id={e.id} label={`${t.p.delete}: ${e.organization}`} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13.5px] text-muted">{t.p.careerEmpty}</p>
      )}
      <div className="border-t border-line pt-5">
        <p className="form-section-title">{t.p.addCareer}</p>
        <EditorForm action={addCareerEntry} t={t} submit={t.p.add} resetOnSuccess>
          {(err) => (
            <div className="form-row">
              <Field label={f.organization} htmlFor="organization" error={err("organization")} full>
                <input id="organization" name="organization" maxLength={120} required placeholder={f.organizationPlaceholder} />
              </Field>
              <Field label={f.startYear} htmlFor="start_year" error={err("start_year")}>
                <input id="start_year" name="start_year" type="number" inputMode="numeric" min={1950} required />
              </Field>
              <Field label={f.endYear} htmlFor="end_year" error={err("end_year")} hint={f.endYearHint}>
                <input id="end_year" name="end_year" type="number" inputMode="numeric" min={1950} />
              </Field>
              <Field label={f.detail} htmlFor="detail" error={err("detail")} full>
                <input id="detail" name="detail" maxLength={160} placeholder={f.detailPlaceholder} />
              </Field>
            </div>
          )}
        </EditorForm>
      </div>
    </div>
  );
}

export function HighlightsManager({ items, t }: { items: Highlight[]; t: EditorT }) {
  const f = t.p.fields;
  return (
    <div className="flex flex-col gap-6">
      {items.length ? (
        <div className="hl-grid">
          {items.map((h) => (
            <div key={h.id} className="flex flex-col gap-1.5">
              <VideoCard video={{ provider: h.provider, videoId: h.video_id }} title={h.title ?? t.p.untitledVideo} playLabel={t.p.play} />
              <div className="flex justify-end">
                <DeleteButton kind="highlight" id={h.id} label={`${t.p.delete}: ${h.title ?? t.p.untitledVideo}`} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13.5px] text-muted">{t.p.highlightsEmpty}</p>
      )}
      <p className="form-hint">{format(t.p.highlightsHint, { max: 10 })}</p>
      <div className="border-t border-line pt-5">
        <p className="form-section-title">{t.p.addVideo}</p>
        <EditorForm action={addHighlight} t={t} submit={t.p.add} resetOnSuccess>
          {(err) => (
            <div className="form-row">
              <Field label={f.videoUrl} htmlFor="url" error={err("url")} hint={f.videoUrlHint} full>
                <input id="url" name="url" type="url" maxLength={300} required placeholder="https://www.youtube.com/watch?v=…" />
              </Field>
              <Field label={f.videoTitle} htmlFor="title" error={err("title")} full>
                <input id="title" name="title" maxLength={100} />
              </Field>
            </div>
          )}
        </EditorForm>
      </div>
    </div>
  );
}

export function RosterManager({ roster, t }: { roster: RosterEntry[]; t: EditorT }) {
  const f = t.p.fields;
  return (
    <div className="flex flex-col gap-6">
      {roster.length ? (
        <ul className="divide-y divide-line">
          {roster.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5 text-[13.5px]">
              <span className="w-8 text-center font-display font-extrabold text-gold-deep">{r.shirt_number ?? "–"}</span>
              <span className="flex-1 font-semibold">{r.player_name}</span>
              <span className="text-muted">{r.position ? t.o.positions[r.position] : ""}</span>
              <DeleteButton kind="roster" id={r.id} label={`${t.p.delete}: ${r.player_name}`} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13.5px] text-muted">{t.p.rosterEmpty}</p>
      )}
      <div className="border-t border-line pt-5">
        <p className="form-section-title">{t.p.addPlayer}</p>
        <EditorForm action={addRosterEntry} t={t} submit={t.p.add} resetOnSuccess>
          {(err) => (
            <div className="form-row">
              <Field label={f.playerName} htmlFor="player_name" error={err("player_name")} full>
                <input id="player_name" name="player_name" maxLength={80} required />
              </Field>
              <Field label={f.position} htmlFor="position">
                <Select name="position" value={null} options={playerPositions} labels={t.o.positions} placeholder={t.p.select} />
              </Field>
              <Field label={f.shirtNumber} htmlFor="shirt_number" error={err("shirt_number")}>
                <input id="shirt_number" name="shirt_number" type="number" inputMode="numeric" min={0} max={99} />
              </Field>
            </div>
          )}
        </EditorForm>
      </div>
    </div>
  );
}
