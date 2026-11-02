import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell, FormSkeleton } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/auth-forms";
import { Notice } from "@/components/ui/primitives";
import { safeNext } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/env";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage(props: PageProps<"/sign-in">) {
  return (
    <AuthShell
      title="Sign in"
      lede="Pick up your saved stones, designs, and conversations."
      aside={<p>Every stone listed here is one of a kind, and so is every piece designed around one.</p>}
    >
      <Suspense fallback={<FormSkeleton />}>
        <SignInBody searchParams={props.searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function SignInBody({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getSessionUser()) redirect(next);
  return (
    <div className="grid gap-6">
      {sp.link === "expired" && (
        <Notice tone="warning">That link has expired or was already used. Sign in, or request a new link.</Notice>
      )}
      <SignInForm next={next} disabled={!isSupabaseConfigured} />
      <p className="text-sm text-ink-soft">
        New here?{" "}
        <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className="font-medium text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
