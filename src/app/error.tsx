"use client";

import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: string }).digest ?? "") : "";
  return (
    <Container className="flex flex-col items-start gap-5 py-24">
      <h1 className="text-4xl">This page couldn&rsquo;t load</h1>
      <p className="max-w-lg text-lg text-ink-soft">
        Something failed on our side. Try again; if it keeps happening, the reference below helps support find it.
      </p>
      {digest && <p className="text-sm text-ink-muted">Reference: {digest}</p>}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <ButtonLink href="/" variant="secondary">Go to the homepage</ButtonLink>
      </div>
    </Container>
  );
}
