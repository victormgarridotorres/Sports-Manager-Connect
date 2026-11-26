import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ListingForm } from "@/components/listings/listing-form";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries/es";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import { countryOptions } from "@/lib/countries";
import { publishableTypes } from "@/lib/listings/options";
import { getProfessionalType } from "@/lib/listings/queries";
import { loadProfile } from "@/lib/profile/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/listings/new">): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(locale) ? { title: (await getDictionary(locale)).listings.form.pageTitle.replace(/\*/g, "") } : {};
}

export default async function NewListingPage({ params }: PageProps<"/[locale]/listings/new">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const l = dict.listings;
  return (
    <>
      <SubHero
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: l.crumb, href: `/${locale}/listings` }, { label: l.publish }]}
        eyebrow={l.form.eyebrow}
        title={l.form.pageTitle}
        lead={l.form.pageLead}
      />
      <PageBody>
        <Suspense fallback={<p className="text-on-dark">{dict.common.loading}</p>}>
          <NewListing locale={locale} dict={dict} />
        </Suspense>
      </PageBody>
    </>
  );
}

async function NewListing({ locale, dict }: { locale: Locale; dict: Messages }) {
  const account = await requireAccount(locale, `/${locale}/listings/new`);
  const proType = account.role === "professional" ? await getProfessionalType(account.id) : null;
  const types = publishableTypes(account.role, account.permissions, proType);
  const l = dict.listings;
  if (!types.length) {
    const reason = account.role === "club" ? l.cannotPublishPendingClub : account.role === "fan" ? l.cannotPublishFan : l.cannotPublish;
    return (
      <div className="card-box mx-auto flex max-w-xl flex-col items-start gap-3 text-[14px]">
        <p className="font-bold">{l.cannotPublishTitle}</p>
        <p className="text-muted">{reason}</p>
        <Link href={`/${locale}/listings`} className="text-link">
          ← {l.back}
        </Link>
      </div>
    );
  }
  const full = await loadProfile(account.id);
  return (
    <ListingForm
      locale={locale}
      types={types}
      countries={countryOptions(locale)}
      avatarPath={full?.profile.avatar_path ?? null}
      initial={{
        type: types[0]!,
        org_name: account.displayName,
        title: "",
        highlight: null,
        subtitle: null,
        league: full?.club?.league ?? full?.player?.current_league ?? null,
        country: full?.profile.country ?? null,
        position: null,
        salary: null,
        description: "",
        requirements: null,
        benefits: null,
        about: account.role === "club" ? full?.profile.bio ?? null : null,
      }}
      t={{ l, positions: dict.options.positions, errors: dict.auth.errors, fe: dict.auth.fieldErrors }}
    />
  );
}
