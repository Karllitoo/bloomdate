import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { demoInvitation } from "../src/lib/demo";
import type { Invitation } from "../src/lib/types";

test("PostgreSQL migration, RLS, response invariants and persistent rate limits", async (t) => {
  const db = new PGlite();
  const ownerA = crypto.randomUUID(),
    ownerB = crypto.randomUUID();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''test.uid'',true),'''')::uuid';
    grant usage on schema public,auth to anon,authenticated,service_role; grant execute on function auth.uid() to authenticated;
    insert into auth.users values('${ownerA}'),('${ownerB}');`);
  // PGlite has built-in gen_random_uuid; only the extension declaration is omitted.
  const sql = (
    await readFile("supabase/migrations/001_bloomdate.sql", "utf8")
  ).replace("create extension if not exists pgcrypto;", "");
  await db.exec(sql);
  async function save(owner = ownerA, publish = true): Promise<Invitation> {
    const inv = demoInvitation();
    inv.id = crypto.randomUUID();
    inv.dates = inv.dates.map((d) => ({
      ...d,
      id: crypto.randomUUID(),
      times: d.times.map((x) => ({ ...x, id: crypto.randomUUID() })),
    }));
    inv.activities = inv.activities.map((o) => ({
      ...o,
      id: crypto.randomUUID(),
    }));
    inv.flowers = inv.flowers.map((o) => ({ ...o, id: crypto.randomUUID() }));
    inv.share_token = crypto.randomUUID();
    await db.query("select save_invitation($1,$2::jsonb,$3,$4)", [
      owner,
      JSON.stringify(inv),
      publish,
      inv.share_token,
    ]);
    return inv;
  }
  const inv = await save(),
    other = await save(ownerB);
  function reply(i = inv) {
    return {
      version: 1,
      choice: "yes",
      date_id: i.dates[0].id,
      time_id: i.dates[0].times[0].id,
      activity_id: i.activities[0].id,
      note: "",
    };
  }
  async function submit(
    i = inv,
    r = reply(i),
    edit = "edit-hash",
    key = "retry-key",
    isEdit = false,
  ) {
    return db.query<{ id: string }>(
      "select submit_response($1,$2::jsonb,$3,$4,$5) as id",
      [i.share_token, JSON.stringify(r), edit, key, isEdit],
    );
  }
  await t.test(
    "creator A reads only A; B reads only B; guests read no invitations or responses",
    async () => {
      await db.exec(`set role authenticated; set test.uid='${ownerA}';`);
      const rows = await db.query<{ id: string }>("select id from invitations");
      assert.deepEqual(
        rows.rows.map((r) => r.id),
        [inv.id],
      );
      await db.exec(`set test.uid='${ownerB}';`);
      const b = await db.query<{ id: string }>("select id from invitations");
      assert.deepEqual(
        b.rows.map((r) => r.id),
        [other.id],
      );
      await assert.rejects(
        db.query("delete from invitations where id=$1", [inv.id]),
      );
      await assert.rejects(
        db.query("select save_invitation($1,$2::jsonb,false,null)", [
          ownerB,
          JSON.stringify(inv),
        ]),
      );
      await db.exec("reset role; set role anon;");
      await assert.rejects(db.query("select * from invitations"));
      await assert.rejects(db.query("select * from invitation_responses"));
      await assert.rejects(submit());
      await db.exec("reset role;");
    },
  );
  await t.test("cross-owner draft changes are rejected", async () => {
    const draft = await save(ownerA, false);
    await assert.rejects(
      db.query("select save_invitation($1,$2::jsonb,false,null)", [
        ownerB,
        JSON.stringify(draft),
      ]),
      /invitation_not_editable/,
    );
  });
  await t.test(
    "invalid token, revoked, expired and draft invitations reject replies",
    async () => {
      await assert.rejects(
        submit({ ...inv, share_token: "invalid" }),
        /unavailable/,
      );
      const revoked = await save();
      await db.query("update invitations set status='revoked' where id=$1", [
        revoked.id,
      ]);
      await assert.rejects(submit(revoked), /unavailable/);
      const expired = await save();
      await db.query(
        "update invitations set expires_at=now()-interval '1 hour' where id=$1",
        [expired.id],
      );
      await assert.rejects(submit(expired), /unavailable/);
      await assert.rejects(submit(await save(ownerA, false)), /unavailable/);
    },
  );
  await t.test(
    "foreign date, mismatched time, foreign activity and flower reject atomically",
    async () => {
      const i = await save();
      for (const bad of [
        { ...reply(i), date_id: other.dates[0].id },
        { ...reply(i), time_id: i.dates[1].times[0].id },
        { ...reply(i), activity_id: other.activities[0].id },
        { ...reply(i), flower_id: other.flowers[0].id },
      ])
        await assert.rejects(submit(i, bad), /invalid_options/);
      const rows = await db.query(
        "select id from invitation_responses where invitation_id=$1",
        [i.id],
      );
      assert.equal(rows.rows.length, 0);
    },
  );
  await t.test("past time and old version cannot be accepted", async () => {
    const i = await save();
    await assert.rejects(submit(i, { ...reply(i), version: 2 }), /outdated/);
    await db.query(
      "update invitation_time_options set starts_at=now()-interval '1 hour' where id=$1",
      [i.dates[0].times[0].id],
    );
    await assert.rejects(submit(i), /invalid_options/);
  });
  await t.test(
    "retry returns the same reply; different submission is rejected; creator sees persistent response",
    async () => {
      const first = await submit(),
        retry = await submit();
      assert.equal(first.rows[0].id, retry.rows[0].id);
      await assert.rejects(
        submit(inv, reply(), "different-edit", "different-key"),
        /already_responded/,
      );
      await db.exec(`set role authenticated;set test.uid='${ownerA}';`);
      const rows = await db.query("select * from invitation_responses");
      assert.equal(rows.rows.length, 1);
      await db.exec(`set test.uid='${ownerB}';`);
      assert.equal(
        (await db.query("select * from invitation_responses")).rows.length,
        0,
      );
      await db.exec("reset role;");
    },
  );
  await t.test(
    "private edit token is required; revocation disables editing",
    async () => {
      await assert.rejects(
        submit(inv, reply(), "wrong", "", true),
        /unavailable/,
      );
      await submit(inv, { ...reply(), choice: "no" }, "edit-hash", "", true);
      const rows = await db.query<{ choice: string }>(
        "select choice from invitation_responses where invitation_id=$1",
        [inv.id],
      );
      assert.equal(rows.rows[0].choice, "no");
      await db.query("update invitations set status='revoked' where id=$1", [
        inv.id,
      ]);
      await assert.rejects(
        submit(inv, reply(), "edit-hash", "", true),
        /unavailable/,
      );
    },
  );
  await t.test("rate limit remains enforced by shared database", async () => {
    for (let n = 0; n < 10; n++) {
      const rows = await db.query<{ allowed: boolean }>(
        "select consume_rate_limit('test-ip',10) as allowed",
      );
      assert.equal(rows.rows[0].allowed, true);
    }
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select consume_rate_limit('test-ip',10) as allowed",
        )
      ).rows[0].allowed,
      false,
    );
  });
  await t.test("deletion removes options and replies", async () => {
    await db.query("delete from invitations where id=$1", [inv.id]);
    assert.equal(
      (
        await db.query(
          "select * from invitation_responses where invitation_id=$1",
          [inv.id],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select * from invitation_time_options where invitation_id=$1",
          [inv.id],
        )
      ).rows.length,
      0,
    );
  });
  await db.close();
});
