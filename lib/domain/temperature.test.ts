import { describe, expect, it } from "vitest";
import { isTempOutOfRange, requiresCorrectiveAction } from "@/lib/domain/temperature";

describe("isTempOutOfRange", () => {
  const fridge = { min_temp: 0, max_temp: 5 };
  const freezer = { min_temp: -22, max_temp: -16 };
  const room = { min_temp: 18, max_temp: 25 };

  it("returns false when temp is within fridge range", () => {
    expect(isTempOutOfRange(3, fridge)).toBe(false);
  });

  it("returns false at exact min boundary", () => {
    expect(isTempOutOfRange(0, fridge)).toBe(false);
  });

  it("returns false at exact max boundary", () => {
    expect(isTempOutOfRange(5, fridge)).toBe(false);
  });

  it("returns true when temp exceeds fridge max", () => {
    expect(isTempOutOfRange(5.1, fridge)).toBe(true);
  });

  it("returns true when temp is below fridge min", () => {
    expect(isTempOutOfRange(-0.5, fridge)).toBe(true);
  });

  it("returns true when freezer temp is too warm", () => {
    expect(isTempOutOfRange(-10, freezer)).toBe(true);
  });

  it("returns false when freezer temp is in range", () => {
    expect(isTempOutOfRange(-18, freezer)).toBe(false);
  });

  it("returns true when room temp is too cold", () => {
    expect(isTempOutOfRange(15, room)).toBe(true);
  });

  it("returns false when room temp is in range", () => {
    expect(isTempOutOfRange(22, room)).toBe(false);
  });
});

describe("requiresCorrectiveAction", () => {
  const fridge = { min_temp: 0, max_temp: 5 };

  it("requires corrective action when temp is out of range", () => {
    expect(requiresCorrectiveAction(7, fridge)).toBe(true);
  });

  it("does not require corrective action when temp is in range", () => {
    expect(requiresCorrectiveAction(3, fridge)).toBe(false);
  });

  it("does not require corrective action at boundary", () => {
    expect(requiresCorrectiveAction(5, fridge)).toBe(false);
  });
});
