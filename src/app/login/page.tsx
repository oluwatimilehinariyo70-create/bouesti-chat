
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data: { message?: string } = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message || "Login failed. Please try again.");
        return;
      }

      setMessage("Login successful! Welcome to BOUESTI CHAT.");

      router.push("/students");
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Unable to connect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-4 py-10 text-slate-900">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-black text-white">
            B
          </div>
          <span className="text-2xl font-extrabold">
            BOUESTI <span className="text-indigo-600">CHAT</span>
          </span>
        </Link>

        <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-xl shadow-indigo-100/60 sm:p-9">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
              Welcome back
            </p>
            <h1 className="mt-3 text-3xl font-black">
              Log in to your account
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Your campus conversations are waiting for you.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label
                htmlFor="identifier"
                className="mb-2 block text-sm font-semibold"
              >
                Email address or matric number
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="Enter email or matric number"
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm font-semibold">
                  Password
                </label>
                <span className="text-xs text-slate-400">
                  Forgot password? Coming soon
                </span>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
              />
            </div>

            {message && (
              <div
                role="status"
                aria-live="polite"
                className={`rounded-xl border px-4 py-3 text-sm ${
                  isError
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-indigo-600 px-5 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs text-slate-400">
              NEW TO BOUESTI CHAT?
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <Link
            href="/signup"
            className="block w-full rounded-xl border border-slate-200 px-5 py-4 text-center font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            Create a student account
          </Link>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/"
            className="font-semibold text-slate-500 hover:text-indigo-600"
          >
            ← Back to homepage
          </Link>
        </p>
      </div>
    </main>
  );
}
