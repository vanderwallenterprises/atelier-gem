import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/auth/auth-shell";
import { SellerOnboardingForm } from "@/components/seller/seller-onboarding-form";
import { Container, Notice } from "@/components/ui/primitives";
import { canAct, requireAccount } from "@/lib/auth/session";
import { getMySeller } from "@/lib/services/seller";

export const metadata: Metadata = { title: "Become a seller", robots: { index: false } };

export default function SellerOnboardingPage() {
  return (
    <Container className="grid max-w-5xl gap-12 py-14 lg:grid-cols-[1fr_18rem]">
      <div>
        <h1 className="text-4xl sm:text-5xl">Set up your seller profile</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          You can start drafting listings as soon as this is saved. Listings go live after marketplace review, and payouts
          open once you finish the payment provider&rsquo;s seller setup.
        </p>
        <div className="mt-10">
          <Suspense fallback={<FormSkeleton />}>
            <Body />
          </Suspense>
        </div>
      </div>
      <aside className="h-fit rounded-lg border border-line bg-vellum/60 p-6 text-sm leading-relaxed text-ink-soft lg:mt-24">
        <h2 className="font-serif text-xl text-ink">What happens next</h2>
        <ol className="mt-3 grid list-decimal gap-2 pl-4">
          <li>You can draft listings and submit them straight away.</li>
          <li>The marketplace reviews your profile and each listing.</li>
          <li>Approved listings are published.</li>
        </ol>
        <p className="mt-3">Review isn&rsquo;t running yet, so for now nothing gets published.</p>
      </aside>
    </Container>
  );
}

async function Body() {
  const account = await requireAccount("/onboarding/seller");
  if (await getMySeller(account.id)) redirect("/seller");
  if (!canAct(account)) {
    return <Notice tone="warning" title="Your account is restricted">Selling isn&rsquo;t available while your account is restricted. Contact support for help.</Notice>;
  }
  return <SellerOnboardingForm defaultEmail={account.email ?? ""} />;
}
