import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell, FormSkeleton } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";
import { hasRecentRecovery } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" aside={<p>After saving, you stay signed in on this device.</p>}>
      <Suspense fallback={<FormSkeleton />}>
        <ResetBody />
      </Suspense>
    </AuthShell>
  );
}

/** Only usable with the session a reset link created in the last hour. */
async function ResetBody() {
  if (!(await hasRecentRecovery())) {
    return (
      <div className="grid gap-5">
        <Notice tone="warning">Open this page from the reset link in your email. Links expire after one hour.</Notice>
        <ButtonLink href="/forgot-password" variant="secondary" className="justify-self-start">
          Request a new link
        </ButtonLink>
      </div>
    );
  }
  return <ResetPasswordForm />;
}
