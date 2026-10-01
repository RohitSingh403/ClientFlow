import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";

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

export function AuthFrame({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <section className="hidden bg-pine px-10 py-12 text-cream md:block">
        <p className="font-serif text-3xl">ClientFlow</p>
        <p className="mt-8 max-w-sm font-serif text-4xl leading-tight">The client and the agency share one record of the work.</p>
      </section>
      <section className="flex items-center px-6 py-12 md:px-12">
        <div className="w-full max-w-md">
          <h1 className="font-serif text-4xl">{title}</h1>
          <p className="mt-2 mb-6 text-muted">{lede}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
