
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type StudentProfile = {
  id: string;
  fullName: string;
  email: string;
  matricNumber: string;
  department: string;
  level: string;
  profileImageUrl: string | null;
};

type ApiResponse = {
  student?: StudentProfile;
  error?: string;
  message?: string;
  profileImageUrl?: string | null;
};

async function readApiResponse(response: Response): Promise<ApiResponse> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      `The server returned an empty response (HTTP ${response.status}). Check your terminal for the server error.`
    );
  }

  try {
    return JSON.parse(text) as ApiResponse;
  } catch {
    throw new Error(
      `The server returned an invalid response (HTTP ${response.status}). Check your terminal for the server error.`
    );
  }
}

export default function ProfilePage() {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [preview, setPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", {
          cache: "no-store",
        });

        const data = await readApiResponse(response);

        if (!response.ok) {
          throw new Error(data.error || "Unable to load profile.");
        }

        if (!data.student) {
          throw new Error("The server did not return your student profile.");
        }

        if (active) {
          setStudent(data.student);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your profile."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  function choosePhoto(file?: File) {
    setError("");
    setNotice("");

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size === 0 || file.size > 3 * 1024 * 1024) {
      setError("Your image must be a valid file smaller than 3 MB.");
      return;
    }

    setSelectedFile(file);
  }

  async function uploadPhoto() {
    if (!selectedFile || uploading) return;

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error || `Photo upload failed (HTTP ${response.status}).`
        );
      }

      if (!data.profileImageUrl) {
        throw new Error(
          "The server did not return a profile picture URL. Check your server terminal."
        );
      }

      setStudent((current) =>
        current
          ? {
              ...current,
              profileImageUrl: data.profileImageUrl ?? null,
            }
          : current
      );

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setNotice("Your profile picture has been updated successfully!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Photo upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  const displayedImage = preview || student?.profileImageUrl || "";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between gap-3">
          <Link href="/students" className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-black text-white">
              B
            </span>

            <span>
              <span className="block font-extrabold">BOUESTI CHAT</span>
              <span className="block text-xs text-slate-500">
                Your campus. Your people.
              </span>
            </span>
          </Link>

          <Link
            href="/messages"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Messages →
          </Link>
        </header>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white sm:px-8">
            <p className="text-sm font-semibold text-indigo-100">
              YOUR ACCOUNT
            </p>

            <h1 className="mt-2 text-3xl font-black">My Profile</h1>

            <p className="mt-2 text-sm text-indigo-100">
              Let your campus friends recognise you.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {loading ? (
              <p className="py-10 text-center text-slate-500">
                Loading your profile...
              </p>
            ) : !student ? (
              <div className="py-8 text-center">
                <p className="font-semibold">
                  We couldn&apos;t load your profile.
                </p>

                <Link
                  href="/login"
                  className="mt-4 inline-block font-semibold text-indigo-600"
                >
                  Go to login
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-indigo-100 bg-gradient-to-br from-indigo-500 to-purple-600 text-4xl font-black text-white shadow-md">
                    {displayedImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={displayedImage}
                        alt={`${student.fullName}'s profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      student.fullName
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase() ?? "")
                        .join("")
                    )}
                  </div>

                  <h2 className="mt-4 text-xl font-extrabold">
                    {student.fullName}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {student.department} · {student.level}
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      choosePhoto(event.target.files?.[0]);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    📷 Choose Profile Picture
                  </button>

                  <p className="mt-2 text-center text-xs text-slate-400">
                    JPG, PNG, or WebP · Maximum 3 MB
                  </p>

                  {selectedFile && (
                    <p className="mt-2 max-w-full break-all text-center text-xs text-slate-500">
                      Selected: {selectedFile.name}
                    </p>
                  )}

                  {selectedFile && (
                    <div className="mt-4 flex w-full max-w-xs gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setError("");
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        disabled={uploading}
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={uploadPhoto}
                        disabled={uploading}
                        className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploading ? "Uploading..." : "Save Picture"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-8 border-t border-slate-100 pt-6">
                  <h3 className="mb-4 font-extrabold">
                    Student Information
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Full name
                      </p>
                      <p className="mt-1 font-semibold">{student.fullName}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Email address
                      </p>
                      <p className="mt-1 break-all font-semibold">
                        {student.email}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Matric number
                      </p>
                      <p className="mt-1 font-semibold">
                        {student.matricNumber}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Department
                      </p>
                      <p className="mt-1 font-semibold">
                        {student.department}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Level
                      </p>
                      <p className="mt-1 font-semibold">{student.level}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div
                role="alert"
                className="mt-5 break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                {notice}
              </div>
            )}
          </div>
        </section>

        <p className="mt-5 text-center text-xs text-slate-400">
          BOUESTI CHAT · Your campus. Your people.
        </p>
      </div>
    </main>
  );
}
