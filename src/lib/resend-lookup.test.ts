import { describe, it, expect } from "vitest";
import { extractReference, normalizeEmail, closeEmails } from "../../supabase/functions/_shared/resend-lookup";

const REF = "OTP-32533635-0fc1-4dde-af65-430538c70492";
describe("resend lookup", () => {
  it("pulls the reference out of pasted text with a label and spaces", () => {
    expect(extractReference(`Reference  ${REF}`)).toBe(REF);
    expect(extractReference(`  ${REF.toUpperCase()}\u200B `)).toBe(REF);
    expect(extractReference("Reference OTP-32533635-0fc1-4dde-af65-\n430538c70492")).toBe(REF);
  });
  it("normalizes emails", () => {
    expect(normalizeEmail(" Bhadbdsweet@Gmail.com ")).toBe("bhadbdsweet@gmail.com");
  });
  it("suggests the paying email when the typed one is off by a letter", () => {
    expect(closeEmails("bhadndsweet@gmail.com", ["bhadbdsweet@gmail.com", "someone@gmail.com"])).toEqual(["bhadbdsweet@gmail.com"]);
  });
});
