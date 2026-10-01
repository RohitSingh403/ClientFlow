"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "danger" | "pine";
}) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn btn-${variant}`} disabled={pending} type="submit">
      {pending ? "Saving…" : children}
    </button>
  );
}

export function Feedback({ state }: { state: { error?: string; message?: string } | null }) {
  if (!state?.error && !state?.message) return null;
  return <p className={state.error ? "text-sm text-bad" : "text-sm text-good"}>{state.error || state.message}</p>;
}
