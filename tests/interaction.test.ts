import { setReducedMotion } from "./dom-setup";
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { render, fireEvent, cleanup, within } from "@testing-library/react";
import { RomanticQuestion } from "../src/components/romantic-question";
import { InvitationFlow } from "../src/components/invitation-flow";
import { demoInvitation } from "../src/lib/demo";
beforeEach(() => {
  setReducedMotion(false);
});
afterEach(cleanup);
function question(fun = true, lang: "en" | "ms" = "en") {
  const choices: string[] = [];
  const result = render(
    createElement(RomanticQuestion, {
      lang,
      fun,
      busy: false,
      allowSuggestion: true,
      onChoice: (c) => choices.push(c),
    }),
  );
  return {
    ...result,
    choices,
    no: result.getByRole("button", {
      name: /No, thank you|Tidak, terima kasih/,
    }),
    yes: result.getByRole("button", { name: /Yes, I'd love to|Ya, saya sudi/ }),
  };
}
test("mouse moves four times then stops; click can decline immediately", () => {
  const q = question();
  const initial = q.no.style.transform;
  fireEvent.pointerOver(q.no, { pointerType: "mouse" });
  assert.notEqual(q.no.style.transform, initial);
  assert.ok(q.getByText("Are you sure? 🥺"));
  for (let i = 0; i < 3; i++) {
    fireEvent.pointerOut(q.no);
    fireEvent.pointerOver(q.no, { pointerType: "mouse" });
  }
  const final = q.no.style.transform;
  fireEvent.pointerOut(q.no);
  fireEvent.pointerOver(q.no, { pointerType: "mouse" });
  assert.equal(q.no.style.transform, final);
  assert.equal(q.yes.style.width, "100%");
  const fullscreen = q.getByRole("dialog", {
    name: "One little date with me?",
  });
  assert.ok(fullscreen.classList.contains("big-yes-dialog"));
  fireEvent.click(
    within(fullscreen).getByRole("button", { name: /No, thank you/ }),
    { detail: 1 },
  );
  assert.deepEqual(q.choices, ["no"]);
});
test("touch escapes exactly four times; fifth tap declines", () => {
  const q = question();
  for (let i = 0; i < 4; i++) {
    fireEvent.pointerDown(q.no, { pointerType: "touch" });
    fireEvent.click(q.no, { detail: 1 });
    assert.equal(q.choices.length, 0);
  }
  const fullscreen = q.getByRole("dialog", {
    name: "One little date with me?",
  });
  const decline = within(fullscreen).getByRole("button", {
    name: /No, thank you/,
  });
  fireEvent.pointerDown(decline, { pointerType: "touch" });
  fireEvent.click(decline, { detail: 1 });
  assert.deepEqual(q.choices, ["no"]);
});

test("fullscreen Yes still accepts, while Close and Escape restore the normal choices", () => {
  const q = question();
  for (let i = 0; i < 5; i++) {
    fireEvent.pointerOut(q.no);
    fireEvent.pointerOver(q.no, { pointerType: "mouse" });
  }
  const fullscreen = q.getByRole("dialog", {
    name: "One little date with me?",
  });
  assert.equal(document.body.style.overflow, "hidden");
  fireEvent.click(
    within(fullscreen).getByRole("button", { name: /Yes, I'd love to/ }),
  );
  assert.deepEqual(q.choices, ["yes"]);
  assert.equal(fullscreen.hasAttribute("open"), false);
  assert.equal(document.body.style.overflow, "");
  cleanup();
  for (const exit of ["close", "escape"]) {
    const r = question();
    for (let i = 0; i < 5; i++) {
      fireEvent.pointerOut(r.no);
      fireEvent.pointerOver(r.no, { pointerType: "mouse" });
    }
    const modal = r.getByRole("dialog", { name: "One little date with me?" });
    if (exit === "close")
      fireEvent.click(
        within(modal).getByRole("button", { name: /Close the big Yes/ }),
      );
    else fireEvent(modal, new window.Event("cancel", { bubbles: false }));
    assert.equal(modal.hasAttribute("open"), false);
    assert.equal(r.no.style.transform, "translate(0px, 0px)");
    fireEvent.click(r.no, { detail: 1 });
    assert.deepEqual(r.choices, ["no"]);
    cleanup();
  }
});
test("direct decline is available before any teasing and does not run an animation", () => {
  const q = question();
  fireEvent.click(q.getByRole("button", { name: "Decline directly" }));
  assert.deepEqual(q.choices, ["no"]);
});
test("keyboard and reduced motion decline without interception", () => {
  const q = question();
  fireEvent.keyDown(window, { key: "Tab" });
  fireEvent.pointerOver(q.no, { pointerType: "mouse" });
  assert.equal(q.no.style.transform, "translate(0px, 0px)");
  fireEvent.click(q.no, { detail: 0 });
  assert.deepEqual(q.choices, ["no"]);
  cleanup();
  setReducedMotion(true);
  const r = question();
  fireEvent.pointerDown(r.no, { pointerType: "touch" });
  fireEvent.click(r.no, { detail: 1 });
  assert.deepEqual(r.choices, ["no"]);
});
test("Fun Mode can be disabled or skipped, leaving both answers usable", () => {
  const q = question(false);
  fireEvent.pointerOver(q.no, { pointerType: "mouse" });
  assert.equal(q.no.style.transform, "translate(0px, 0px)");
  fireEvent.click(q.no, { detail: 1 });
  assert.deepEqual(q.choices, ["no"]);
  cleanup();
  const s = question();
  fireEvent.click(s.getByRole("button", { name: "Skip the teasing" }));
  fireEvent.pointerOver(s.no, { pointerType: "mouse" });
  assert.equal(s.no.style.transform, "translate(0px, 0px)");
  fireEvent.click(s.yes);
  assert.deepEqual(s.choices, ["yes"]);
});
test("Malay messages and attempt ten are voluntary and bounded; warning decline works", () => {
  const q = question(true, "ms");
  for (let i = 0; i < 4; i++) {
    fireEvent.pointerOut(q.no);
    fireEvent.pointerOver(q.no, { pointerType: "mouse" });
  }
  assert.ok(
    within(q.getByRole("dialog", { name: "Satu date dengan saya?" })).getByText(
      "☕ Saya belanja kopi...",
    ),
  );
  fireEvent.click(q.getByRole("button", { name: /Usik lagi sedikit/ }));
  assert.ok(
    within(q.getByRole("dialog", { name: "Satu date dengan saya?" })).getByText(
      "💍 Eh bukan proposal lagi ni!",
    ),
  );
  for (let i = 0; i < 5; i++)
    fireEvent.click(q.getByRole("button", { name: /Usik lagi sedikit/ }));
  const warningDialog = q.getByRole("dialog");
  assert.ok(warningDialog.hasAttribute("open"));
  assert.ok(q.getByText("Cubaan #10"));
  fireEvent.click(q.getByRole("button", { name: "🥺 Okay, saya faham" }));
  assert.deepEqual(q.choices, ["no"]);
  assert.equal(warningDialog.hasAttribute("open"), false);
});
test("guest demo completes an actual accepted date with review and downloads", async () => {
  const inv = demoInvitation();
  const q = render(
    createElement(InvitationFlow, { invitation: inv, preview: true }),
  );
  fireEvent.click(q.getByRole("button", { name: "❤️ Yes, I'd love to" }));
  fireEvent.click(q.getAllByRole("button", { name: /20\d\d/ })[0]);
  fireEvent.click(q.getByRole("button", { name: "5:00 PM" }));
  fireEvent.click(q.getByRole("button", { name: /Continue/ }));
  fireEvent.click(q.getByRole("button", { name: /Café date/ }));
  fireEvent.click(q.getByRole("button", { name: /Continue/ }));
  fireEvent.click(q.getByRole("button", { name: /Tulips/ }));
  fireEvent.click(q.getByRole("button", { name: /Continue/ }));
  fireEvent.change(q.getByLabelText("Leave a little note (optional)"), {
    target: { value: "Looking forward to this!" },
  });
  fireEvent.click(q.getByRole("button", { name: /Send my answer/ }));
  assert.ok(await q.findByText("It’s", { exact: false }));
  assert.ok(q.getByRole("button", { name: "Add to calendar" }));
  assert.ok(q.getByRole("button", { name: "Download date card" }));
});
test("failed online save retains choices, reports no success and retries the same submission key", async () => {
  setReducedMotion(true);
  const original = globalThis.fetch;
  const sent: string[] = [];
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    sent.push(String(options?.body));
    calls++;
    if (calls === 1) throw new Error("Connection lost. Please retry.");
    return new Response(
      JSON.stringify({ edit_url: "/response/private-example" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    const q = render(
      createElement(InvitationFlow, {
        invitation: demoInvitation(),
        token: "sample-token",
      }),
    );
    fireEvent.click(q.getByRole("button", { name: /Open your invitation/ }));
    fireEvent.click(
      await q.findByRole("button", { name: "❤️ Yes, I'd love to" }),
    );
    fireEvent.click(q.getAllByRole("button", { name: /20\d\d/ })[0]);
    fireEvent.click(q.getByRole("button", { name: "5:00 PM" }));
    fireEvent.click(q.getByRole("button", { name: /Continue/ }));
    fireEvent.click(q.getByRole("button", { name: /Café date/ }));
    fireEvent.click(q.getByRole("button", { name: /Continue/ }));
    fireEvent.click(q.getByRole("button", { name: /Tulips/ }));
    fireEvent.click(q.getByRole("button", { name: /Continue/ }));
    fireEvent.change(q.getByLabelText("Leave a little note (optional)"), {
      target: { value: "Keep this note through the retry." },
    });
    fireEvent.click(q.getByRole("button", { name: /Send my answer/ }));
    assert.ok(await q.findByText("Connection lost. Please retry."));
    assert.equal(q.queryByText("Response saved"), null);
    assert.equal(
      (
        q.getByLabelText(
          "Leave a little note (optional)",
        ) as HTMLTextAreaElement
      ).value,
      "Keep this note through the retry.",
    );
    fireEvent.click(q.getByRole("button", { name: /Send my answer/ }));
    assert.ok(await q.findByText("Response saved"));
    assert.equal(sent.length, 2);
    assert.equal(sent[0], sent[1]);
    assert.ok(JSON.parse(sent[0]).idempotency_key);
    assert.ok(q.getByLabelText(/Your private edit link/));
  } finally {
    globalThis.fetch = original;
  }
});
