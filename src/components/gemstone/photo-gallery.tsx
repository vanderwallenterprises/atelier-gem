"use client";

import Image from "next/image";
import { useState } from "react";
import { FacetDiagram, gemTint } from "@/components/brand/facet-diagram";
import { cn } from "@/lib/cn";
import type { GemstoneType } from "@/lib/domain/gemstone";

/** Main photo plus thumbnails; choosing a thumbnail swaps the main photo. */
export function PhotoGallery({ photos, alt, gemstoneType }: { photos: { id: string; url: string }[]; alt: string; gemstoneType: GemstoneType }) {
  const [active, setActive] = useState(0);
  if (photos.length === 0) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center gap-3 rounded-lg border border-line bg-vellum">
        <FacetDiagram className="w-1/2" stroke="var(--color-line-strong)" fill={gemTint[gemstoneType]} strokeWidth={0.8} />
        <span className="text-sm text-ink-muted">The seller hasn&rsquo;t added photos yet</span>
      </div>
    );
  }
  const current = photos[Math.min(active, photos.length - 1)];
  return (
    <div className="grid gap-3">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-vellum">
        <Image src={current.url} alt={`${alt}, photo ${active + 1} of ${photos.length}`} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain" />
      </div>
      {photos.length > 1 && (
        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-6" aria-label="Photos">
          {photos.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-pressed={i === active}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-md border bg-vellum",
                  i === active ? "border-olive ring-1 ring-olive" : "border-line hover:border-ink-muted",
                )}
              >
                <Image src={p.url} alt="" fill sizes="6rem" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
