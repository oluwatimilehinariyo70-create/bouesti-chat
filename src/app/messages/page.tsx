
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";

type Student = {
  id: string;
  fullName: string;
  department: string;
  level: string;
  matricNumber: string;
  profileImageUrl: string | null;
  unreadCount: number;
};

type ChatMessage = {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  readAt: string | null;
  sender: {
    id: string;
    fullName: string;
    profileImageUrl: string | null;
  };
  receiver: {
    id: string;
    fullName: string;
    profileImageUrl: string | null;
  };
};

function Avatar({
  name,
  imageUrl,
  size = "normal",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "small" | "normal" | "large";
}) {
  const dimensions = {
    small: "h-9 w-9 text-xs",
    normal: "h-11 w-11 text-sm",
    large: "h-14 w-14 text-lg",
  };

  return (
    <div
      className={`${dimensions[size]} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("") || "S"
      )}
    </div>
  );
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: string) {
  const value = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (value.toDateString() === today.toDateString()) return "Today";
  if (value.toDateString() === yesterday.toDateString()) return "Yesterday";

  return value.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: value.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export default function MessagesPage() {
  const [friends, setFriends] = useState<Student[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStudentId, setCurrentStudentId] = useState("");
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const selectedFriendRef = useRef("");
  const initialLoadRef = useRef(true);

  const selectedFriend =
    friends.find((friend) => friend.id === selectedFriendId) ?? null;

  const loadFriends = useCallback(async () => {
    try {
      const response = await fetch("/api/friend-requests", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load friends.");
      }

      const list: Student[] = data.friends ?? [];
      setFriends(list);

      setSelectedFriendId((current) => {
        if (current && list.some((friend) => friend.id === current)) {
          return current;
        }

        return list[0]?.id ?? "";
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load your friends."
      );
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (friendId: string, showLoader = false) => {
      if (!friendId) {
        setMessages([]);
        messagesRef.current = [];
        return;
      }

      if (showLoader) setLoadingMessages(true);

      try {
        const response = await fetch(
          `/api/messages?friendId=${encodeURIComponent(friendId)}`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load messages.");
        }

        if (selectedFriendRef.current !== friendId) return;

        const nextMessages: ChatMessage[] = data.messages ?? [];
        const previousMessages = messagesRef.current;
        const previousLastId = previousMessages.at(-1)?.id;
        const nextLastId = nextMessages.at(-1)?.id;

        messagesRef.current = nextMessages;
        setMessages(nextMessages);

        setFriends((current) =>
          current.map((friend) =>
            friend.id === friendId
              ? { ...friend, unreadCount: 0 }
              : friend
          )
        );

        if (initialLoadRef.current || previousLastId !== nextLastId) {
          bottomRef.current?.scrollIntoView({
            behavior: initialLoadRef.current ? "auto" : "smooth",
          });
        }

        initialLoadRef.current = false;
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load messages."
        );
      } finally {
        if (showLoader) setLoadingMessages(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadFriends();

    const timer = window.setInterval(() => {
      void loadFriends();
    }, 10000);

    return () => window.clearInterval(timer);
  }, [loadFriends]);

  useEffect(() => {
    selectedFriendRef.current = selectedFriendId;
    initialLoadRef.current = true;
    messagesRef.current = [];
    setMessages([]);

    if (!selectedFriendId) return;

    void loadMessages(selectedFriendId, true);

    const timer = window.setInterval(() => {
      void loadMessages(selectedFriendId);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [selectedFriendId, loadMessages]);

  useEffect(() => {
    let active = true;

    async function loadCurrentStudent() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        if (active) {
          setCurrentStudentId(data.student?.id ?? data.id ?? "");
        }
      } catch {
        // The current student ID is optional for rendering this screen.
      }
    }

    void loadCurrentStudent();

    return () => {
      active = false;
    };
  }, []);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const messageContent = content.trim();

    if (!messageContent || !selectedFriendId || sending) return;

    setSending(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedFriendId,
          content: messageContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send message.");
      }

      setContent("");
      await loadMessages(selectedFriendId);
      void loadFriends();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send your message."
      );
    } finally {
      setSending(false);
    }
  }

  const filteredFriends = friends.filter((friend) =>
    `${friend.fullName} ${friend.department} ${friend.matricNumber}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/students" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-black text-white">
              B
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">
                BOUESTI CHAT
              </h1>
              <p className="text-xs text-slate-500">
                Your campus. Your people.
              </p>
            </div>
          </Link>

          <Link
            href="/students"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50"
          >
            ← Students
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-3 sm:p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-black sm:text-3xl">Messages 💬</h2>
          <p className="mt-1 text-sm text-slate-500">
            Catch up with your friends on campus.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <div className="grid min-h-[70vh] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            className={`border-b border-slate-200 md:border-b-0 md:border-r ${
              selectedFriendId ? "hidden md:block" : "block"
            }`}
          >
            <div className="border-b border-slate-100 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Your friends</h3>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  {friends.length}
                </span>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your friends..."
                aria-label="Search friends"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 md:max-h-[calc(70vh-110px)]">
              {loadingFriends ? (
                <p className="p-5 text-sm text-slate-500">
                  Loading your friends...
                </p>
              ) : filteredFriends.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="mb-2 text-3xl">👋</div>
                  <p className="font-semibold">No friends found</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Add friends from the students page to start chatting.
                  </p>
                  <Link
                    href="/students"
                    className="mt-4 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Find students
                  </Link>
                </div>
              ) : (
                filteredFriends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => {
                      setSelectedFriendId(friend.id);
                      setError("");
                    }}
                    className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                      selectedFriendId === friend.id
                        ? "bg-indigo-50 ring-1 ring-indigo-100"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative">
                      <Avatar
                        name={friend.fullName}
                        imageUrl={friend.profileImageUrl}
                      />
                      {friend.unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                          {friend.unreadCount > 99
                            ? "99+"
                            : friend.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {friend.fullName}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {friend.department} · {friend.level}
                      </p>
                    </div>

                    {selectedFriendId === friend.id && (
                      <span className="h-2 w-2 rounded-full bg-indigo-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          </aside>

          <section
            className={`min-w-0 flex-col ${
              selectedFriendId ? "flex" : "hidden md:flex"
            }`}
          >
            {selectedFriend ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
                  <button
                    type="button"
                    onClick={() => setSelectedFriendId("")}
                    className="rounded-lg px-2 py-2 text-slate-500 hover:bg-slate-100 md:hidden"
                    aria-label="Back to friends"
                  >
                    ←
                  </button>

                  <Avatar
                    name={selectedFriend.fullName}
                    imageUrl={selectedFriend.profileImageUrl}
                    size="large"
                  />

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-extrabold">
                      {selectedFriend.fullName}
                    </h3>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {selectedFriend.department} · {selectedFriend.level}
                    </p>
                  </div>

                  <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-block">
                    Campus friend
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
                  <div className="mx-auto rounded-full bg-white px-4 py-2 text-xs font-medium text-slate-500 shadow-sm">
                    🔒 Your conversation with {selectedFriend.fullName}
                  </div>

                  {loadingMessages && messages.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-500">
                      Loading conversation...
                    </p>
                  ) : messages.length === 0 ? (
                    <div className="my-auto py-12 text-center">
                      <Avatar
                        name={selectedFriend.fullName}
                        imageUrl={selectedFriend.profileImageUrl}
                        size="large"
                      />
                      <h4 className="mt-4 text-lg font-bold">
                        Say hello to {selectedFriend.fullName.split(" ")[0]}!
                      </h4>
                      <p className="mt-2 text-sm text-slate-500">
                        Start the conversation. Your first message is waiting
                        to happen.
                      </p>
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      const isMine =
                        currentStudentId.length > 0
                          ? message.senderId === currentStudentId
                          : message.senderId !== selectedFriendId;

                      const previousMessage = messages[index - 1];
                      const showDate =
                        !previousMessage ||
                        formatDate(previousMessage.createdAt) !==
                          formatDate(message.createdAt);

                      return (
                        <div key={message.id}>
                          {showDate && (
                            <div className="my-3 text-center">
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                                {formatDate(message.createdAt)}
                              </span>
                            </div>
                          )}

                          <div
                            className={`flex items-end gap-2 ${
                              isMine ? "justify-end" : "justify-start"
                            }`}
                          >
                            {!isMine && (
                              <Avatar
                                name={message.sender.fullName}
                                imageUrl={message.sender.profileImageUrl}
                                size="small"
                              />
                            )}

                            <div
                              className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%] ${
                                isMine
                                  ? "rounded-br-md bg-indigo-600 text-white"
                                  : "rounded-bl-md border border-slate-100 bg-white text-slate-800"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                {message.content}
                              </p>

                              <div
                                className={`mt-2 flex items-center justify-end gap-1.5 text-[10px] ${
                                  isMine
                                    ? "text-indigo-100"
                                    : "text-slate-400"
                                }`}
                              >
                                <span>{formatTime(message.createdAt)}</span>
                                {isMine && (
                                  <span
                                    title={message.readAt ? "Read" : "Sent"}
                                    aria-label={message.readAt ? "Read" : "Sent"}
                                  >
                                    {message.readAt ? "✓✓" : "✓"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <form
                  onSubmit={sendMessage}
                  className="border-t border-slate-100 bg-white p-3 sm:p-5"
                >
                  <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50">
                    <textarea
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder="Write a message..."
                      aria-label="Write a message"
                      maxLength={2000}
                      rows={1}
                      className="max-h-32 min-h-11 flex-1 resize-y bg-transparent px-3 py-3 text-sm outline-none"
                    />

                    <button
                      type="submit"
                      disabled={!content.trim() || sending}
                      className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending ? "Sending..." : "Send ➤"}
                    </button>
                  </div>

                  <p className="mt-2 px-2 text-[11px] text-slate-400">
                    Enter to send · Shift + Enter for a new line
                  </p>
                </form>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-4xl">
                  💬
                </div>
                <h3 className="text-xl font-extrabold">
                  Your conversations start here
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Choose a friend to start chatting, or find more BOUESTI
                  students to connect with.
                </p>
                <Link
                  href="/students"
                  className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  Find students
                </Link>
              </div>
            )}
          </section>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          BOUESTI CHAT · Stay connected with your campus people.
        </p>
      </div>

      <MobileNav />
    </main>
  );
}
