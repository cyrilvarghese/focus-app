import { describe, expect, it } from "vitest";
import { isTag, MAX_TAGS, TAGS, type Tag, toggleTag, validateTags } from "./tags";

describe("tags", () => {
  it("has the eight kinds of work", () => {
    expect(TAGS).toEqual(["Deep work", "Writing", "Code", "Design", "Study", "Admin", "Reading", "Planning"]);
  });
  it("isTag accepts tags and rejects everything else", () => {
    expect(isTag("Code")).toBe(true);
    expect(isTag("code")).toBe(false);
    expect(isTag(null)).toBe(false);
  });
});

describe("validateTags", () => {
  it("allows none, some and the limit", () => {
    expect(validateTags([])).toBeNull();
    expect(validateTags(["Code"])).toBeNull();
    expect(validateTags(["Code", "Design", "Study"])).toBeNull();
  });
  it("rejects too many, unknown and repeated tags", () => {
    expect(validateTags(["Code", "Design", "Study", "Admin"])).toBe("Pick up to 3");
    expect(validateTags(["Napping"])).toBe("Pick from the list");
    expect(validateTags(["Code", "Code"])).toBe("Pick from the list");
  });
});

describe("toggleTag", () => {
  it("adds, removes and stops at the limit", () => {
    expect(toggleTag([], "Code")).toEqual(["Code"]);
    expect(toggleTag(["Code", "Design"], "Code")).toEqual(["Design"]);
    const full: Tag[] = ["Code", "Design", "Study"];
    expect(toggleTag(full, "Admin")).toEqual(full);
    expect(toggleTag(full, "Design")).toEqual(["Code", "Study"]);
    expect(MAX_TAGS).toBe(3);
  });
});
