
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";

type Student = {
  id: string;
  fullName: string;
  department: string;
  level: string;
  matricNumber: string;
  profileImageUrl: string | null;
};

type FriendRequest = {
  id: string;
  senderId: string;
  receiverId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  sender?: Student;
  receiver?: Student;
};

type FriendData = {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  friends: Student[];
};

function Avatar({
  name,
  imageUrl,
  size = "md",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "S";

  const dimensions = {
    sm: "h-10 w-10 text-sm",
    md: "h-12 w-12 text-base",
    lg: "h-16 w-16 text-lg",
  };

  return (
    <div
      className={`flex ${dimensions[size]} shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-500 font-bold text-slate-950`}
    >
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt={`${name}'s profile`}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}

export default function StudentsPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [friendData, setFriendData] = useState<FriendData>({
    incoming: [],
    outgoing: [],
    friends: [],
  });
  const [loading, setLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const showMessage = (text: string, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const loadFriendData = useCallback(async () => {
    try {
      const response = await fetch("/api/friend-requests");
      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to load friends.");
      }

      setFriendData({
        incoming: data.incoming ?? [],
        outgoing: data.outgoing ?? [],
        friends: data.friends ?? [],
      });
    } catch {
      showMessage("Unable to load friend requests. Please refresh.", true);
    } finally {
      setLoadingFriends(false);
    }
  }, [router]);

  useEffect(() => {
    void loadFriendData();
  }, [loadFriendData]);

  async function searchStudents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (query.trim().length < 2) {
      setStudents([]);
      showMessage("Enter at least 2 characters to search.", true);
      return;
    }

    setLoading(true);
    showMessage("");

    try {
      const response = await fetch(
        `/api/students?q=${encodeURIComponent(query.trim())}`
      );
      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Search failed.");
      }

      setStudents(data.students ?? []);

      if (!data.students?.length) {
        showMessage("No students found. Try another search.");
      }
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Search failed.",
        true
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendFriendRequest(receiverId: string) {
    setBusyId(receiverId);
    showMessage("");

    try {
      const response = await fetch("/api/friend-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to send request.");
      }

      showMessage(data.message || "Friend request sent.");
      await loadFriendData();
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Unable to send request.",
        true
      );
    } finally {
      setBusyId("");
    }
  }

  async function respondToRequest(
    requestId: string,
    action: "accept" | "decline"
  ) {
    setBusyId(requestId);
    showMessage("");

    try {
      const response = await fetch("/api/friend-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to update request.");
      }

      showMessage(data.message || "Request updated.");
      await loadFriendData();
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Unable to update request.",
        true
      );
    } finally {
      setBusyId("");
    }
  }

  async function logOut() {
    try {
      const response = await fetch("/api/logout", { method: "POST" });

      if (response.ok) {
        router.push("/login");
        router.refresh();
      } else {
        showMessage("Unable to log out. Please try again.", true);
      }
    } catch {
      showMessage("Unable to connect. Please try again.", true);
    }
  }

  const outgoingIds = new Set(
    friendData.outgoing.map((request) => request.receiverId)
  );

  const friendIds = new Set(friendData.friends.map((friend) => friend.id));

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-6 pb-4 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/students"
              className="flex items-center gap-3 self-start text-sm font-bold text-cyan-400"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 text-lg font-black text-slate-950">
                B
              </span>
              <span>
                <span className="block text-base font-extrabold text-white">
                  BOUESTI CHAT
                </span>
                <span className="block text-xs font-normal text-slate-400">
                  Your campus. Your people.
                </span>
              </span>
            </Link>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Link
                href="/profile"
                className="rounded-lg border border-slate-700 px-3 py-2.5 text-center text-sm font-semibold transition hover:border-cyan-400"
              >
                👤 My Profile
              </Link>

              <Link
                href="/messages"
                className="rounded-lg bg-cyan-500 px-3 py-2.5 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                💬 Messages
              </Link>

              <button
                type="button"
                onClick={logOut}
                className="col-span-2 rounded-lg border border-slate-700 px-3 py-2.5 text-sm font-semibold transition hover:border-red-400 hover:text-red-300 sm:col-span-1"
              >
                Log out
              </button>
            </div>
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 sm:text-sm sm:tracking-[0.25em]">
            YOUR CAMPUS COMMUNITY
          </p>

          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Find your campus people
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
            Discover classmates and connect with registered students.
          </p>
        </header>

        {message && (
          <p
            role="status"
            aria-live="polite"
            className={`mb-6 break-words rounded-xl p-4 text-sm sm:text-base ${
              isError
                ? "border border-red-800 bg-red-950 text-red-200"
                : "bg-slate-900 text-slate-300"
            }`}
          >
            {message}
          </p>
        )}

        <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <h2 className="mb-4 text-xl font-bold">Find students</h2>

          <form
            onSubmit={searchStudents}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, department, level or matric number"
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              aria-label="Search students"
            />

            <button
              type="submit"
              disabled={loading}
              className="min-h-12 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {students.map((student) => {
              const isFriend = friendIds.has(student.id);
              const requestSent = outgoingIds.has(student.id);
              const isBusy = busyId === student.id;

              return (
                <article
                  key={student.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={student.fullName}
                      imageUrl={student.profileImageUrl}
                    />

                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">
                        {student.fullName}
                      </h3>
                      <p className="break-words text-sm text-slate-400">
                        {student.department} · Level {student.level}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-500">
                        Matric: {student.matricNumber}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isFriend || requestSent || isBusy}
                    onClick={() => sendFriendRequest(student.id)}
                    className="min-h-11 w-full shrink-0 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 sm:w-auto"
                  >
                    {isFriend
                      ? "Already friends"
                      : requestSent
                        ? "Request sent"
                        : isBusy
                          ? "Sending..."
                          : "Add Friend"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold sm:text-xl">
            Incoming requests ({friendData.incoming.length})
          </h2>

          {loadingFriends ? (
            <p className="text-sm text-slate-400">Loading requests...</p>
          ) : friendData.incoming.length === 0 ? (
            <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-400">
              No incoming friend requests yet.
            </p>
          ) : (
            <div className="space-y-3">
              {friendData.incoming.map((request) => (
                <article
                  key={request.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={request.sender?.fullName ?? "Student"}
                      imageUrl={request.sender?.profileImageUrl}
                    />

                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">
                        {request.sender?.fullName ?? "Student"}
                      </h3>
                      <p className="break-words text-sm text-slate-400">
                        {request.sender?.department} · Level{" "}
                        {request.sender?.level}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() => respondToRequest(request.id, "accept")}
                      className="min-h-11 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                    >
                      {busyId === request.id ? "Please wait..." : "Accept"}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() => respondToRequest(request.id, "decline")}
                      className="min-h-11 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:border-red-400 disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold sm:text-xl">
            Sent requests ({friendData.outgoing.length})
          </h2>

          {friendData.outgoing.length === 0 ? (
            <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-400">
              You haven&apos;t sent any pending requests.
            </p>
          ) : (
            <div className="space-y-3">
              {friendData.outgoing.map((request) => (
                <article
                  key={request.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={request.receiver?.fullName ?? "Student"}
                      imageUrl={request.receiver?.profileImageUrl}
                    />

                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">
                        {request.receiver?.fullName ?? "Student"}
                      </h3>
                      <p className="break-words text-sm text-slate-400">
                        {request.receiver?.department} · Level{" "}
                        {request.receiver?.level}
                      </p>
                      <p className="mt-2 text-xs text-amber-300">
                        Pending response
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold sm:text-xl">
            My friends ({friendData.friends.length})
          </h2>

          {friendData.friends.length === 0 ? (
            <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-400">
              When someone accepts your request, they&apos;ll appear here.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {friendData.friends.map((friend) => (
                <article
                  key={friend.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={friend.fullName}
                      imageUrl={friend.profileImageUrl}
                      size="lg"
                    />

                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">
                        {friend.fullName}
                      </h3>
                      <p className="mt-1 break-words text-sm text-slate-400">
                        {friend.department} · Level {friend.level}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-500">
                        Matric: {friend.matricNumber}
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/messages"
                    className="mt-4 inline-block min-h-11 py-3 text-sm font-semibold text-cyan-400 transition hover:text-cyan-300"
                  >
                    Open Messages →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-10 text-center text-xs text-slate-500">
          Made for the BOUESTI student community.
        </footer>
      </div>

      <MobileNav />
    </main>
  );
}
