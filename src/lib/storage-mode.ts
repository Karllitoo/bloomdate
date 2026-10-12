export function hasSupabaseConfiguration() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
export function localMode() {
  if (process.env.VERCEL === "1") return false;
  // Never silently replace the online database in a Vercel/production deployment.
  return (
    process.env.BLOOMDATE_STORAGE === "local" ||
    (!hasSupabaseConfiguration() && process.env.NODE_ENV === "development")
  );
}
export function storageAvailable() {
  return localMode() || hasSupabaseConfiguration();
}
