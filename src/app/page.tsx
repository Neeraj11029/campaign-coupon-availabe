"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Role = "admin" | "partner";

const CREDENTIALS: Record<Role, { email: string; password: string }> = {
  admin: { email: "admin@rff.com", password: "admin123" },
  partner: { email: "partner@rff.com", password: "partner123" },
};

function getRoleByEmail(email: string): Role | null {
  for (const [role, creds] of Object.entries(CREDENTIALS)) {
    if (email === creds.email) return role as Role;
  }
  return null;
}

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "admin") {
      router.replace("/coupons");
    } else if (role === "partner") {
      router.replace("/partner-dashboard");
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const role = getRoleByEmail(email);
    if (!role) {
      setError("Invalid email or password.");
      return;
    }

    const creds = CREDENTIALS[role];
    if (password === creds.password) {
      localStorage.setItem("role", role);
      router.push(role === "admin" ? "/coupons" : "/partner-dashboard");
    } else {
      setError("Invalid email or password.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />

      <div className="relative mx-auto w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white">Sign In</h2>
          <p className="mt-2 text-indigo-200">Access your coupon dashboard</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-semibold text-white hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all shadow-md shadow-indigo-200"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
