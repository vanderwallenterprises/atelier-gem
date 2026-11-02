import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Container({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[84rem] px-4 sm:px-6 lg:px-10", className)} {...rest} />;
}

type Tone = "neutral" | "brass" | "success" | "warning" | "danger" | "outline";
const tones: Record<Tone, string> = {
  neutral: "bg-vellum text-ink-soft",
  brass: "bg-brass-wash text-brass-ink",
  success: "bg-success-wash text-success",
  warning: "bg-warning-wash text-warning",
  danger: "bg-danger-wash text-danger",
  outline: "border border-line-strong text-ink-soft",
};

/** Small status label. Square-ish corners on purpose: avoids a wall of pills. */
export function Badge({ tone = "neutral", className, ...rest }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium leading-5", tones[tone], className)}
      {...rest}
    />
  );
}

export function Surface({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-line bg-paper", className)} {...rest} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-vellum", className)} />;
}

type NoticeTone = "info" | "warning" | "danger" | "success";
const noticeTones: Record<NoticeTone, string> = {
  info: "border-line-strong bg-paper text-ink-soft",
  warning: "border-warning/30 bg-warning-wash text-warning",
  danger: "border-danger/30 bg-danger-wash text-danger",
  success: "border-success/30 bg-success-wash text-success",
};

export function Notice({ tone = "info", title, children, className }: { tone?: NoticeTone; title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-md border px-4 py-3 text-sm leading-relaxed", noticeTones[tone], className)}>
      {title && <p className="font-medium text-ink">{title}</p>}
      {children && <div className={title ? "mt-1" : undefined}>{children}</div>}
    </div>
  );
}

/** An empty screen is an invitation to act: say what's missing and what to do next. */
export function EmptyState({ title, children, action, art }: { title: ReactNode; children?: ReactNode; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-line-strong bg-paper/60 px-6 py-10 sm:px-10">
      {art}
      <h2 className="text-2xl text-ink">{title}</h2>
      {children && <div className="prose-measure text-ink-soft">{children}</div>}
      {action}
    </div>
  );
}

export function SectionHeading({ title, lede, className, as: Tag = "h2" }: { title: ReactNode; lede?: ReactNode; className?: string; as?: "h1" | "h2" }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <Tag className={Tag === "h1" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}>{title}</Tag>
      {lede && <p className="mt-3 text-lg text-ink-soft">{lede}</p>}
    </div>
  );
}
