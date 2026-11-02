"use client";

import Link from "next/link";
import { useActionState } from "react";
import { becomeSeller } from "@/app/seller/actions";
import { describedBy, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { SELLER_TYPES } from "@/lib/domain/seller-onboarding";
import type { FormState } from "@/lib/forms";

export function SellerOnboardingForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action] = useActionState(becomeSeller, {} as FormState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form key={JSON.stringify(state.values ?? null)} action={action} className="grid gap-6" noValidate>
      {state.error && <Notice tone="danger">{state.error}</Notice>}

      <fieldset className="grid gap-5">
        <legend className="mb-1 font-serif text-2xl">About you</legend>
        <Field id="business_name" label="Seller name" hint="Your business name, or your own name if you sell as an individual." error={e.business_name}>
          <Input id="business_name" name="business_name" required maxLength={120} defaultValue={v.business_name} autoComplete="organization" {...describedBy("business_name", { hint: 1, error: e.business_name })} />
        </Field>
        <Field id="seller_type" label="What kind of seller are you?" error={e.seller_type}>
          <Select id="seller_type" name="seller_type" required defaultValue={v.seller_type ?? ""} {...describedBy("seller_type", { error: e.seller_type })}>
            <option value="" disabled>Choose one</option>
            {Object.entries(SELLER_TYPES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </Select>
        </Field>
        <Field id="contact_email" label="Contact email for buyers" optional hint="Defaults to your account email when left empty. Never shown publicly." error={e.contact_email}>
          <Input id="contact_email" name="contact_email" type="email" placeholder={defaultEmail} defaultValue={v.contact_email} autoComplete="email" {...describedBy("contact_email", { hint: 1, error: e.contact_email })} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5">
        <legend className="mb-1 font-serif text-2xl">Where you ship from</legend>
        <p className="-mt-2 text-sm text-ink-muted">City and region are shown on your listings. Your street address is never asked for here.</p>
        <div className="grid gap-5 sm:grid-cols-[1fr_1fr_8rem]">
          <Field id="location_city" label="City" optional error={e.location_city}>
            <Input id="location_city" name="location_city" maxLength={80} defaultValue={v.location_city} autoComplete="address-level2" {...describedBy("location_city", { error: e.location_city })} />
          </Field>
          <Field id="location_region" label="State or region" optional error={e.location_region}>
            <Input id="location_region" name="location_region" maxLength={80} defaultValue={v.location_region} autoComplete="address-level1" {...describedBy("location_region", { error: e.location_region })} />
          </Field>
          <Field id="location_country" label="Country" error={e.location_country}>
            <Input id="location_country" name="location_country" required maxLength={2} placeholder="US" defaultValue={v.location_country} autoComplete="country" className="uppercase" {...describedBy("location_country", { error: e.location_country })} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-5">
        <legend className="mb-1 font-serif text-2xl">Your policies</legend>
        <Field id="shipping_policy" label="Shipping policy" optional hint="How you pack, insure and ship stones. You can also set this per listing." error={e.shipping_policy}>
          <Textarea id="shipping_policy" name="shipping_policy" maxLength={4000} defaultValue={v.shipping_policy} {...describedBy("shipping_policy", { hint: 1, error: e.shipping_policy })} />
        </Field>
        <Field id="return_policy" label="Return policy" optional hint="When the marketplace return policy applies, yours can only add to it." error={e.return_policy}>
          <Textarea id="return_policy" name="return_policy" maxLength={4000} defaultValue={v.return_policy} {...describedBy("return_policy", { hint: 1, error: e.return_policy })} />
        </Field>
      </fieldset>

      <div className="grid gap-1.5">
        <label className="flex items-start gap-3 text-sm leading-relaxed text-ink-soft">
          <input type="checkbox" name="terms" defaultChecked={v.terms === "on"} className="mt-0.5 size-4 accent-olive" {...describedBy("terms", { error: e.terms })} />
          <span>
            I agree to the <Link href="/policies/seller-terms" className="underline underline-offset-4">seller terms</Link>: one physical stone
            per listing, every known treatment disclosed, and only grading reports I hold for that stone.
          </span>
        </label>
        {e.terms && <p id="terms-error" role="alert" className="text-sm text-danger">{e.terms}</p>}
      </div>

      <SubmitButton pendingLabel="Saving…" size="lg" className="justify-self-start">
        Create seller profile
      </SubmitButton>
    </form>
  );
}
