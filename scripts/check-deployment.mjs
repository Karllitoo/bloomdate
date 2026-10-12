import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { loadEnvConfig } = createRequire(resolve("package.json"))("@next/env");

export function deploymentProblems(env) {
  const problems = [];
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_APP_URL",
  ]) {
    if (!env[key] || /YOUR_|PLACEHOLDER/i.test(env[key]))
      problems.push(`${key} belum diisi dengan konfigurasi sebenar.`);
  }
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_APP_URL"]) {
    if (!env[key]) continue;
    try {
      const url = new URL(env[key]);
      if (
        url.protocol !== "https:" ||
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/"
      )
        problems.push(`${key} mesti origin HTTPS sebenar tanpa path.`);
    } catch {
      problems.push(`${key} bukan URL yang sah.`);
    }
  }
  if (
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY === env.SUPABASE_SERVICE_ROLE_KEY
  )
    problems.push("Public anon key dan service role key mesti berbeza.");
  if (env.BLOOMDATE_STORAGE === "local")
    problems.push(
      "Vercel memerlukan Supabase. Buang BLOOMDATE_STORAGE=local daripada environment deploy.",
    );
  return problems;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  loadEnvConfig(process.cwd(), false);
  const problems = deploymentProblems(process.env);
  if (problems.length) {
    console.error("Deploy belum boleh diteruskan:");
    for (const issue of problems) console.error(`- ${issue}`);
    console.error(
      "Isi environment variables di Vercel selepas projek Supabase disediakan. Tiada secret key dipaparkan.",
    );
    process.exitCode = 1;
  } else
    console.log("Konfigurasi production lengkap. Sedia untuk build Vercel.");
}
