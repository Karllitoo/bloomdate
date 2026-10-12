import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { LocalStore } from "../src/lib/local-store";
import { demoInvitation } from "../src/lib/demo";
import type { GuestResponse } from "../src/lib/types";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
test("local account passwords, sessions, owner boundaries, replies and persistence", () => {
  const path = join(
    process.cwd(),
    ".tools",
    `store-test-${randomUUID()}.sqlite`,
  );
  let store = new LocalStore(path);
  try {
    const session = store.signup("sample@example.test", "sample-password-123");
    const owner = store.user(session)!;
    assert.ok(owner.id);
    const other = store.user(store.continueOnComputer())!;
    assert.throws(
      () => store.signin("sample@example.test", "wrong-password"),
      /unauthorized/,
    );
    assert.throws(
      () => store.signup("SAMPLE@example.test", "some-password-123"),
      /account_exists/,
    );
    assert.equal(
      store.user(store.signin("SAMPLE@example.test", "sample-password-123"))
        ?.id,
      owner.id,
    );
    const inv = demoInvitation();
    inv.id = randomUUID();
    const token = randomUUID();
    store.save(owner.id, inv, false, null);
    assert.equal(store.draft(other.id, inv.id), null);
    assert.throws(
      () => store.save(other.id, inv, true, token),
      /invitation_not_editable/,
    );
    store.save(owner.id, inv, true, token);
    assert.equal(store.guest(token).version, 2);
    const reply: GuestResponse = {
      version: 2,
      choice: "yes",
      date_id: inv.dates[0].id,
      time_id: inv.dates[0].times[0].id,
      activity_id: inv.activities[0].id,
      note: "Persist this response.",
      idempotency_key: randomUUID(),
    };
    assert.throws(
      () =>
        store.submit(
          token,
          { ...reply, version: 1 },
          hash("edit"),
          hash("retry"),
        ),
      /changed/,
    );
    const first = store.submit(token, reply, hash("edit"), hash("retry"));
    assert.equal(
      store.submit(token, reply, hash("edit"), hash("retry")),
      first,
    );
    assert.throws(
      () => store.submit(token, reply, hash("other-edit"), hash("other-retry")),
      /already_responded/,
    );
    assert.equal(store.list(other.id).invitations.length, 0);
    assert.equal(store.list(other.id).responses.length, 0);
    assert.throws(
      () => store.manage(other.id, inv.id, "delete"),
      /unavailable/,
    );
    const secret = store.secret();
    store.close();
    store = new LocalStore(path);
    assert.equal(store.secret(), secret);
    assert.equal(store.user(session)?.id, owner.id);
    assert.equal(store.list(owner.id).responses[0].note, reply.note);
    assert.throws(() => store.editable(hash("wrong")), /unavailable/);
    store.submit(
      null,
      { ...reply, choice: "no" },
      hash("edit"),
      hash("editing"),
      true,
    );
    assert.equal(store.list(owner.id).responses[0].choice, "no");
    assert.equal(store.list(owner.id).responses[0].date_id, undefined);
    store.manage(owner.id, inv.id, "revoke");
    assert.throws(() => store.guest(token), /unavailable/);
    assert.throws(() => store.editable(hash("edit")), /unavailable/);
    store.manage(owner.id, inv.id, "delete");
    assert.equal(store.list(owner.id).responses.length, 0);
    store.signout(session);
    assert.equal(store.user(session), null);
  } finally {
    store.close();
    for (const file of [path, `${path}-wal`, `${path}-shm`])
      if (existsSync(file)) unlinkSync(file);
  }
});
