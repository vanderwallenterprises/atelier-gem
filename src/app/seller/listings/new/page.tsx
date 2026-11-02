import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createListing } from "../../actions";
import { FormSkeleton } from "@/components/auth/auth-shell";
import { StoneStepForm } from "@/components/seller/listing-step-forms";
import { WizardFrame } from "@/components/seller/wizard-frame";
import { Notice } from "@/components/ui/primitives";
import { canAct, requireAccount } from "@/lib/auth/session";
import { getMySeller } from "@/lib/services/seller";

export const metadata: Metadata = { title: "List a gemstone", robots: { index: false } };

export default function NewListingPage() {
  return (
    <WizardFrame title="List a gemstone" current="stone">
      <Suspense fallback={<FormSkeleton />}>
        <Body />
      </Suspense>
    </WizardFrame>
  );
}

async function Body() {
  const account = await requireAccount("/seller/listings/new");
  if (!(await getMySeller(account.id))) redirect("/onboarding/seller");
  if (!canAct(account)) return <Notice tone="warning">Your account is restricted, so new listings can&rsquo;t be created.</Notice>;
  return <StoneStepForm action={createListing} defaults={{ natural_or_lab_grown: "unknown" }} />;
}
