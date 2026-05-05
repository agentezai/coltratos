import { describe, test, expectTypeOf } from "vitest";
import type { IconName } from "../icon";

/**
 * REQ-011: IconName must be exactly the 28 names registered in icon.tsx.
 * Adding a key to PATHS without updating Expected — or vice versa —
 * fails this type-test.
 */
type Expected =
  | "upload"
  | "file"
  | "chart"
  | "bell"
  | "card"
  | "users"
  | "settings"
  | "search"
  | "check-circle"
  | "alert"
  | "x-circle"
  | "eye"
  | "download"
  | "filter"
  | "chev-down"
  | "chev-right"
  | "sparkles"
  | "shield"
  | "clock"
  | "plus"
  | "x"
  | "arrow-up-right"
  | "database"
  | "more"
  | "logout"
  | "globe"
  | "trophy"
  | "rocket"
  | "build"
  | "trend"
  | "file-text"
  | "target"
  | "archive"
  | "dollar-sign"
  | "bar-chart"
  | "user-plus"
  | "check";

describe("Icon name registry (REQ-011)", () => {
  test("IconName equals the 35-entry registry exactly", () => {
    expectTypeOf<IconName>().toEqualTypeOf<Expected>();
  });
});
