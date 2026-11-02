import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PolicyPage } from "@/components/site/policy-page";
import { policies } from "@/content/policies";

export function generateStaticParams() {
  return Object.keys(policies)
    .filter((slug) => slug !== "terms" && slug !== "privacy")
    .map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = Object.hasOwn(policies, slug) ? policies[slug] : undefined;
  return p ? { title: p.title, description: p.summary } : {};
}

export default async function Page(props: PageProps<"/policies/[slug]">) {
  const { slug } = await props.params;
  if (slug === "terms" || slug === "privacy") redirect(`/${slug}`);
  if (!Object.hasOwn(policies, slug)) notFound();
  const policy = policies[slug];
  return <PolicyPage policy={policy} />;
}
