import { describe, expect, it } from "vitest";
import { paceOf, whoIsHere } from "./who";

const members = ["me", "maya", "leo", "ashna"];

describe("whoIsHere", () => {
  it("counts you by your own state, not by presence", () => {
    expect(whoIsHere(["me"], {}, "me", true, true)).toEqual({ focusing: ["me"], dozing: [] });
    expect(whoIsHere(["me"], { me: "focusing" }, "me", false, true)).toEqual({ focusing: [], dozing: [] });
  });

  it("treats focusing and the shared break as present, and away or missing as dozing", () => {
    const who = whoIsHere(members, { maya: "focusing", leo: "away" }, "me", true, true);
    expect(who.focusing).toEqual(["me", "maya"]);
    expect(who.dozing).toEqual(["leo", "ashna"]);
    expect(whoIsHere(members, { maya: "break", leo: "break", ashna: "break" }, "me", true, true).dozing).toEqual([]);
  });

  it("counts a lobby-only screen as not at the table", () => {
    expect(whoIsHere(["me", "maya"], { maya: "lobby" }, "me", true, true).dozing).toEqual(["maya"]);
  });

  it("assumes everyone is here until the first sync", () => {
    expect(whoIsHere(members, {}, "me", true, false)).toEqual({ focusing: members, dozing: [] });
  });
});

describe("paceOf", () => {
  it("is the share of the table focusing", () => {
    expect(paceOf({ focusing: ["a", "b", "c"], dozing: ["d"] }, 4)).toBe(0.75);
    expect(paceOf({ focusing: [], dozing: [] }, 0)).toBe(0);
  });
});
