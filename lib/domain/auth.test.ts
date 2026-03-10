import { describe, expect, it } from "vitest";
import {
  buildLoginIdentifier,
  buildSyntheticEmail,
  normalizeIdentifier,
  normalizeOwnerRegistrationInput,
} from "@/lib/domain/auth";

describe("normalizeIdentifier", () => {
  it("normalizes spacing and casing", () => {
    expect(normalizeIdentifier("  Happy Kitchen  Team ")).toBe("happy-kitchen-team");
  });

  it("removes unsupported characters and keeps dots underscores and dashes", () => {
    expect(normalizeIdentifier("Owner.! user_01/#")).toBe("owner.-user_01");
  });
});

describe("buildSyntheticEmail", () => {
  it("builds a deterministic synthetic email from normalized values", () => {
    expect(buildSyntheticEmail(" Owner.User ", " My Org ")).toBe(
      "owner.user__my-org@auth.hassep.local",
    );
  });
});

describe("normalizeOwnerRegistrationInput", () => {
  it("normalizes owner registration fields and uses the explicit owner username", () => {
    expect(
      normalizeOwnerRegistrationInput({
        restaurantName: "  Test Bistro  ",
        organizationCode: " Test Org ",
        ownerEmail: " Owner@Example.COM ",
        ownerUsername: " Owner User ",
      }),
    ).toEqual({
      restaurantName: "Test Bistro",
      organizationCode: "test-org",
      ownerEmail: "owner@example.com",
      ownerUsername: "owner-user",
      syntheticEmail: "owner-user__test-org@auth.hassep.local",
    });
  });

  it("falls back to a derived username only when an explicit one is missing", () => {
    expect(
      normalizeOwnerRegistrationInput({
        restaurantName: "Bistro",
        organizationCode: "bg-central",
        ownerEmail: "Owner+Main@Example.com",
      }).ownerUsername,
    ).toBe("ownermain");
  });
});

describe("buildLoginIdentifier", () => {
  it("composes the normalized login email from organization code and username", () => {
    expect(
      buildLoginIdentifier({
        organizationCode: " Happy BG ",
        username: " Ivan Petrov ",
      }),
    ).toEqual({
      organizationCode: "happy-bg",
      username: "ivan-petrov",
      email: "ivan-petrov__happy-bg@auth.hassep.local",
    });
  });
});
