import type { z } from "zod";

export type FieldErrors = Record<string, string>;

/** Shared result shape for form actions used with useActionState. */
export type FormState = {
  error?: string;
  fieldErrors?: FieldErrors;
  message?: string;
  values?: Record<string, string>;
};

/** One message per field (the first issue), keyed by the top-level field name. */
export function firstErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/**
 * String fields of a FormData, for re-filling a form after a failed submit. Repeated keys
 * (checkbox groups) are joined with commas; an unchecked checkbox is simply absent.
 */
export function formValues(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v !== "string" || k.startsWith("$") || k === "password" || k === "confirm") continue;
    out[k] = k in out ? `${out[k]},${v}` : v;
  }
  return out;
}

/** Whether a re-filled or saved value means "checked" (form "on", or a saved boolean). */
export function isChecked(value: string | undefined): boolean {
  return value === "on" || value === "true";
}
