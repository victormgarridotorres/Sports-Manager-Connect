import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ListingForm } from "@/components/listings/listing-form";
import { PageBody, SubHero } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireAccount } from "@/lib/auth/dal";
import { countryOptions } from "@/lib/countries";
import { publishableTypes } from "@/lib/listings/options";
import { getListing, getProfessionalType } from "@/lib/listings/queries";

export const metadata: Metadata = { robots: { index: false } };

export default function EditListingPage({ params }: PageProps<"/[locale]/listings/[id]/edit">) {
  return (
    <Suspense fallback={<SubHero />}>
      <EditListing params={params} />
    </Suspense>
  );
}

async function EditListing({ params }: { params: PageProps<"/[locale]/listings/[id]/edit">["params"] }) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const l = dict.listings;
  const account = await requireAccount(locale, `/${locale}/listings/${id}/edit`);
  const listing = await getListing(id, account.id);
  if (!listing || listing.owner_id !== account.id) redirect(`/${locale}/listings`);
  const proType = account.role === "professional" ? await getProfessionalType(account.id) : null;
  const types = publishableTypes(account.role, account.permissions, proType);
  const allowed = types.includes(listing.type) ? types : [listing.type, ...types];

  return (
    <>
      <SubHero
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: l.crumb, href: `/${locale}/listings` }, { label: l.edit }]}
        eyebrow={l.form.eyebrow}
        title={l.edit}
      />
      <PageBody>
        <ListingForm
          locale={locale}
          types={allowed}
          countries={countryOptions(locale)}
          avatarPath={listing.owner_avatar}
          initial={{
            id: listing.id,
            type: listing.type,
            org_name: listing.org_name,
            title: listing.title,
            highlight: listing.highlight,
            subtitle: listing.subtitle,
            league: listing.league,
            country: listing.country,
            position: listing.position,
            salary: listing.salary,
            description: listing.description,
            requirements: listing.requirements,
            benefits: listing.benefits,
            about: listing.about,
          }}
          t={{ l, positions: dict.options.positions, errors: dict.auth.errors, fe: dict.auth.fieldErrors }}
        />
      </PageBody>
    </>
  );
}
