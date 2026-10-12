import { test } from "node:test";
import assert from "node:assert/strict";
import { demoInvitation } from "../../src/lib/demo";
const base = process.env.LOCAL_TEST_URL || "http://localhost:3000";
test(
  "running local app: continue, create, publish, reply, edit, revoke and delete",
  { skip: process.env.RUN_LOCAL_HTTP_TESTS !== "1" },
  async () => {
    const auth = await fetch(`${base}/auth?next=create`);
    assert.equal(auth.status, 200);
    const html = await auth.text();
    assert.ok(html.includes("Continue on this computer"));
    assert.ok(!html.includes("A little setup first."));
    const action = html.match(/name="(\$ACTION_ID_[a-z0-9]+)"/i)?.[1];
    assert.ok(action);
    const form = new FormData();
    form.set(action, "");
    form.set("next", "create");
    const continued = await fetch(`${base}/auth?next=create`, {
      method: "POST",
      headers: { Origin: base },
      body: form,
      redirect: "manual",
    });
    assert.equal(continued.status, 303);
    assert.ok(continued.headers.get("location")?.includes("/create"));
    const cookie = continued.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    assert.ok(cookie.includes("bloomdate_session="));
    const headers = {
      "Content-Type": "application/json",
      Origin: base,
      Cookie: cookie,
    };
    const creator = await fetch(`${base}/create`, {
      headers: { Cookie: cookie },
    });
    assert.equal(creator.status, 200);
    assert.ok(!(await creator.text()).includes("A little setup first."));
    const inv = demoInvitation();
    inv.id = crypto.randomUUID();
    inv.title = "Disposable local HTTP invitation";
    try {
      for (const publish of [false, true]) {
        const saved = await fetch(`${base}/api/creator/invitations`, {
          method: "POST",
          headers,
          body: JSON.stringify({ invitation: inv, publish }),
        });
        assert.equal(saved.status, 200, await saved.text());
      }
      const dashboard = await fetch(`${base}/dashboard`, {
        headers: { Cookie: cookie },
      });
      const content = await dashboard.text();
      assert.ok(content.includes(inv.title));
      const token = content.match(/\/i\/([a-zA-Z0-9_-]{43})/)?.[1];
      assert.ok(token);
      const publicPage = await fetch(`${base}/i/${token}`);
      assert.equal(publicPage.status, 200);
      assert.ok((await publicPage.text()).includes("Open your invitation"));
      const r = {
        version: 2,
        choice: "yes",
        date_id: inv.dates[0].id,
        time_id: inv.dates[0].times[0].id,
        activity_id: inv.activities[0].id,
        note: "HTTP reply saved.",
        idempotency_key: crypto.randomUUID(),
      };
      const guestHeaders = { "Content-Type": "application/json", Origin: base };
      const stale = await fetch(`${base}/api/guest/${token}`, {
        method: "POST",
        headers: guestHeaders,
        body: JSON.stringify({ ...r, version: 1 }),
      });
      assert.equal(stale.status, 409);
      const saved = await fetch(`${base}/api/guest/${token}`, {
        method: "POST",
        headers: guestHeaders,
        body: JSON.stringify(r),
      });
      const result = await saved.json();
      assert.equal(saved.status, 200, JSON.stringify(result));
      assert.ok(result.edit_url);
      const retried = await fetch(`${base}/api/guest/${token}`, {
        method: "POST",
        headers: guestHeaders,
        body: JSON.stringify(r),
      });
      assert.equal(retried.status, 200);
      assert.equal((await retried.json()).edit_url, result.edit_url);
      const persisted = await fetch(`${base}/dashboard`, {
        headers: { Cookie: cookie },
      });
      assert.ok((await persisted.text()).includes(r.note));
      const edited = await fetch(`${base}/api${result.edit_url}`, {
        method: "PATCH",
        headers: guestHeaders,
        body: JSON.stringify({
          ...r,
          choice: "no",
          note: "Changed my response.",
        }),
      });
      assert.equal(edited.status, 200, await edited.text());
      const updated = await fetch(`${base}/dashboard`, {
        headers: { Cookie: cookie },
      });
      assert.ok((await updated.text()).includes("Kindly declined"));
      const revoked = await fetch(`${base}/api/creator/invitations/${inv.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "revoke" }),
      });
      assert.equal(revoked.status, 200);
      const blocked = await fetch(`${base}/api${result.edit_url}`, {
        method: "PATCH",
        headers: guestHeaders,
        body: JSON.stringify(r),
      });
      assert.equal(blocked.status, 410);
    } finally {
      const deleted = await fetch(`${base}/api/creator/invitations/${inv.id}`, {
        method: "DELETE",
        headers,
      });
      assert.equal(deleted.status, 200, await deleted.text());
    }
  },
);
