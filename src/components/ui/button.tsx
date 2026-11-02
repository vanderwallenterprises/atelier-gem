import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet" | "danger" | "on-olive";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-200 ease-[var(--ease-quiet)] disabled:cursor-not-allowed disabled:opacity-55 whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-olive text-on-olive hover:bg-olive-soft",
  secondary: "border border-line-strong bg-paper text-ink hover:border-ink-muted hover:bg-vellum",
  quiet: "text-ink-soft underline-offset-4 hover:text-ink hover:underline",
  danger: "border border-danger/40 bg-danger-wash text-danger hover:border-danger",
  "on-olive": "bg-brass-wash text-olive hover:bg-ivory",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-13 px-7 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(base, variants[variant], variant === "quiet" ? "h-auto px-0" : sizes[size], extra);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant = "primary", size = "md", className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...rest} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode };

export function ButtonLink({ variant = "primary", size = "md", className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
