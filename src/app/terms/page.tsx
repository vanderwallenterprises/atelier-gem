import type { Metadata } from "next";
import { PolicyPage } from "@/components/site/policy-page";
import { policies } from "@/content/policies";

const policy = policies["terms"];
export const metadata: Metadata = { title: policy.title, description: policy.summary };

export default function Page() {
  return <PolicyPage policy={policy} />;
}
