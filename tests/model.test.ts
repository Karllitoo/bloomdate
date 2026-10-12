import { test } from "node:test";
import assert from "node:assert/strict";
import { demoInvitation } from "../src/lib/demo";
import {
  invitationSchema,
  responseSchema,
  validateSelection,
  playfulState,
  MAX_ESCAPES,
} from "../src/lib/model";
import { calendarICS } from "../src/lib/export";
import type { GuestResponse } from "../src/lib/types";
function reply(): GuestResponse {
  const inv = demoInvitation();
  return {
    version: 1,
    choice: "yes",
    date_id: inv.dates[0].id,
    time_id: inv.dates[0].times[0].id,
    activity_id: inv.activities[0].id,
    note: "A café, a smile; and\na sunset.",
    idempotency_key: crypto.randomUUID(),
  };
}
test("demo is valid, future-dated and uses independent example IDs", () =>
  assert.equal(invitationSchema.safeParse(demoInvitation()).success, true));
test("rejects a time from a different date, unrelated activity and unrelated flower", () => {
  const inv = demoInvitation();
  assert.throws(() =>
    validateSelection(inv, { ...reply(), time_id: inv.dates[1].times[0].id }),
  );
  assert.throws(() =>
    validateSelection(inv, { ...reply(), activity_id: crypto.randomUUID() }),
  );
  assert.throws(() =>
    validateSelection(inv, { ...reply(), flower_id: crypto.randomUUID() }),
  );
});
test("rejects an old invitation version and dates already in the past", () => {
  const inv = demoInvitation();
  assert.throws(() => validateSelection(inv, { ...reply(), version: 2 }));
  inv.dates[0].date = "2020-01-01";
  assert.throws(() => validateSelection(inv, reply()));
  assert.equal(invitationSchema.safeParse(inv).success, false);
});
test("a decline needs no date or activity; a suggestion must be future and allowed", () => {
  const inv = demoInvitation();
  assert.doesNotThrow(() =>
    validateSelection(inv, {
      version: 1,
      choice: "no",
      note: "",
      idempotency_key: crypto.randomUUID(),
    }),
  );
  assert.throws(() =>
    validateSelection(inv, {
      ...reply(),
      choice: "maybe",
      suggested_date: "2020-01-01",
    }),
  );
  inv.allow_suggestion = false;
  assert.throws(() =>
    validateSelection(inv, {
      ...reply(),
      choice: "maybe",
      suggested_date: "2099-01-01",
    }),
  );
});
test("field lengths, duplicate IDs, duplicated dates and duplicate times are rejected", () => {
  const inv = demoInvitation();
  assert.equal(
    invitationSchema.safeParse({ ...inv, message: "x".repeat(2001) }).success,
    false,
  );
  assert.equal(
    responseSchema.safeParse({ ...reply(), note: "x".repeat(1001) }).success,
    false,
  );
  inv.dates[1].id = inv.dates[0].id;
  assert.equal(invitationSchema.safeParse(inv).success, false);
  const other = demoInvitation();
  other.dates[1].date = other.dates[0].date;
  assert.equal(invitationSchema.safeParse(other).success, false);
});
test("teasing is bounded: four escapes, growth capped at 70%, warning at ten", () => {
  assert.equal(MAX_ESCAPES, 4);
  assert.equal(playfulState(0).growth, 1);
  assert.equal(playfulState(1).growth, 1.1);
  assert.equal(playfulState(2).growth, 1.2);
  assert.equal(playfulState(3).growth, 1.35);
  assert.equal(playfulState(4).canMove, false);
  for (let i = 4; i < 100; i++) assert.equal(playfulState(i).canMove, false);
  assert.equal(playfulState(5).growth, 1.7);
  assert.equal(playfulState(10).showWarning, true);
  assert.equal(playfulState(999).growth, 1.7);
});
test("calendar uses UTC corresponding to Kuala Lumpur, escapes content and CRLF", () => {
  const inv = demoInvitation();
  const r = reply();
  const ics = calendarICS(inv, r);
  const date = inv.dates[0].date.replaceAll("-", "");
  assert.match(ics, new RegExp(`DTSTART:${date}T090000Z`));
  assert.match(ics, new RegExp(`DTEND:${date}T110000Z`));
  assert.ok(
    ics.replace(/\r\n /g, "").includes("A café\\, a smile\\; and\\na sunset."),
  );
  assert.ok(ics.endsWith("\r\n"));
  assert.throws(() => calendarICS(inv, { ...r, choice: "no" }));
  assert.throws(() => calendarICS(inv, { ...r, choice: "maybe" }));
});
test("calendar folds long Unicode content at 75 bytes", () => {
  const inv = demoInvitation();
  inv.sender = "🌷".repeat(50);
  const ics = calendarICS(inv, reply());
  for (const line of ics.split("\r\n"))
    assert.ok(Buffer.byteLength(line, "utf8") <= 75);
});
