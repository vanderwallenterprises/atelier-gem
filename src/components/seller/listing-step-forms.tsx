"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { describedBy, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { GEMSTONE_TYPES, GRADING_LABS, ORIGIN_CLASSES, SHAPES, TREATMENT_STATUSES } from "@/lib/domain/gemstone";
import { LISTING_CURRENCIES, SHIPPING_REGIONS } from "@/lib/domain/listing-wizard";
import { isChecked, type FormState } from "@/lib/forms";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
type Defaults = Record<string, string | number | boolean | string[] | null | undefined>;

/** Wraps a wizard step: errors, re-filled values after a failed save, and the save buttons. */
function StepForm({
  action,
  defaults,
  submitLabel = "Save and continue",
  allowExit = true,
  children,
}: {
  action: Action;
  defaults: Defaults;
  submitLabel?: string;
  allowExit?: boolean;
  children: (f: { value: (k: string) => string; error: (k: string) => string | undefined }) => ReactNode;
}) {
  const [state, formAction] = useActionState(action, {} as FormState);
  const value = (k: string) => (state.values ? state.values[k] ?? "" : defaults[k] == null ? "" : String(defaults[k]));
  const summary = useRef<HTMLDivElement>(null);
  // Move focus to the error summary so keyboard and screen-reader users hear what failed.
  useEffect(() => {
    if (state.error || state.fieldErrors) summary.current?.focus();
  }, [state]);
  const error = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <div ref={summary} tabIndex={-1} className="grid gap-3 focus:outline-none empty:hidden">
        {state.error && <Notice tone="danger">{state.error}</Notice>}
        {state.fieldErrors && !state.error && <Notice tone="danger">Some fields need attention. They&rsquo;re marked below.</Notice>}
      </div>
      {/* Remount fields after each failed save so defaultValue picks up the re-filled values. */}
      <div key={JSON.stringify(state.values ?? null)} className="grid gap-6">
        {children({ value, error })}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        {allowExit && (
          <SubmitButton pendingLabel="Saving…" variant="secondary" name="intent" value="exit">
            Save and exit
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

function Options({ map, placeholder }: { map: Record<string, string>; placeholder?: string }) {
  return (
    <>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {Object.entries(map).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
    </>
  );
}

export function StoneStepForm({ action, defaults }: { action: Action; defaults: Defaults }) {
  return (
    <StepForm action={action} defaults={defaults}>
      {({ value, error }) => (
        <>
          <Field id="title" label="Listing title" hint="What a buyer would search for, for example: Unheated cornflower-blue oval sapphire." error={error("title")}>
            <Input id="title" name="title" required maxLength={140} defaultValue={value("title")} {...describedBy("title", { hint: 1, error: error("title") })} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="gemstone_type" label="Gemstone" error={error("gemstone_type")}>
              <Select id="gemstone_type" name="gemstone_type" required defaultValue={value("gemstone_type")} {...describedBy("gemstone_type", { error: error("gemstone_type") })}>
                <Options map={GEMSTONE_TYPES} placeholder="Choose the gemstone" />
              </Select>
            </Field>
            <Field id="variety" label="Variety or trade name" optional hint="For example padparadscha, tsavorite, Paraíba." error={error("variety")}>
              <Input id="variety" name="variety" maxLength={80} defaultValue={value("variety")} {...describedBy("variety", { hint: 1, error: error("variety") })} />
            </Field>
            <Field id="shape" label="Shape" error={error("shape")}>
              <Select id="shape" name="shape" required defaultValue={value("shape")} {...describedBy("shape", { error: error("shape") })}>
                <Options map={SHAPES} placeholder="Choose the shape" />
              </Select>
            </Field>
            <Field id="natural_or_lab_grown" label="Natural or laboratory-grown" error={error("natural_or_lab_grown")}>
              <Select id="natural_or_lab_grown" name="natural_or_lab_grown" required defaultValue={value("natural_or_lab_grown") || "unknown"} {...describedBy("natural_or_lab_grown", { error: error("natural_or_lab_grown") })}>
                <Options map={ORIGIN_CLASSES} />
              </Select>
            </Field>
          </div>
          <Field id="description" label="Description" optional hint="What makes the stone worth a look: color in different light, cutting, provenance you can document." error={error("description")}>
            <Textarea id="description" name="description" maxLength={6000} rows={6} defaultValue={value("description")} {...describedBy("description", { hint: 1, error: error("description") })} />
          </Field>
        </>
      )}
    </StepForm>
  );
}

export function MeasurementsStepForm({ action, defaults }: { action: Action; defaults: Defaults }) {
  const num = (id: string, label: string, unit: string, f: { value: (k: string) => string; error: (k: string) => string | undefined }, optional = true) => (
    <Field id={id} label={`${label} (${unit})`} optional={optional} error={f.error(id)}>
      <Input id={id} name={id} inputMode="decimal" defaultValue={f.value(id)} {...describedBy(id, { error: f.error(id) })} />
    </Field>
  );
  return (
    <StepForm action={action} defaults={defaults}>
      {(f) => (
        <>
          <p className="text-sm text-ink-muted">Copy these from the grading report when there is one. They&rsquo;re checked against the report during verification.</p>
          <div className="grid gap-5 sm:grid-cols-4">
            {num("carat_weight", "Weight", "ct", f, false)}
            {num("length_mm", "Length", "mm", f)}
            {num("width_mm", "Width", "mm", f)}
            {num("depth_mm", "Depth", "mm", f)}
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="color_description" label="Color" optional hint="Grade or description, for example F, or vivid pinkish red." error={f.error("color_description")}>
              <Input id="color_description" name="color_description" maxLength={80} defaultValue={f.value("color_description")} {...describedBy("color_description", { hint: 1, error: f.error("color_description") })} />
            </Field>
            <Field id="clarity_grade" label="Clarity" optional hint="For example VS1, or eye-clean." error={f.error("clarity_grade")}>
              <Input id="clarity_grade" name="clarity_grade" maxLength={40} defaultValue={f.value("clarity_grade")} {...describedBy("clarity_grade", { hint: 1, error: f.error("clarity_grade") })} />
            </Field>
            <Field id="cut_grade" label="Cut" optional hint="Cut grade where the lab gives one." error={f.error("cut_grade")}>
              <Input id="cut_grade" name="cut_grade" maxLength={40} defaultValue={f.value("cut_grade")} {...describedBy("cut_grade", { hint: 1, error: f.error("cut_grade") })} />
            </Field>
          </div>
        </>
      )}
    </StepForm>
  );
}

export function DisclosuresStepForm({ action, defaults }: { action: Action; defaults: Defaults }) {
  return (
    <StepForm action={action} defaults={defaults}>
      {({ value, error }) => (
        <>
          <Field id="treatment_status" label="Treatment" hint="Heating counts as a treatment. Choose unknown if you can't say for sure." error={error("treatment_status")}>
            <Select id="treatment_status" name="treatment_status" required defaultValue={value("treatment_status") || "unknown"} {...describedBy("treatment_status", { hint: 1, error: error("treatment_status") })}>
              <Options map={TREATMENT_STATUSES} />
            </Select>
          </Field>
          <Field id="treatment_description" label="Treatment details" optional hint="Required when the stone is treated: the kind and degree, as the report states it." error={error("treatment_description")}>
            <Textarea id="treatment_description" name="treatment_description" maxLength={2000} defaultValue={value("treatment_description")} {...describedBy("treatment_description", { hint: 1, error: error("treatment_description") })} />
          </Field>
          <Field id="origin_claim" label="Geographic origin" optional hint="Only if you can support it. It's shown as your statement until documents are reviewed." error={error("origin_claim")}>
            <Input id="origin_claim" name="origin_claim" maxLength={120} placeholder="For example Sri Lanka" defaultValue={value("origin_claim")} {...describedBy("origin_claim", { hint: 1, error: error("origin_claim") })} />
          </Field>
          <Field id="disclosure_notes" label="Anything else a buyer should know" optional hint="Chips, abrasions, repolishing, or anything the photos don't show." error={error("disclosure_notes")}>
            <Textarea id="disclosure_notes" name="disclosure_notes" maxLength={2000} defaultValue={value("disclosure_notes")} {...describedBy("disclosure_notes", { hint: 1, error: error("disclosure_notes") })} />
          </Field>
        </>
      )}
    </StepForm>
  );
}

export function ReportStepForm({ action, defaults }: { action: Action; defaults: Defaults }) {
  return (
    <StepForm action={action} defaults={defaults}>
      {({ value, error }) => (
        <>
          <Field id="grading_lab" label="Grading laboratory" hint="Choose no grading report if the stone hasn't been graded." error={error("grading_lab")}>
            <Select id="grading_lab" name="grading_lab" required defaultValue={value("grading_lab") || "none"} {...describedBy("grading_lab", { hint: 1, error: error("grading_lab") })}>
              <Options map={GRADING_LABS} />
            </Select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="report_number" label="Report number" optional hint="As printed on the report." error={error("report_number")}>
              <Input id="report_number" name="report_number" maxLength={30} autoComplete="off" defaultValue={value("report_number")} {...describedBy("report_number", { hint: 1, error: error("report_number") })} />
            </Field>
            <Field id="report_date" label="Report date" optional error={error("report_date")}>
              <Input id="report_date" name="report_date" type="date" defaultValue={value("report_date")} {...describedBy("report_date", { error: error("report_date") })} />
            </Field>
          </div>
          <Field id="report_url" label="Link to the report" optional hint="Only a link the laboratory itself provides. It's used during verification." error={error("report_url")}>
            <Input id="report_url" name="report_url" type="url" inputMode="url" placeholder="https://" defaultValue={value("report_url")} {...describedBy("report_url", { hint: 1, error: error("report_url") })} />
          </Field>
        </>
      )}
    </StepForm>
  );
}

export function PriceStepForm({ action, defaults, livePriceOnly }: { action: Action; defaults: Defaults; livePriceOnly: boolean }) {
  return (
    <StepForm action={action} defaults={defaults} submitLabel={livePriceOnly ? "Save price" : "Save and continue"} allowExit={!livePriceOnly}>
      {({ value, error }) => {
        const regions = new Set(value("shipping_regions").split(",").filter(Boolean));
        return (
          <>
            {livePriceOnly && (
              <Notice>
                This listing is live, so only its price can change here, and the new price shows straight away. To change shipping
                or anything else, withdraw the listing first.
              </Notice>
            )}
            <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
              <Field id="asking_price" label="Asking price" hint="The price buyers pay for the stone, before shipping." error={error("asking_price")}>
                <Input id="asking_price" name="asking_price" inputMode="decimal" required defaultValue={value("asking_price")} {...describedBy("asking_price", { hint: 1, error: error("asking_price") })} />
              </Field>
              <Field id="currency" label="Currency" error={error("currency")}>
                <Select id="currency" name="currency" defaultValue={value("currency") || "USD"} {...describedBy("currency", { error: error("currency") })}>
                  {LISTING_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
            {!livePriceOnly && (
              <>
                <fieldset className="grid gap-2" aria-describedby={error("shipping_regions") ? "shipping_regions-error" : undefined}>
                  <legend className="text-sm font-medium text-ink">Where you ship</legend>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    {Object.entries(SHIPPING_REGIONS).map(([k, label]) => (
                      <label key={k} className="flex items-center gap-3 text-sm text-ink-soft">
                        <input type="checkbox" name="shipping_regions" value={k} defaultChecked={regions.has(k)} className="size-4 accent-olive" />
                        {label}
                      </label>
                    ))}
                  </div>
                  {error("shipping_regions") && <p id="shipping_regions-error" role="alert" className="text-sm text-danger">{error("shipping_regions")}</p>}
                </fieldset>
                <Field id="handling_days" label="Handling time (days)" hint="Business days from sale to handing the stone to the carrier." error={error("handling_days")} className="max-w-xs">
                  <Input id="handling_days" name="handling_days" inputMode="numeric" required defaultValue={value("handling_days")} {...describedBy("handling_days", { hint: 1, error: error("handling_days") })} />
                </Field>
                <div className="grid gap-2">
                  <label className="flex items-center gap-3 text-sm text-ink-soft">
                    <input type="checkbox" name="ships_insured" defaultChecked={isChecked(value("ships_insured"))} className="size-4 accent-olive" />
                    Shipped fully insured
                  </label>
                  <label className="flex items-center gap-3 text-sm text-ink-soft">
                    <input type="checkbox" name="ships_tracked" defaultChecked={isChecked(value("ships_tracked"))} className="size-4 accent-olive" />
                    Shipped with tracking and signature on delivery
                  </label>
                </div>
                <Field id="return_policy" label="Returns for this stone" optional hint="Leave empty to use your seller return policy." error={error("return_policy")}>
                  <Textarea id="return_policy" name="return_policy" maxLength={2000} defaultValue={value("return_policy")} {...describedBy("return_policy", { hint: 1, error: error("return_policy") })} />
                </Field>
              </>
            )}
          </>
        );
      }}
    </StepForm>
  );
}

/** Single-file upload that resets after each successful upload. */
export function UploadForm({ action, accept, label, hint }: { action: Action; accept: string; label: string; hint: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (prev: FormState, form: FormData) => {
    const result = await action(prev, form);
    if (result.message) ref.current?.reset();
    return result;
  }, {} as FormState);
  const error = state.fieldErrors?.file;
  return (
    <form ref={ref} action={formAction} className="grid gap-3 rounded-lg border border-dashed border-line-strong bg-paper/60 p-5">
      <Field id="file" label={label} hint={hint} error={error}>
        <input
          id="file"
          name="file"
          type="file"
          accept={accept}
          required
          className="text-sm text-ink-soft file:mr-4 file:h-10 file:rounded-md file:border file:border-line-strong file:bg-paper file:px-4 file:text-ink hover:file:bg-vellum"
          {...describedBy("file", { hint, error })}
        />
      </Field>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}
      <SubmitButton pendingLabel="Uploading…" variant="secondary" className="justify-self-start">
        Upload
      </SubmitButton>
    </form>
  );
}

export function SubmitListingForm({ action, disabled }: { action: (prev: FormState) => Promise<FormState>; disabled: boolean }) {
  const [state, formAction] = useActionState(action, {} as FormState);
  return (
    <form action={formAction} className="grid gap-4">
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <SubmitButton pendingLabel="Submitting…" size="lg" disabled={disabled} className="justify-self-start">
        Submit for review
      </SubmitButton>
    </form>
  );
}
