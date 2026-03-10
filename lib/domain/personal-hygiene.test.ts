import { describe, it, expect } from "vitest";
import {
  HYGIENE_CHECKLIST_ITEMS,
  areAllPassed,
  getFailedItems,
  buildChecklistResult,
  buildNotes,
  deriveLogStatus,
} from "./personal-hygiene";

describe("areAllPassed", () => {
  it("returns true when every item is true", () => {
    const result = Object.fromEntries(HYGIENE_CHECKLIST_ITEMS.map((k) => [k, true]));
    expect(areAllPassed(result)).toBe(true);
  });

  it("returns false when at least one item is false", () => {
    const result = Object.fromEntries(HYGIENE_CHECKLIST_ITEMS.map((k) => [k, true]));
    result[HYGIENE_CHECKLIST_ITEMS[0]] = false;
    expect(areAllPassed(result)).toBe(false);
  });

  it("returns false when items are missing (undefined keys)", () => {
    expect(areAllPassed({})).toBe(false);
  });
});

describe("getFailedItems", () => {
  it("returns empty array when all items pass", () => {
    const result = Object.fromEntries(HYGIENE_CHECKLIST_ITEMS.map((k) => [k, true]));
    expect(getFailedItems(result)).toEqual([]);
  });

  it("returns labels of failed items only", () => {
    const result = Object.fromEntries(HYGIENE_CHECKLIST_ITEMS.map((k) => [k, true]));
    result[HYGIENE_CHECKLIST_ITEMS[1]] = false;
    result[HYGIENE_CHECKLIST_ITEMS[3]] = false;
    const failed = getFailedItems(result);
    expect(failed).toHaveLength(2);
    expect(failed).toContain(HYGIENE_CHECKLIST_ITEMS[1]);
    expect(failed).toContain(HYGIENE_CHECKLIST_ITEMS[3]);
  });

  it("treats missing keys as failed", () => {
    const failed = getFailedItems({});
    expect(failed).toEqual([...HYGIENE_CHECKLIST_ITEMS]);
  });
});

describe("buildChecklistResult", () => {
  it("maps boolean array to keyed object", () => {
    const checked = HYGIENE_CHECKLIST_ITEMS.map(() => true);
    const result = buildChecklistResult(checked);
    expect(areAllPassed(result)).toBe(true);
  });

  it("handles shorter arrays with false defaults", () => {
    const result = buildChecklistResult([true]);
    expect(result[HYGIENE_CHECKLIST_ITEMS[0]]).toBe(true);
    expect(result[HYGIENE_CHECKLIST_ITEMS[1]]).toBe(false);
  });
});

describe("buildNotes", () => {
  it("returns undefined when all pass and no user notes", () => {
    const result = Object.fromEntries(HYGIENE_CHECKLIST_ITEMS.map((k) => [k, true]));
    expect(buildNotes(result)).toBeUndefined();
  });

  it("returns user notes when all pass but user has notes", () => {
    const result = Object.fromEntries(HYGIENE_CHECKLIST_ITEMS.map((k) => [k, true]));
    expect(buildNotes(result, "лек хремав")).toBe("лек хремав");
  });

  it("lists failed items without user notes", () => {
    const result = Object.fromEntries(HYGIENE_CHECKLIST_ITEMS.map((k) => [k, true]));
    result[HYGIENE_CHECKLIST_ITEMS[0]] = false;
    const notes = buildNotes(result);
    expect(notes).toContain("Непокрити:");
    expect(notes).toContain(HYGIENE_CHECKLIST_ITEMS[0]);
  });

  it("combines failed items with user notes", () => {
    const result = Object.fromEntries(HYGIENE_CHECKLIST_ITEMS.map((k) => [k, true]));
    result[HYGIENE_CHECKLIST_ITEMS[2]] = false;
    const notes = buildNotes(result, "разрешено от мениджъра");
    expect(notes).toContain("Непокрити:");
    expect(notes).toContain("разрешено от мениджъра");
  });

  it("ignores whitespace-only user notes", () => {
    const result = Object.fromEntries(HYGIENE_CHECKLIST_ITEMS.map((k) => [k, true]));
    expect(buildNotes(result, "   ")).toBeUndefined();
  });
});

describe("deriveLogStatus", () => {
  it("returns 'missing' for null", () => {
    expect(deriveLogStatus(null)).toBe("missing");
  });

  it("returns 'missing' for undefined", () => {
    expect(deriveLogStatus(undefined)).toBe("missing");
  });

  it("returns 'completed' when log has no notes", () => {
    expect(deriveLogStatus({ notes: null })).toBe("completed");
  });

  it("returns 'completed' when log has empty notes", () => {
    expect(deriveLogStatus({ notes: "" })).toBe("completed");
  });

  it("returns 'notes' when log has non-empty notes", () => {
    expect(deriveLogStatus({ notes: "Непокрити: Коса прибрана / шапка" })).toBe("notes");
  });
});
