"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Compass, Heart, PenTool, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { isActive } from "./desktop-nav-links";

const items = [
  { href: "/", label: "Discover", Icon: Compass },
  { href: "/search", label: "Search", Icon: Search },
  { href: "/account/favorites", label: "Saved", Icon: Heart },
  { href: "/design-studio", label: "Studio", Icon: PenTool },
  { href: "/account", label: "Profile", Icon: UserRound },
] as const;

/** Bottom tab bar on small screens. The active tab streams in once the URL is known. */
export function MobileNav() {
  return (
    <Suspense fallback={<TabBar pathname={null} />}>
      <LiveTabBar />
    </Suspense>
  );
}

function LiveTabBar() {
  return <TabBar pathname={usePathname()} />;
}

function TabBar({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] transition-colors",
                  active ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                <Icon className={cn("size-5", active && "text-brass-ink")} strokeWidth={1.6} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
