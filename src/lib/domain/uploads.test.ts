import { describe, expect, it } from "vitest";
import { checkUpload, PHOTO_MAX_BYTES, sniffType } from "./uploads";

const bytes = (...v: number[]) => new Uint8Array(v);
const text = (s: string) => new TextEncoder().encode(s);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const WEBP = new Uint8Array([...text("RIFF"), 0, 0, 0, 0, ...text("WEBP")]);
const PDF = text("%PDF-1.7");

describe("sniffType", () => {
  it("recognises allowed formats by content", () => {
    expect(sniffType(JPEG)?.ext).toBe("jpg");
    expect(sniffType(PNG)?.ext).toBe("png");
    expect(sniffType(WEBP)?.ext).toBe("webp");
    expect(sniffType(PDF)?.ext).toBe("pdf");
  });
  it("rejects anything else, including HTML and SVG", () => {
    expect(sniffType(text("<svg xmlns"))).toBeNull();
    expect(sniffType(text("<!doctype html>"))).toBeNull();
    expect(sniffType(bytes())).toBeNull();
  });
});

describe("checkUpload", () => {
  it("accepts a photo within the size limit", () => {
    expect(checkUpload({ size: 1000, head: JPEG }, "photo")).toMatchObject({ ok: true });
  });
  it("rejects empty, oversized, and PDF photos", () => {
    expect(checkUpload({ size: 0, head: JPEG }, "photo").ok).toBe(false);
    expect(checkUpload({ size: PHOTO_MAX_BYTES + 1, head: JPEG }, "photo").ok).toBe(false);
    expect(checkUpload({ size: 1000, head: PDF }, "photo").ok).toBe(false);
  });
  it("accepts a PDF report document", () => {
    expect(checkUpload({ size: 1000, head: PDF }, "document")).toMatchObject({ ok: true, type: { mime: "application/pdf" } });
  });
});
