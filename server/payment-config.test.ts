import { describe, it, expect } from "vitest";

describe("Payment Configuration", () => {
  it("should have OWNER_CLABE configured", () => {
    const clabe = process.env.OWNER_CLABE;
    expect(clabe).toBeDefined();
    expect(clabe).toBe("722969010700732537");
    expect(clabe).toHaveLength(18); // CLABE should be 18 digits
  });

  it("should have OWNER_PHONE configured", () => {
    const phone = process.env.OWNER_PHONE;
    expect(phone).toBeDefined();
    expect(phone).toBe("7354946224");
    expect(phone).toMatch(/^\d{10}$/); // Mexican phone number format
  });

  it("should have OWNER_EMAIL configured", () => {
    const email = process.env.OWNER_EMAIL;
    expect(email).toBeDefined();
    expect(email).toBe("cyberpiezas207@gmail.com");
    expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/); // Basic email validation
  });

  it("should have all payment secrets configured together", () => {
    const clabe = process.env.OWNER_CLABE;
    const phone = process.env.OWNER_PHONE;
    const email = process.env.OWNER_EMAIL;

    expect(clabe && phone && email).toBeTruthy();
    expect({
      clabe,
      phone,
      email,
    }).toEqual({
      clabe: "722969010700732537",
      phone: "7354946224",
      email: "cyberpiezas207@gmail.com",
    });
  });
});
