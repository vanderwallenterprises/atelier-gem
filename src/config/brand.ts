/**
 * Brand settings in one place. "ATELIER GEM" is a working name: change it here and
 * every page title, logo mark, footer and email template follows.
 */
export const brand = {
  name: "ATELIER GEM",
  /** How the name is set in the logotype (keeps the working name easy to swap). */
  wordmark: { primary: "Atelier", secondary: "Gem" },
  tagline: "Choose the stone. Make it yours.",
  description:
    "A marketplace for individual loose gemstones, with a design studio for creating a piece around the stone you choose.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "",
  /** Shown on policy pages until counsel has reviewed them. */
  policiesReviewed: false,
} as const;

export type Brand = typeof brand;
