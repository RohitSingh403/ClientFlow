import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { AuthFrame } from "@/components/auth-frame";
import { getContext } from "@/lib/session";

export const metadata = { title: "Create workspace" };

export default async function RegisterPage() {
  if (await getContext()) redirect("/dashboard");
  return (
    <AuthFrame title="Create a workspace" lede="You start as the owner, on the free plan. Two projects, five clients, two seats.">
      <RegisterForm />
      <p className="mt-4 text-sm text-muted">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </AuthFrame>
  );
}
