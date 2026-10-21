
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      matricNumber: String(formData.get("matricNumber") ?? ""),
      department: String(formData.get("department") ?? ""),
      level: String(formData.get("level") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(result.message || "Registration failed. Please try again.");
        return;
      }

      setMessage(result.message || "Registration successful!");
      form.reset();
    } catch {
      setIsError(true);
      setMessage("Unable to connect. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-4 py-10 text-slate-900">
      <div className="w-full max-w-lg">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-black text-white">
            B
          </div>
          <span className="text-2xl font-extrabold">
            BOUESTI <span className="text-indigo-600">CHAT</span>
          </span>
        </Link>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-indigo-100/60 sm:p-9">
          <div className="mb-7 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
              Join your campus
            </p>
            <h1 className="mt-3 text-3xl font-black">Create your account</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Connect with fellow students at Bamidele Olumilua University of
              Education, Science and Technology.
            </p>
          </div>

         <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-semibold">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold">
                Student email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label htmlFor="matricNumber" className="mb-2 block text-sm font-semibold">
                Matriculation number
              </label>
              <input
                id="matricNumber"
                name="matricNumber"
                type="text"
                placeholder="Enter your matric number"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="department" className="mb-2 block text-sm font-semibold">
                  Department
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  placeholder="Your department"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label htmlFor="level" className="mb-2 block text-sm font-semibold">
                  Academic level
                </label>
                <select
                  id="level"
                  name="level"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="" disabled>Select level</option>
                  <option value="100">100 Level</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level</option>
                  <option value="500">500 Level</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Create a strong password"
                autoComplete="new-password"
                minLength={12}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
              <p className="mt-2 text-xs text-slate-500">
                Use at least 12 characters.
              </p>
            </div>

            
<button
  type="submit"
  disabled={isSubmitting}
  className="w-full rounded-xl bg-indigo-600 px-5 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
>
  {isSubmitting ? "Creating account..." : "Create student account"}
</button>

{message && (
  <p
    role="status"
    aria-live="polite"
    className={`text-center text-sm ${
      isError ? "text-red-600" : "text-green-700"
    }`}
  >
    {message}
  </p>
)}


            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-indigo-600 hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          BOUESTI CHAT is intended for the university community. Student
          verification will be added before accounts can access messaging.
        </p>

        <p className="mt-4 text-center text-sm">
          <Link href="/" className="font-semibold text-slate-500 hover:text-indigo-600">
            ← Back to homepage
          </Link>
        </p>
      </div>
    </main>
  );
}
