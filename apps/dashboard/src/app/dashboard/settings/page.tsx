"use client";

import { useEffect, useState } from "react";
import { Trash2, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { authClient } from "@/lib/auth-client";
import { CopyButton } from "@/components/copy-button";

interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  isCurrent: boolean;
}

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { level: score, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { level: score, label: "Good", color: "bg-yellow-500" };
  return { level: score, label: "Strong", color: "bg-emerald-500" };
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}

export default function SettingsPage() {
  const { data: session } = authClient.useSession();

  // Profile
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [totpURI, setTotpURI] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [enabling2FA, setEnabling2FA] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session?.user?.name]);

  useEffect(() => {
    authClient
      .listSessions()
      .then((res) => {
        if (res.data) {
          setSessions(
            res.data.map((s: { token: string; userAgent?: string | null; ipAddress?: string | null; createdAt: Date }, i: number) => ({
              id: s.token,
              userAgent: s.userAgent || "Unknown",
              ipAddress: s.ipAddress || "Unknown",
              createdAt: s.createdAt.toString(),
              isCurrent: i === 0,
            }))
          );
        }
      })
      .catch(() => {
        setSessions([
          {
            id: "current",
            userAgent: navigator.userAgent,
            ipAddress: "127.0.0.1",
            createdAt: new Date().toISOString(),
            isCurrent: true,
          },
        ]);
      });
  }, []);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    try {
      await authClient.updateUser({ name });
      showMessage("success", "Name updated successfully");
    } catch {
      showMessage("error", "Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(null);
      showMessage("success", "Password changed. Other sessions revoked.");
    } catch {
      showMessage("error", "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleEnable2FA = async () => {
    setShowSetup2FA(true);
    try {
      const res = await authClient.twoFactor.enable({
        password: currentPassword || "required",
      });
      if (res.data?.totpURI) {
        setTotpURI(res.data.totpURI);
      }
    } catch {
      showMessage("error", "Failed to start 2FA setup. Enter your current password first.");
      setShowSetup2FA(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnabling2FA(true);
    try {
      await authClient.twoFactor.verifyTotp({ code: verifyCode });
      setTwoFactorEnabled(true);
      setShowSetup2FA(false);
      setVerifyCode("");
      showMessage("success", "Two-factor authentication enabled");
    } catch {
      showMessage("error", "Invalid verification code");
    } finally {
      setEnabling2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm("Are you sure you want to disable two-factor authentication?")) return;
    try {
      await authClient.twoFactor.disable({ password: currentPassword || "required" });
      setTwoFactorEnabled(false);
      showMessage("success", "Two-factor authentication disabled");
    } catch {
      showMessage("error", "Failed to disable 2FA. Enter your current password first.");
    }
  };

  const handleRevokeSession = async (sessionToken: string) => {
    try {
      await authClient.revokeSession({ token: sessionToken });
      setSessions((prev) => prev.filter((s) => s.id !== sessionToken));
      showMessage("success", "Session revoked");
    } catch {
      showMessage("error", "Failed to revoke session");
    }
  };

  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-white">Settings</h1>
      <p className="mt-1 text-sm text-zinc-400">Manage your account and security.</p>

      {message && (
        <div
          className={`mt-4 rounded-md border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-900/50 bg-emerald-950/50 text-emerald-400"
              : "border-red-900/50 bg-red-950/50 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-white">Profile</h2>
        <form onSubmit={handleUpdateName} className="mt-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={session?.user?.email || ""}
              disabled
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            disabled={savingName}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {savingName ? "Saving..." : "Update Profile"}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="mt-10 pt-8 border-t border-zinc-800">
        <h2 className="text-lg font-medium text-white">Change Password</h2>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-300 mb-1.5">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordError(null);
              }}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              required
              minLength={8}
            />
            {passwordStrength && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i <= passwordStrength.level ? passwordStrength.color : "bg-zinc-800"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Password strength: {passwordStrength.label}
                </p>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordError(null);
              }}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              required
              minLength={8}
            />
          </div>
          {passwordError && <div className="text-sm text-red-400">{passwordError}</div>}
          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {savingPassword ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="mt-10 pt-8 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-zinc-400" />
            <div>
              <h2 className="text-lg font-medium text-white">Two-Factor Authentication</h2>
              <p className="text-sm text-zinc-400">
                {twoFactorEnabled
                  ? "2FA is enabled on your account."
                  : "Add an extra layer of security to your account."}
              </p>
            </div>
          </div>
          {twoFactorEnabled ? (
            <button
              onClick={handleDisable2FA}
              className="rounded-md border border-red-900 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950 transition-colors"
            >
              Disable
            </button>
          ) : (
            <button
              onClick={handleEnable2FA}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
            >
              Enable
            </button>
          )}
        </div>

        {showSetup2FA && totpURI && (
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="flex h-52 w-52 items-center justify-center rounded-lg bg-zinc-900 p-3">
                  <QRCodeSVG value={totpURI} size={200} bgColor="transparent" fgColor="white" />
                </div>
                <p className="mt-2 text-center text-xs text-zinc-500">
                  Scan with your authenticator app
                </p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-400 mb-3">
                  Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.),
                  then enter the 6-digit code to verify.
                </p>
                <div className="mb-4 rounded-md bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500 mb-1">Manual entry URI:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-zinc-300 font-mono break-all">
                      {totpURI}
                    </code>
                    <CopyButton text={totpURI} />
                  </div>
                </div>
                <form onSubmit={handleVerify2FA} className="flex gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="w-32 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-center text-sm tracking-widest text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    required
                  />
                  <button
                    type="submit"
                    disabled={enabling2FA}
                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                  >
                    {enabling2FA ? "Verifying..." : "Verify & Enable"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="mt-10 pt-8 border-t border-zinc-800">
        <h2 className="text-lg font-medium text-white">Active Sessions</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your active sessions across devices.
        </p>
        <div className="mt-4 space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white">
                    {s.userAgent.includes("Chrome")
                      ? "Chrome"
                      : s.userAgent.includes("Firefox")
                      ? "Firefox"
                      : s.userAgent.includes("Safari")
                      ? "Safari"
                      : "Unknown Browser"}
                  </p>
                  {s.isCurrent && (
                    <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                  <span>{s.ipAddress}</span>
                  <span>Active since {new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              {!s.isCurrent && (
                <button
                  onClick={() => handleRevokeSession(s.id)}
                  className="rounded-md p-2 text-zinc-500 hover:bg-red-950 hover:text-red-400 transition-colors"
                  title="Revoke session"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
