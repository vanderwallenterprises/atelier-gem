import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { GEMSTONE_TYPES, GRADING_LABS, ORIGIN_CLASSES, SHAPES, SORTS, TREATMENT_STATUSES } from "@/lib/domain/gemstone";
import type { ListingSearch } from "@/lib/domain/search-params";

function Options({ map, any }: { map: Record<string, string>; any: string }) {
  return (
    <>
      <option value="">{any}</option>
      {Object.entries(map).map(([k, v]) => (
        <option key={k} value={k}>{v}</option>
      ))}
    </>
  );
}

/** Plain GET form: filters live in the URL and work without JavaScript. */
export function FilterPanel({ s, action = "/gemstones", idPrefix = "" }: { s: ListingSearch; action?: string; idPrefix?: string }) {
  const id = (x: string) => `${idPrefix}${x}`;
  const v = (x: unknown) => (x === undefined ? "" : String(x));
  return (
    <form method="get" action={action} className="grid gap-5" aria-label="Filter gemstones">
      {s.q && <input type="hidden" name="q" value={s.q} />}
      <Field id={id("f-sort")} label="Sort by">
        <Select id={id("f-sort")} name="sort" defaultValue={s.sort}>
          {Object.entries(SORTS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </Select>
      </Field>
      <Field id={id("f-type")} label="Gemstone">
        <Select id={id("f-type")} name="type" defaultValue={v(s.type)}><Options map={GEMSTONE_TYPES} any="Any gemstone" /></Select>
      </Field>
      <Field id={id("f-shape")} label="Shape">
        <Select id={id("f-shape")} name="shape" defaultValue={v(s.shape)}><Options map={SHAPES} any="Any shape" /></Select>
      </Field>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Price (USD)</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input name="min_price" inputMode="numeric" placeholder="Min" aria-label="Minimum price" defaultValue={v(s.min_price)} />
          <Input name="max_price" inputMode="numeric" placeholder="Max" aria-label="Maximum price" defaultValue={v(s.max_price)} />
        </div>
      </fieldset>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Carat weight</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input name="min_carat" inputMode="decimal" placeholder="Min" aria-label="Minimum carat weight" defaultValue={v(s.min_carat)} />
          <Input name="max_carat" inputMode="decimal" placeholder="Max" aria-label="Maximum carat weight" defaultValue={v(s.max_carat)} />
        </div>
      </fieldset>
      <Field id={id("f-color")} label="Color contains" hint="For example: blue, pink, D, G">
        <Input id={id("f-color")} name="color" defaultValue={v(s.color)} maxLength={40} />
      </Field>
      <Field id={id("f-origin")} label="Natural or lab-grown">
        <Select id={id("f-origin")} name="origin" defaultValue={v(s.origin)}><Options map={ORIGIN_CLASSES} any="Either" /></Select>
      </Field>
      <Field id={id("f-treatment")} label="Treatment">
        <Select id={id("f-treatment")} name="treatment" defaultValue={v(s.treatment)}><Options map={TREATMENT_STATUSES} any="Any" /></Select>
      </Field>
      <Field id={id("f-lab")} label="Grading laboratory">
        <Select id={id("f-lab")} name="lab" defaultValue={v(s.lab)}><Options map={GRADING_LABS} any="Any laboratory" /></Select>
      </Field>
      <div className="grid gap-2.5">
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" name="verified" value="1" defaultChecked={!!s.verified} className="size-4 accent-[var(--color-olive)]" />
          Report verified only
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" name="available" value="1" defaultChecked={!!s.available} className="size-4 accent-[var(--color-olive)]" />
          Available now
        </label>
      </div>
      {s.seller && <input type="hidden" name="seller" value={s.seller} />}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">Apply filters</Button>
        <ButtonLink href={action} variant="secondary">Clear</ButtonLink>
      </div>
    </form>
  );
}
