import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { demoInvitation } from "../../src/lib/demo";
const ready =
  process.env.RUN_LIVE_TESTS === "1" &&
  [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TEST_USER_A_EMAIL",
    "TEST_USER_A_PASSWORD",
    "TEST_USER_B_EMAIL",
    "TEST_USER_B_PASSWORD",
  ].every((k) => process.env[k]);
test(
  "live staging Supabase: owner isolation and saved responses from separate sessions",
  { skip: !ready },
  async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!,
      key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
    };
    const a = createClient(url, key, options),
      b = createClient(url, key, options),
      guest = createClient(url, key, options),
      admin = createClient(
        url,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        options,
      );
    const { data: authA, error: ea } = await a.auth.signInWithPassword({
      email: process.env.TEST_USER_A_EMAIL!,
      password: process.env.TEST_USER_A_PASSWORD!,
    });
    assert.equal(ea, null);
    const { data: authB, error: eb } = await b.auth.signInWithPassword({
      email: process.env.TEST_USER_B_EMAIL!,
      password: process.env.TEST_USER_B_PASSWORD!,
    });
    assert.equal(eb, null);
    assert.notEqual(authA.user!.id, authB.user!.id);
    const inv = demoInvitation();
    inv.id = crypto.randomUUID();
    inv.dates = inv.dates.map((d) => ({
      ...d,
      id: crypto.randomUUID(),
      times: d.times.map((t) => ({ ...t, id: crypto.randomUUID() })),
    }));
    inv.activities = inv.activities.map((o) => ({
      ...o,
      id: crypto.randomUUID(),
    }));
    inv.flowers = inv.flowers.map((o) => ({ ...o, id: crypto.randomUUID() }));
    const token = crypto.randomUUID();
    try {
      const { error } = await admin.rpc("save_invitation", {
        p_owner: authA.user!.id,
        p_payload: inv,
        p_publish: true,
        p_token: token,
      });
      assert.equal(error, null);
      const { data: own } = await a
        .from("invitations")
        .select("id")
        .eq("id", inv.id);
      assert.equal(own?.length, 1);
      const { data: foreign } = await b
        .from("invitations")
        .select("id")
        .eq("id", inv.id);
      assert.equal(foreign?.length, 0);
      const { error: ge } = await guest.from("invitations").select("id");
      assert.ok(ge);
      const r = {
        version: 1,
        choice: "yes",
        date_id: inv.dates[0].id,
        time_id: inv.dates[0].times[0].id,
        activity_id: inv.activities[0].id,
        note: "Disposable staging integration test",
      };
      const params = {
        p_token: token,
        p_response: r,
        p_edit_hash: crypto.randomUUID(),
        p_idempotency_hash: crypto.randomUUID(),
        p_is_edit: false,
      };
      const { data: first, error: re } = await admin.rpc(
        "submit_response",
        params,
      );
      assert.equal(re, null);
      const { data: retry, error: de } = await admin.rpc(
        "submit_response",
        params,
      );
      assert.equal(de, null);
      assert.equal(retry, first);
      const newDevice = createClient(url, key, options);
      await newDevice.auth.signInWithPassword({
        email: process.env.TEST_USER_A_EMAIL!,
        password: process.env.TEST_USER_A_PASSWORD!,
      });
      const { data: stored } = await newDevice
        .from("invitation_responses")
        .select("choice")
        .eq("invitation_id", inv.id);
      assert.equal(stored?.[0]?.choice, "yes");
      const { data: hidden } = await b
        .from("invitation_responses")
        .select("id")
        .eq("invitation_id", inv.id);
      assert.equal(hidden?.length, 0);
    } finally {
      const { error } = await admin
        .from("invitations")
        .delete()
        .eq("id", inv.id);
      assert.equal(error, null);
    }
  },
);
