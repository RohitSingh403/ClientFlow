import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { AuthFrame } from "@/components/auth-frame";
import { safeNextPath } from "@/lib/form";
import { getContext } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next ?? null);
  const ctx = await getContext();
  if (ctx) redirect(nextPath);
  return (
    <AuthFrame title="Sign in" lede="Northline Studio is already loaded if you want to walk the demo.">
      <LoginForm nextPath={nextPath} />
      <p className="mt-4 text-sm text-muted">
        New agency? <Link href="/register">Create a workspace</Link>
      </p>
    </AuthFrame>
  );
}
