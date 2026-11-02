"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/app/auth/actions";
import { describedBy, Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/forms";

const initial: FormState = {};

function FormError({ state }: { state: FormState }) {
  return state.error ? <Notice tone="danger">{state.error}</Notice> : null;
}

function TextField(props: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  state: FormState;
  hint?: string;
  disabled?: boolean;
}) {
  const { name, label, type = "text", autoComplete, state, hint, disabled } = props;
  const error = state.fieldErrors?.[name];
  return (
    <Field id={name} label={label} hint={hint} error={error}>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={state.values?.[name]}
        required
        disabled={disabled}
        {...describedBy(name, { hint, error })}
      />
    </Field>
  );
}

export function SignInForm({ next, disabled }: { next: string; disabled: boolean }) {
  const [state, action] = useActionState(signIn, initial);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormError state={state} />
      <TextField name="email" label="Email" type="email" autoComplete="email" state={state} disabled={disabled} />
      <div className="grid gap-1.5">
        <TextField name="password" label="Password" type="password" autoComplete="current-password" state={state} disabled={disabled} />
        <Link href="/forgot-password" className="justify-self-end text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
          Forgot your password?
        </Link>
      </div>
      <SubmitButton pendingLabel="Signing in…" disabled={disabled} size="lg">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function SignUpForm({ next, disabled }: { next: string; disabled: boolean }) {
  const [state, action] = useActionState(signUp, initial);
  if (state.message) return <Notice tone="success" title="Confirm your email">{state.message}</Notice>;
  const termsError = state.fieldErrors?.terms;
  return (
    <form key={JSON.stringify(state.values ?? null)} action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormError state={state} />
      <TextField name="display_name" label="Your name" autoComplete="name" state={state} disabled={disabled} hint="Shown to sellers and jewelers you message." />
      <TextField name="email" label="Email" type="email" autoComplete="email" state={state} disabled={disabled} />
      <TextField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        state={state}
        disabled={disabled}
        hint="At least 10 characters, with a letter and a number."
      />
      <div className="grid gap-1.5">
        <label className="flex items-start gap-3 text-sm leading-relaxed text-ink-soft">
          <input
            type="checkbox"
            name="terms"
            defaultChecked={state.values?.terms === "on"}
            className="mt-0.5 size-4 accent-olive"
            disabled={disabled}
            {...describedBy("terms", { error: termsError })}
          />
          <span>
            I agree to the <Link href="/terms" className="underline underline-offset-4">terms of use</Link> and have read the{" "}
            <Link href="/privacy" className="underline underline-offset-4">privacy policy</Link>.
          </span>
        </label>
        {termsError && <p id="terms-error" role="alert" className="text-sm text-danger">{termsError}</p>}
      </div>
      <SubmitButton pendingLabel="Creating account…" disabled={disabled} size="lg">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm({ disabled }: { disabled: boolean }) {
  const [state, action] = useActionState(requestPasswordReset, initial);
  if (state.message) return <Notice tone="success" title="Check your email">{state.message}</Notice>;
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormError state={state} />
      <TextField name="email" label="Email" type="email" autoComplete="email" state={state} disabled={disabled} />
      <SubmitButton pendingLabel="Sending…" disabled={disabled} size="lg">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormError state={state} />
      <TextField
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        state={state}
        hint="At least 10 characters, with a letter and a number."
      />
      <TextField name="confirm" label="Repeat new password" type="password" autoComplete="new-password" state={state} />
      <SubmitButton pendingLabel="Saving…" size="lg">
        Save new password
      </SubmitButton>
    </form>
  );
}
