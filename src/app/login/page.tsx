import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { AuthFrame } from "@/components/auth-frame";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";
  return (
    <AuthFrame title="Sign in" lede="Northline Studio is already loaded if you want to walk the demo.">
      <LoginForm nextPath={nextPath} />
      <p className="mt-4 text-sm text-muted">
        New agency? <Link href="/register">Create a workspace</Link>
      </p>
    </AuthFrame>
  );
}
