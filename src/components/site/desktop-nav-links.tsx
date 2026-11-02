"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/cn";
import { primaryNav } from "./nav-links";

function isActive(pathname: string | null, href: string) {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The current page is only known at request time, so the links prerender without an active
 * marker and the marked version streams in (keeps dynamic routes prerenderable).
 */
export function DesktopNavLinks() {
  return (
    <Suspense fallback={<NavList pathname={null} />}>
      <LiveNavList />
    </Suspense>
  );
}

function LiveNavList() {
  return <NavList pathname={usePathname()} />;
}

function NavList({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex items-center gap-1">
      {primaryNav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative rounded-md px-3 py-2 text-sm transition-colors",
                active ? "text-on-olive" : "text-on-olive-muted hover:text-on-olive",
                active && "after:absolute after:inset-x-3 after:-bottom-[13px] after:h-px after:bg-brass",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export { isActive };
