import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/primitives";
import { requireAccount } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Set up your account", robots: { index: false } };

const paths = [
  {
    href: "/gemstones",
    title: "Buy a loose stone",
    body: "Browse stones with their reports and disclosures and save the ones you like. Checkout opens once payments are switched on.",
    note: "Browsing and saving work now",
  },
  {
    href: "/design-studio",
    title: "Design a piece of jewelry",
    body: "Start from a stone and work out a setting with the AI jeweler, then ask jewelry makers for quotes.",
    note: "Not open yet: see what's planned",
  },
  {
    href: "/onboarding/seller",
    title: "Sell loose gemstones",
    body: "Create a seller profile, then draft and submit listings one stone at a time. Listings go live after marketplace review.",
    note: "Drafting works now; review opens later",
  },
  {
    href: "/jewelers",
    title: "Make jewelry for buyers",
    body: "Jewelry makers will answer quote requests for designs. Read what's involved.",
    note: "Applications not open yet",
  },
] as const;

export default function OnboardingPage() {
  return (
    <Container className="max-w-4xl py-14">
      <Suspense fallback={<Skeleton className="h-12 w-2/3" />}>
        <Greeting />
      </Suspense>
      <p className="mt-4 max-w-2xl text-lg text-ink-soft">
        Choose what you&rsquo;d like to do first. You can do any of these with the same account, and come back here later.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {paths.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="flex h-full flex-col gap-2 rounded-lg border border-line bg-paper p-6 transition-colors hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-brass"
            >
              <span className="font-serif text-2xl text-ink">{p.title}</span>
              <span className="leading-relaxed text-ink-soft">{p.body}</span>
              <span className="mt-auto pt-3 text-sm text-ink-muted">{p.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}

async function Greeting() {
  const account = await requireAccount("/onboarding");
  return <h1 className="text-4xl sm:text-5xl">Welcome{account.displayName ? `, ${account.displayName}` : ""}</h1>;
}
