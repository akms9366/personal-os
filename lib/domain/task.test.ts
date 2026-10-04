import { describe, expect, it } from "vitest";
import { organizeTasks, type OrganizableTask } from "./task";

function task(
  id: string,
  overrides: Partial<OrganizableTask> = {},
): OrganizableTask & { id: string } {
  return {
    id,
    status: "todo",
    dueAt: null,
    importance: 2,
    urgency: 2,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  };
}

describe("organizeTasks", () => {
  it("sorts the timeline by due date, putting tasks without a due date last", () => {
    const { timeline } = organizeTasks([
      task("none"),
      task("late", { dueAt: new Date("2026-10-04T14:59:00Z") }),
      task("early", { dueAt: new Date("2026-10-04T03:00:00Z") }),
    ]);
    expect(timeline.map((t) => t.id)).toEqual(["early", "late", "none"]);
  });

  it("breaks due-date ties by importance (high first)", () => {
    const due = new Date("2026-10-04T09:00:00Z");
    const { timeline } = organizeTasks([
      task("low", { dueAt: due, importance: 1 }),
      task("high", { dueAt: due, importance: 3 }),
    ]);
    expect(timeline.map((t) => t.id)).toEqual(["high", "low"]);
  });

  it("moves urgency-1 tasks to a separate list sorted by importance", () => {
    const { timeline, lowUrgency } = organizeTasks([
      task("u1-i1", {
        urgency: 1,
        importance: 1,
        dueAt: new Date("2026-10-02T00:00:00Z"),
      }),
      task("u1-i3", {
        urgency: 1,
        importance: 3,
        dueAt: new Date("2026-12-01T00:00:00Z"),
      }),
      task("u3", { urgency: 3 }),
      task("unset", { urgency: null }),
    ]);
    expect(lowUrgency.map((t) => t.id)).toEqual(["u1-i3", "u1-i1"]);
    expect(timeline.map((t) => t.id)).toEqual(["u3", "unset"]);
  });

  it("separates done tasks from both lists", () => {
    const result = organizeTasks([
      task("done", { status: "done" }),
      task("done-u1", { status: "done", urgency: 1 }),
      task("open"),
    ]);
    expect(result.timeline.map((t) => t.id)).toEqual(["open"]);
    expect(result.lowUrgency).toEqual([]);
    expect(result.done.map((t) => t.id).sort()).toEqual(["done", "done-u1"]);
  });
});
