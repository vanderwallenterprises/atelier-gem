/**
 * Crown view of a round brilliant, drawn the way grading reports diagram it: girdle,
 * octagonal table, 8 star facets, 8 bezel (kite) facets, 16 upper-girdle facets.
 * Used as the brand's signature artwork and as the stand-in when a listing has no photo.
 */
type Props = {
  className?: string;
  /** Stroke color; defaults to brass. */
  stroke?: string;
  /** Optional facet fill, e.g. a gemstone tint for placeholders. */
  fill?: string;
  strokeWidth?: number;
  title?: string;
  /** Draw the lines in once on mount (respects reduced motion via globals.css). */
  animated?: boolean;
};

const R = 100; // girdle
const T = 53; // table vertices
const S = 78; // star facet points

function pt(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [+(r * Math.cos(a)).toFixed(2), +(r * Math.sin(a)).toFixed(2)];
}

function geometry() {
  const lines: Array<[[number, number], [number, number]]> = [];
  const table = Array.from({ length: 8 }, (_, k) => pt(T, 22.5 + 45 * k));
  const stars = Array.from({ length: 8 }, (_, k) => pt(S, 45 * (k + 1)));
  for (let k = 0; k < 8; k++) {
    const star = stars[k];
    const angle = 45 * (k + 1);
    // star facet: two table vertices to the star point between them
    lines.push([table[k], star], [table[(k + 1) % 8], star]);
    // bezel facet edges: star point to the girdle points beside it
    lines.push([star, pt(R, angle - 22.5)], [star, pt(R, angle + 22.5)]);
    // upper girdle facets meet the girdle directly below the star point
    lines.push([star, pt(R, angle)]);
  }
  return { table, lines };
}

const { table, lines } = geometry();

export function FacetDiagram({ className, stroke = "var(--color-brass)", fill = "none", strokeWidth = 0.8, title, animated = false }: Props) {
  const draw = (i: number) =>
    animated ? { pathLength: 1, className: "facet-draw", style: { animationDelay: `${120 + i * 14}ms` } } : {};
  return (
    <svg
      viewBox="-104 -104 208 208"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <circle r={R} fill={fill} stroke={stroke} strokeWidth={strokeWidth * 1.4} {...draw(0)} />
      <polygon points={table.map((p) => p.join(",")).join(" ")} fill="none" stroke={stroke} strokeWidth={strokeWidth} {...draw(2)} />
      {lines.map(([a, b], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={stroke} strokeWidth={strokeWidth} {...draw(4 + i)} />
      ))}
    </svg>
  );
}

/** Tints for placeholder art by gemstone type (illustrative only). */
export const gemTint: Record<string, string> = {
  diamond: "#e9eef2",
  sapphire: "#c9d6ee",
  ruby: "#f0cfd2",
  emerald: "#cfe5d6",
  spinel: "#efd3dd",
  tourmaline: "#d7e8cf",
  aquamarine: "#cfe8ea",
  garnet: "#e8c9c4",
  opal: "#ece6f0",
  other: "#ebe4d4",
};
