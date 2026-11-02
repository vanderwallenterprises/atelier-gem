import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      lede="Enter the email address on your account and we'll send a link to choose a new password."
      aside={<p>Reset links work once and expire after an hour.</p>}
    >
      <div className="grid gap-6">
        <ForgotPasswordForm disabled={!isSupabaseConfigured} />
        <Link href="/sign-in" className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
