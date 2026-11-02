import { describe, expect, it } from "vitest";
import { safeNext, signInHref } from "./redirect";
import { resetSchema, signUpSchema } from "./schemas";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/gemstones/blue-oval-abc123?x=1")).toBe("/gemstones/blue-oval-abc123?x=1");
  });
  it("refuses anything that could leave the site or loop through auth", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/auth/callback", "/a\nb", "", null, 42]) {
      expect(safeNext(bad), String(bad)).toBe("/account");
    }
  });
  it("encodes the destination into the sign-in link", () => {
    expect(signInHref("/seller?step=a&b=c")).toBe("/sign-in?next=%2Fseller%3Fstep%3Da%26b%3Dc");
  });
});

describe("auth schemas", () => {
  const signUp = { display_name: "Ana", email: " Ana@Example.com ", password: "gemstones12", terms: "on" };
  it("normalises the email and requires terms", () => {
    expect(signUpSchema.parse(signUp).email).toBe("ana@example.com");
    expect(signUpSchema.safeParse({ ...signUp, terms: undefined }).success).toBe(false);
  });
  it("requires a password with letters and digits, at least 10 long", () => {
    expect(signUpSchema.safeParse({ ...signUp, password: "short1" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...signUp, password: "onlyletterslong" }).success).toBe(false);
  });
  it("requires both reset passwords to match", () => {
    expect(resetSchema.safeParse({ password: "gemstones12", confirm: "gemstones13" }).success).toBe(false);
  });
});
