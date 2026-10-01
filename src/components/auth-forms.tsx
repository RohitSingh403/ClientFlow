"use client";

import { useActionState } from "react";
import { login, register } from "@/server/auth";
import { Feedback, SubmitButton } from "@/components/submit-button";

const DEMOS = [
  { label: "Rohit · owner", email: "rohit@northline.studio" },
  { label: "Priya · client", email: "priya@abcpvt.com" },
  { label: "Anika · other agency", email: "anika@harbor.co" },
];

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action] = useActionState(login, null);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="next" value={nextPath} />
      <label className="label">
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="label">
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <Feedback state={state} />
      <SubmitButton>Sign in</SubmitButton>
      <div className="mt-2 grid gap-2">
        <p className="text-xs text-muted">Demo password for every account: clientflow</p>
        {DEMOS.map((demo) => (
          <button
            key={demo.email}
            type="button"
            className="btn btn-ghost justify-start"
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (!form) return;
              const email = form.elements.namedItem("email");
              const password = form.elements.namedItem("password");
              if (email instanceof HTMLInputElement) email.value = demo.email;
              if (password instanceof HTMLInputElement) password.value = "clientflow";
            }}
          >
            {demo.label}
          </button>
        ))}
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(register, null);
  return (
    <form action={action} className="grid gap-3">
      <label className="label">
        Your name
        <input name="name" required />
      </label>
      <label className="label">
        Work email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="label">
        Password
        <input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="label">
        Organization
        <input name="organization" placeholder="Studio or agency name" required />
      </label>
      <Feedback state={state} />
      <SubmitButton>Create workspace</SubmitButton>
    </form>
  );
}
