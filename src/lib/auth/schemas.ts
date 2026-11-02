import { z } from "zod";

// Trim before validating: pasted addresses often carry stray spaces.
const email = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter the email address you use for this account"));
const newPassword = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "Use 72 characters or fewer")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), { message: "Include at least one letter and one number" });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(72),
});

export const signUpSchema = z.object({
  display_name: z.string().trim().min(1, "Tell us what to call you").max(80, "Keep it under 80 characters"),
  email,
  password: newPassword,
  terms: z.literal("on", "Agree to the terms to create an account"),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The two passwords don't match" });

export type { FormState } from "@/lib/forms";
