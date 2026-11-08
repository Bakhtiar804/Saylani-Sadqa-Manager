"use client";

import { useState, type FormEvent } from "react";
import type { AdminAccount } from "@/lib/admin-accounts";

type AdminManagementProps = {
  initialAdmins: AdminAccount[];
};

export default function AdminManagement({
  initialAdmins,
}: AdminManagementProps) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password,
        }),
      });
      const result: { admin?: AdminAccount; error?: string } =
        await response.json();

      if (!response.ok || !result.admin) {
        setIsError(true);
        setMessage(result.error ?? "Could not create this admin account.");
        return;
      }

      const createdAdmin = result.admin;
      setAdmins((current) => [...current, createdAdmin]);
      form.reset();
      setIsError(false);
      setMessage("Admin account created successfully.");
    } catch {
      setIsError(true);
      setMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]">
      <section className="rounded-2xl border border-[#e3ebe0] bg-white p-5 shadow-[0_3px_14px_rgba(28,52,33,.035)] sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-[#203526]">Create an admin</h2>
          <p className="mt-1 text-sm leading-6 text-[#718073]">
            Admins can sign in to the dashboard. New accounts are saved
            securely in the database.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">
            Full name
            <input
              name="name"
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={120}
              required
              className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none transition focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none transition focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">
            Temporary password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={1024}
              required
              aria-describedby="admin-password-help"
              className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none transition focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"
            />
            <span id="admin-password-help" className="text-xs font-normal text-[#718073]">
              Use at least 12 characters.
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[#344639]">
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={1024}
              required
              className="h-11 rounded-xl border border-[#dce8dc] px-3 text-sm font-normal outline-none transition focus:border-[#276431] focus:ring-4 focus:ring-[#61bb46]/15"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-[#276431] px-4 text-sm font-semibold text-white transition hover:bg-[#1e5228] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61bb46] disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Creating admin..." : "Create admin"}
          </button>
          <p
            role="status"
            aria-live="polite"
            className={message ? `rounded-xl p-3 text-sm ${isError ? "bg-[#fbeceb] text-[#913a34]" : "bg-[#edf6e9] text-[#276431]"}` : "sr-only"}
          >
            {message}
          </p>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e3ebe0] bg-white shadow-[0_3px_14px_rgba(28,52,33,.035)]">
        <div className="border-b border-[#e9efe7] px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#203526]">Admin accounts</h2>
              <p className="mt-1 text-sm text-[#718073]">
                Configured super admin and database-backed admin accounts.
              </p>
            </div>
            <span className="rounded-full bg-[#edf6e9] px-3 py-1 text-xs font-bold text-[#276431]">
              {admins.length}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-[#f8faf7] text-xs font-bold uppercase tracking-wide text-[#657568]">
              <tr>
                <th scope="col" className="px-5 py-3">Name</th>
                <th scope="col" className="px-5 py-3">Email</th>
                <th scope="col" className="px-5 py-3">Role</th>
                <th scope="col" className="px-5 py-3">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1eb]">
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-5 py-4 font-semibold text-[#344639]">{admin.name}</td>
                  <td className="px-5 py-4 text-[#657568]">{admin.email}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#f2f6ef] px-2.5 py-1 text-xs font-semibold text-[#526552]">
                      {admin.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#718073]">
                    {admin.createdAt
                      ? new Date(admin.createdAt).toLocaleDateString()
                      : "Environment"}
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-[#718073]">
                    No admin accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
