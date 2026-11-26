"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { saveListing } from "@/lib/listings/actions";
import { listingAccent, type ListingType } from "@/lib/listings/options";
import { countryFlag } from "@/lib/profile/display";
import { playerPositions } from "@/lib/profile/options";
import { Alert, Field, SubmitButton, useAuthForm } from "../auth/form-ui";
import { Avatar } from "../profile/avatar";
import { ListingTitle } from "./listing-title";

export type ListingFormValues = {
  id?: string;
  type: ListingType;
  org_name: string;
  title: string;
  highlight: string | null;
  subtitle: string | null;
  league: string | null;
  country: string | null;
  position: string | null;
  salary: string | null;
  description: string;
  requirements: string | null;
  benefits: string | null;
  about: string | null;
};

type T = {
  l: Messages["listings"];
  positions: Messages["options"]["positions"];
  errors: Messages["auth"]["errors"];
  fe: Messages["auth"]["fieldErrors"];
};

/** Formulario de publicar/editar anuncio con vista previa en vivo (prototipo: "Publica tu oferta"). */
export function ListingForm({
  locale,
  types,
  initial,
  countries,
  avatarPath,
  t,
}: {
  locale: Locale;
  types: ListingType[];
  initial: ListingFormValues;
  countries: { code: string; name: string }[];
  avatarPath: string | null;
  t: T;
}) {
  const { state, pending, onSubmit, fields } = useAuthForm(saveListing);
  const [v, setV] = useState(initial);
  const set = (k: keyof ListingFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV((old) => ({ ...old, [k]: e.target.value }));
  const err = (name: string) => (fields[name] ? t.fe[fields[name]] : undefined);
  const l = t.l;
  const isClub = v.type === "club_seeks";
  const countryLabel = v.country ? `${countryFlag(v.country)} ${countries.find((c) => c.code === v.country)?.name ?? v.country}` : `🌍 ${l.international}`;

  return (
    <div className="registro-layout">
      <form onSubmit={onSubmit} className="card-box flex flex-col gap-5" noValidate>
        <input type="hidden" name="locale" value={locale} />
        {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
        {state.status === "error" ? <Alert tone="error">{t.errors[state.error]}</Alert> : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="form-section-title">{l.form.typeQuestion}</legend>
          <div className="flex flex-wrap gap-2">
            {types.map((type) => (
              <label key={type} className="chip">
                <input type="radio" name="type" value={type} checked={v.type === type} onChange={set("type")} className="sr-only" />
                {l.types[type]}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <p className="form-section-title">{l.form.headline}</p>
          <div className="form-row">
            <Field label={isClub ? l.form.orgClub : l.form.orgOther} htmlFor="org_name" error={err("org_name")} full>
              <input id="org_name" name="org_name" value={v.org_name} onChange={set("org_name")} maxLength={120} required />
            </Field>
            <Field label={l.form.title} htmlFor="title" error={err("title")} hint={isClub ? l.form.titleHintClub : l.form.titleHintOther}>
              <input id="title" name="title" value={v.title} onChange={set("title")} maxLength={120} required />
            </Field>
            <Field label={l.form.highlight} htmlFor="highlight" error={err("highlight")} hint={l.form.highlightHint}>
              <input id="highlight" name="highlight" value={v.highlight ?? ""} onChange={set("highlight")} maxLength={60} />
            </Field>
            <Field label={l.form.subtitle} htmlFor="subtitle" error={err("subtitle")} full>
              <input id="subtitle" name="subtitle" value={v.subtitle ?? ""} onChange={set("subtitle")} maxLength={160} placeholder={l.form.subtitlePlaceholder} />
            </Field>
          </div>
        </div>

        <div>
          <p className="form-section-title">{l.form.details}</p>
          <div className="form-row">
            <Field label={l.form.league} htmlFor="league" error={err("league")}>
              <input id="league" name="league" value={v.league ?? ""} onChange={set("league")} maxLength={120} />
            </Field>
            <Field label={l.form.country} htmlFor="country">
              <select id="country" name="country" value={v.country ?? ""} onChange={set("country")}>
                <option value="">🌍 {l.international}</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={l.form.position} htmlFor="position">
              <select id="position" name="position" value={v.position ?? ""} onChange={set("position")}>
                <option value="">{l.form.positionAny}</option>
                {playerPositions.map((p) => (
                  <option key={p} value={p}>
                    {t.positions[p]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={l.form.salary} htmlFor="salary" error={err("salary")}>
              <input id="salary" name="salary" value={v.salary ?? ""} onChange={set("salary")} maxLength={120} placeholder={l.form.salaryPlaceholder} />
            </Field>
            <Field label={l.form.description} htmlFor="description" error={err("description")} full>
              <textarea id="description" name="description" value={v.description} onChange={set("description")} maxLength={4000} required placeholder={l.form.descriptionPlaceholder} />
            </Field>
            <Field label={isClub ? l.form.requirementsClub : l.form.requirementsOther} htmlFor="requirements" error={err("requirements")} hint={l.form.linesHint} full>
              <textarea id="requirements" name="requirements" value={v.requirements ?? ""} onChange={set("requirements")} maxLength={2000} />
            </Field>
            <Field label={isClub ? l.form.benefitsClub : l.form.benefitsOther} htmlFor="benefits" error={err("benefits")} hint={l.form.linesHint} full>
              <textarea id="benefits" name="benefits" value={v.benefits ?? ""} onChange={set("benefits")} maxLength={2000} />
            </Field>
            <Field label={l.form.about} htmlFor="about" error={err("about")} full>
              <textarea id="about" name="about" value={v.about ?? ""} onChange={set("about")} maxLength={2000} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end border-t border-line pt-4">
          <SubmitButton pending={pending}>{initial.id ? l.form.update : l.form.publish}</SubmitButton>
        </div>
      </form>

      <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
        <p className="text-[13px] font-bold tracking-wider text-gold uppercase">{l.form.preview}</p>
        <p className="text-[13px] text-on-dark">{l.form.previewHint}</p>
        <div className="offer-row !cursor-default !transform-none">
          <Avatar path={avatarPath} name={v.org_name || "?"} size={52} className="rounded-[12px]" />
          <div className="offer-row-id">
            <div className="row-top">
              <span className={`offer-type ${listingAccent[v.type]}`}>{l.types[v.type]}</span>
              <h4>
                <ListingTitle title={v.title || l.form.titlePreviewEmpty} highlight={v.highlight || null} />
              </h4>
            </div>
            <p className="row-org">{[v.org_name, v.league, v.subtitle].filter(Boolean).join(" · ")}</p>
            <div className="offer-row-tags !mt-1 !flex-none">
              {v.position ? <span>{t.positions[v.position as keyof T["positions"]]}</span> : null}
              <span>{countryLabel}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
