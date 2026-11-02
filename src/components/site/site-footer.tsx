import Link from "next/link";
import { brand } from "@/config/brand";
import { Wordmark } from "@/components/brand/wordmark";
import { Container } from "@/components/ui/primitives";
import { footerNav } from "./nav-links";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-olive pb-24 text-on-olive lg:pb-0">
      <Container className="grid gap-12 py-16 lg:grid-cols-[1.2fr_2fr]">
        <div className="max-w-sm">
          <Wordmark tone="on-olive" />
          <p className="mt-4 text-sm leading-relaxed text-on-olive-muted">{brand.description}</p>
          <p className="mt-4 text-sm leading-relaxed text-on-olive-muted">
            Stone details come from sellers unless a listing says otherwise. Read how report verification
            works before you buy.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {footerNav.map((group) => (
            <div key={group.title}>
              <h2 className="font-sans text-sm font-medium text-on-olive">{group.title}</h2>
              <ul className="mt-3 grid gap-2">
                {group.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-on-olive-muted transition-colors hover:text-on-olive">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
      <div className="border-t border-on-olive/15">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-on-olive-muted">
          <p>
            {brand.name} is an independent marketplace. It is not affiliated with or endorsed by any gemological
            laboratory.
          </p>
          <p>Copyright {brand.name}</p>
        </Container>
      </div>
    </footer>
  );
}
