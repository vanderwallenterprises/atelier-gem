import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Checkout" };

/**
 * Each gemstone is unique, so purchases start from the stone's page ("Buy this stone")
 * rather than a multi-item cart. Checkout sessions are created server-side in Phase 7.
 */
export default function CheckoutPage() {
  return (
    <Container className="py-14">
      <h1 className="text-4xl sm:text-5xl">Checkout</h1>
      <div className="mt-10">
        <EmptyState title="Nothing to check out yet" action={<ButtonLink href="/gemstones">Browse gemstones</ButtonLink>}>
          <p>
            Every stone here is one of a kind, so checkout starts from the stone&rsquo;s own page. Custom pieces are
            paid for after you approve a jewelry maker&rsquo;s quote.
          </p>
        </EmptyState>
      </div>
    </Container>
  );
}
