import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell, FormSkeleton } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/auth-forms";
import { safeNext } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/env";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage(props: PageProps<"/sign-up">) {
  return (
    <AuthShell
      title="Create an account"
      lede="One account to buy stones, design jewelry, and, once approved, sell or take commissions."
      aside={<p>Save stones you love, design around them in the studio, and ask jewelers for quotes.</p>}
    >
      <Suspense fallback={<FormSkeleton />}>
        <SignUpBody searchParams={props.searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function SignUpBody({ searchParams }: { searchParams: PageProps<"/sign-up">["searchParams"] }) {
  const next = safeNext((await searchParams).next, "/onboarding");
  if (await getSessionUser()) redirect(next);
  return (
    <div className="grid gap-6">
      <SignUpForm next={next} disabled={!isSupabaseConfigured} />
      <p className="text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="font-medium text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
