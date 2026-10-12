import { AuthForm } from "@/components/auth-form";
import { Unavailable } from "@/components/unavailable";
import { localMode, storageAvailable } from "@/lib/storage-mode";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sign in | BloomDate",
  robots: { index: false, follow: false },
};
export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return storageAvailable() ? (
    <AuthForm
      local={localMode()}
      next={next === "create" ? "create" : "dashboard"}
    />
  ) : (
    <Unavailable setup />
  );
}
