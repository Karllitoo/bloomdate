import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { deploymentProblems } from "../scripts/check-deployment.mjs";
const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "example-public-key",
  SUPABASE_SERVICE_ROLE_KEY: "example-server-key",
  NEXT_PUBLIC_APP_URL: "https://bloomdate-example.vercel.app",
};
test("deployment blocks missing database config, localhost links and local-only storage", () => {
  assert.equal(deploymentProblems(valid).length, 0);
  assert.ok(deploymentProblems({}).length >= 4);
  assert.ok(
    deploymentProblems({
      ...valid,
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    }).length,
  );
  assert.ok(
    deploymentProblems({ ...valid, BLOOMDATE_STORAGE: "local" }).length,
  );
  assert.ok(
    deploymentProblems({
      ...valid,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: valid.SUPABASE_SERVICE_ROLE_KEY,
    }).length,
  );
});
test("deployment check runs in plain Node, not only the test transpiler", () => {
  const result = spawnSync(process.execPath, ["scripts/check-deployment.mjs"], {
    encoding: "utf8",
    env: { ...process.env, ...valid, BLOOMDATE_STORAGE: "" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes("Sedia untuk build Vercel."));
});
