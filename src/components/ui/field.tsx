import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-md border border-line-strong bg-paper px-3.5 text-[0.95rem] text-ink placeholder:text-ink-muted/80 transition-colors focus:border-olive focus:outline-none focus-visible:outline-2 focus-visible:outline-brass aria-[invalid=true]:border-danger disabled:bg-vellum disabled:text-ink-muted";

type FieldProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

/** Label + control + hint + error, wired together for screen readers. */
export function Field({ id, label, hint, error, optional, className, children }: FieldProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-muted">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** aria props for a control inside <Field>. */
export function describedBy(id: string, opts: { hint?: unknown; error?: unknown }) {
  return {
    "aria-invalid": opts.error ? true : undefined,
    "aria-describedby": opts.error ? `${id}-error` : opts.hint ? `${id}-hint` : undefined,
  } as const;
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28 py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-11 appearance-none bg-[length:12px] bg-[right_0.9rem_center] bg-no-repeat pr-9", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%234a4a42' stroke-width='1.5'/%3E%3C/svg%3E\")" }}
      {...rest}>
      {children}
    </select>
  );
}
