"use client";

import React, { useEffect, useState } from "react";
import Button from "../../components/ui/Button";

interface SettingsFormProps {
  apiBase: string;
  currentEmail: string;
  onCredentialsUpdated: (newEmail: string, newPassword?: string) => void;
}

export default function SettingsForm({
  apiBase,
  currentEmail,
  onCredentialsUpdated,
}: SettingsFormProps) {
  const [newEmail, setNewEmail] = useState(currentEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; message: string }>({
    type: "",
    message: "",
  });

  useEffect(() => {
    setNewEmail(currentEmail);
  }, [currentEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    const trimmedEmail = newEmail.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus({ type: "error", message: "Please enter a valid admin email address." });
      return;
    }

    if (!currentPassword) {
      setStatus({ type: "error", message: "Please enter your current password to save changes." });
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setStatus({ type: "error", message: "New password must be at least 6 characters." });
        return;
      }
      if (newPassword !== confirmPassword) {
        setStatus({ type: "error", message: "New password and confirmation do not match." });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newEmail: trimmedEmail,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", message: data.error || "Failed to update credentials." });
        return;
      }

      onCredentialsUpdated(data.email || trimmedEmail, newPassword || undefined);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus({
        type: "success",
        message: data.message || "Admin email and password updated successfully.",
      });
    } catch {
      setStatus({
        type: "error",
        message: "Network error: Could not connect to backend server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">


      {status.message && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center gap-2.5 ${status.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-600 border-red-200"
            }`}
        >
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${status.type === "success" ? "bg-green-500" : "bg-red-500"
              }`}
          />
          <span>{status.message}</span>
        </div>
      )}

      <div>
        <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase mb-2">
          Admin Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          required
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="admin@ditsndots.com"
          className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
      </div>

      <div className="border-t border-neutral-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase mb-2">
            New Password <span className="text-neutral-400 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              aria-label={showNewPassword ? "Hide new password" : "Show new password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
            >
              {showNewPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={!newPassword}
              className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand disabled:bg-neutral-50 disabled:text-neutral-400"
            />
            {newPassword && (
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                {showConfirmPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-5">
        <label className="block text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase mb-2">
          Current Password <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showCurrentPassword ? "text" : "password"}
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password to confirm changes"
            className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword((prev) => !prev)}
            aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            {showCurrentPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="py-[10px] px-7 font-bold text-[13.5px]"
        >
          {isSubmitting ? "Updating..." : "Update Credentials"}
        </Button>
      </div>
    </form>
  );
}
