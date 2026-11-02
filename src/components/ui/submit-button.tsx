"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";
import type { ComponentProps } from "react";

/** Submit button that disables itself and says what's happening while its form is pending. */
export function SubmitButton({ pendingLabel, children, ...rest }: ComponentProps<typeof Button> & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...rest} type="submit" disabled={pending || rest.disabled} aria-disabled={pending || undefined}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
