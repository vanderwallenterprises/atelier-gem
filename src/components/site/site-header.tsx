import Link from "next/link";
import { Suspense } from "react";
import { Heart, Search, ShoppingBag, UserRound } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Container } from "@/components/ui/primitives";
import { AccountControl } from "./account-control";
import { DesktopNavLinks } from "./desktop-nav-links";

const iconBase =
  "size-10 items-center justify-center rounded-md text-on-olive/85 transition-colors hover:bg-olive-soft hover:text-on-olive";
const iconLink = `inline-flex ${iconBase}`;
/** Favorites and cart live in the mobile tab bar / account, so the header hides them on phones. */
const iconLinkDesktop = `hidden sm:inline-flex ${iconBase}`;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-olive text-on-olive">
      <Container className="flex h-16 items-center gap-3 sm:gap-6">
        <Wordmark tone="on-olive" />
        <nav aria-label="Main" className="ml-4 hidden lg:block">
          <DesktopNavLinks />
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link href="/search" className={iconLink} aria-label="Search gemstones">
            <Search className="size-[1.15rem]" strokeWidth={1.6} />
          </Link>
          <Link href="/account/favorites" className={iconLinkDesktop} aria-label="Favorites">
            <Heart className="size-[1.15rem]" strokeWidth={1.6} />
          </Link>
          <Link href="/checkout" className={iconLinkDesktop} aria-label="Cart">
            <ShoppingBag className="size-[1.15rem]" strokeWidth={1.6} />
          </Link>
          <Suspense fallback={<span className={iconLink} aria-hidden><UserRound className="size-[1.15rem]" strokeWidth={1.6} /></span>}>
            <AccountControl />
          </Suspense>
        </div>
      </Container>
    </header>
  );
}
