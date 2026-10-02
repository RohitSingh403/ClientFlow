import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";
import { AuthFrame } from "@/components/auth-frame";

export const metadata = { title: "Create workspace" };

export default function RegisterPage() {
  return (
    <AuthFrame title="Create a workspace" lede="You start as the owner, on the free plan. Two projects, five clients, two seats.">
      <RegisterForm />
      <p className="mt-4 text-sm text-muted">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </AuthFrame>
  );
}
