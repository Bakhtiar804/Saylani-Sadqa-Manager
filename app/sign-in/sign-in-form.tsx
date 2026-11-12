"use client";

import { fetchResponse } from '@/lib/client-request';

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Field = "email" | "password";
type Errors = Partial<Record<Field, string>>;

const inputClassName = "h-11 w-full rounded-xl border border-border bg-card px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-foreground";

export function SignInForm() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorFocusRef = useRef<HTMLInputElement | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    errorFocusRef.current?.focus();
    errorFocusRef.current = null;
  }, [errors]);

  function clearFeedback(field: Field) {
    setStatus("");
    // Clear only the field being edited, without moving focus to another error.
    setErrors((current) => current[field] ? { ...current, [field]: undefined } : current);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = emailRef.current;
    const password = passwordRef.current;
    if (!email || !password || isSubmitting) return;

    const nextErrors: Errors = {};
    if (!email.value.trim()) nextErrors.email = "Enter your email.";
    else if (email.validity.typeMismatch) nextErrors.email = "Enter a valid email address.";
    if (!password.value) nextErrors.password = "Enter your password.";

    errorFocusRef.current = nextErrors.email ? email : nextErrors.password ? password : null;
    setErrors(nextErrors);
    setStatus("");
    if (nextErrors.email || nextErrors.password) return;

    setIsSubmitting(true);
    try {
      const response = await fetchResponse("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value.trim(),
          password: password.value,
        }),
      });

      const result: { error?: unknown; redirectTo?: unknown } = await response.json();
      if (!response.ok) {
        setStatus(
          typeof result.error === "string"
            ? result.error
            : "Unable to sign in. Please try again.",
        );
        return;
      }

      router.replace(typeof result.redirectTo === "string" ? result.redirectTo : "/dashboard");
    } catch {
      setStatus("Unable to reach the sign-in service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-7 grid items-start gap-5 sm:grid-cols-2">
      <div className="grid gap-2">
        <label htmlFor="sign-in-email" className="text-sm font-semibold">Email</label>
        <input
          ref={emailRef}
          id="sign-in-email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "sign-in-email-error" : undefined}
          className={inputClassName}
          onChange={() => clearFeedback("email")}
        />
        {errors.email && <p id="sign-in-email-error" className="text-sm font-medium">{errors.email}</p>}
      </div>
      <div className="grid gap-2">
        <label htmlFor="sign-in-password" className="text-sm font-semibold">Password</label>
        <div className="relative">
          <input
            ref={passwordRef}
            id="sign-in-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            required
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "sign-in-password-error" : undefined}
            className={`${inputClassName} pr-13`}
            onChange={() => clearFeedback("password")}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-controls="sign-in-password"
            className="absolute inset-y-1 right-1 grid w-10 place-items-center rounded-lg text-primary hover:bg-surface focus-visible:outline-2 focus-visible:outline-ring"
            onClick={() => setShowPassword((visible) => !visible)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              {showPassword ? (
                <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9 5.4a11 11 0 0 1 3-.4c5 0 8.5 4 10 7a17 17 0 0 1-2.6 3.5M6.4 6.5A16.4 16.4 0 0 0 2 12c1.5 3 5 7 10 7a10 10 0 0 0 4.6-1.1" />
              ) : (
                <>
                  <path d="M2 12c1.5-3 5-7 10-7s8.5 4 10 7c-1.5 3-5 7-10 7S3.5 15 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        </div>
        {errors.password && <p id="sign-in-password-error" className="text-sm font-medium">{errors.password}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full sm:col-span-2">
        {isSubmitting ? "Signing in..." : "Sign In"}
      </Button>
      <p role="status" aria-live="polite" className={status ? "rounded-xl bg-surface p-3 text-sm text-primary sm:col-span-2" : "sr-only"}>{status}</p>
    </form>
  );
}
