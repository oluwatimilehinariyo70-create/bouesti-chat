
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
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
  type?: "TEXT" | "IMAGE" | "VOICE";
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
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
  const [recording, setRecording] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const selectedFriendRef = useRef("");
  const initialLoadRef = useRef(true);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartedRef = useRef(false);
  const recordingCancelledRef = useRef(false);
  const recordingSecondsRef = useRef(0);
  const pendingImageRef = useRef<File | null>(null);
  const notificationCountsRef = useRef<Record<string, number>>({});
  const notificationsInitializedRef = useRef(false);


  const selectedFriend =
    friends.find((friend) => friend.id === selectedFriendId) ?? null;

  const stopRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const releaseMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

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

const nextCounts: Record<string, number> = {};

for (const friend of list) {
  const unreadCount = friend.unreadCount ?? 0;
  nextCounts[friend.id] = unreadCount;

  const previousCount = notificationCountsRef.current[friend.id];

  if (
    notificationsInitializedRef.current &&
    previousCount !== undefined &&
    unreadCount > previousCount &&
    friend.id !== selectedFriendRef.current &&
    document.hidden &&
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    const notification = new Notification(
      `New message from ${friend.fullName}`,
      {
        body:
          unreadCount === 1
            ? "You have a new message on BOUESTI CHAT."
            : `You have ${unreadCount} unread messages.`,
        tag: `bouesti-chat-${friend.id}`,
      }
    );

    notification.onclick = () => {
      window.focus();
      window.location.href = "/messages";
      notification.close();
    };
  }
}

notificationCountsRef.current = nextCounts;
notificationsInitializedRef.current = true;

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
        const previousLastId = messagesRef.current.at(-1)?.id;
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
    const timer = window.setInterval(() => void loadFriends(), 10000);
    return () => window.clearInterval(timer);
  }, [loadFriends]);

  useEffect(() => {
    selectedFriendRef.current = selectedFriendId;
    initialLoadRef.current = true;
    messagesRef.current = [];
    setMessages([]);

    if (!selectedFriendId) return;

    void loadMessages(selectedFriendId, true);

    const timer = window.setInterval(
      () => void loadMessages(selectedFriendId),
      3000
    );

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
        // The current student ID is optional for rendering.
      }
    }

    void loadCurrentStudent();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      stopRecordingTimer();

      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorderCancelledCleanup(recorder);
      }

      releaseMicrophone();

      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview, releaseMicrophone, stopRecordingTimer]);

  function recorderCancelledCleanup(recorder: MediaRecorder) {
    try {
      recorder.stop();
    } catch {
      // The recorder may already have stopped.
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
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

  async function uploadMedia(file: File, type: "IMAGE" | "VOICE") {
    if (!selectedFriendId || uploadingMedia) return;

    setUploadingMedia(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      formData.append("receiverId", selectedFriendId);
      formData.append("type", type);
      formData.append("file", file);

      const response = await fetch("/api/messages", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to upload media.");
      }

      setNotice(type === "IMAGE" ? "Image sent successfully." : "Voice note sent.");
      await loadMessages(selectedFriendId);
      void loadFriends();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload your media."
      );
    } finally {
      setUploadingMedia(false);
    }
  }

  function onImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // Allow choosing the same file again later.
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Images must be 5 MB or smaller.");
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);

    pendingImageRef.current = file;
    setImagePreview(URL.createObjectURL(file));
    setError("");
    setNotice("");
  }

  function cancelImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    pendingImageRef.current = null;
  }

  async function sendSelectedImage() {
    const file = pendingImageRef.current;
    if (!file) return;

    await uploadMedia(file, "IMAGE");

    // Keep the preview if uploading failed so the user can retry.
    if (!error) {
      cancelImage();
    }
  }

  async function startVoiceRecording() {
    if (recording || uploadingMedia) return;

    setError("");
    setNotice("");

    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError(
        "Voice recording is not supported by this browser. Try an updated browser on localhost or HTTPS."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      audioChunksRef.current = [];
      recordingCancelledRef.current = false;
      recordingStartedRef.current = false;
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];

      const supportedType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("Something went wrong while recording. Please try again.");
        stopRecordingTimer();
        releaseMicrophone();
        setRecording(false);
      };

      recorder.onstop = () => {
        const cancelled = recordingCancelledRef.current;
        const started = recordingStartedRef.current;
        const seconds = recordingSecondsRef.current;

        stopRecordingTimer();
        releaseMicrophone();
        setRecording(false);

        if (cancelled || !started) return;

        const mimeType =
          recorder.mimeType || audioChunksRef.current[0]?.type || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        if (blob.size === 0) {
          setError("No audio was recorded. Please try again.");
          return;
        }

        if (seconds < 1) {
          setError("Record for at least one second before sending.");
          return;
        }

        const extension = mimeType.includes("ogg")
          ? "ogg"
          : mimeType.includes("mp4")
            ? "m4a"
            : mimeType.includes("mpeg")
              ? "mp3"
              : "webm";

        const file = new File([blob], `voice-note.${extension}`, {
          type: mimeType,
        });

        void uploadMedia(file, "VOICE");
      };

      recorder.start();
      recordingStartedRef.current = true;
      setRecording(true);

      recordingTimerRef.current = window.setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);

        if (recordingSecondsRef.current >= 120) {
          const activeRecorder = recorderRef.current;
          if (activeRecorder?.state === "recording") {
            activeRecorder.stop();
          }
        }
      }, 1000);
    } catch (err) {
      releaseMicrophone();
      setRecording(false);

      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone access was denied. Allow microphone access in your browser settings."
          : "Unable to access your microphone. Check your browser permissions."
      );
    }
  }

  function stopAndSendVoice() {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.stop();
    }
  }

  function cancelVoiceRecording() {
    recordingCancelledRef.current = true;
    stopRecordingTimer();

    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      releaseMicrophone();
      setRecording(false);
    }

    audioChunksRef.current = [];
    setRecordingSeconds(0);
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

          <div className="flex items-center gap-2">
  <button
    type="button"
    onClick={async () => {
      if (!("Notification" in window)) {
        setError("Your browser does not support notifications.");
        return;
      }

      try {
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
          setNotice("Notifications enabled successfully!");
          setError("");
        } else {
          setNotice(
            "Notifications are not enabled. Allow them in your browser settings."
          );
        }
      } catch {
        setError("Unable to enable browser notifications.");
      }
    }}
    className="rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
  >
    🔔 Enable notifications
  </button>

  <Link
    href="/students"
    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50"
  >
    ← Students
  </Link>
</div>
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
                          {friend.unreadCount > 99 ? "99+" : friend.unreadCount}
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
                      const isMine = currentStudentId
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
                              {message.type === "IMAGE" && message.mediaUrl ? (
                                <a
                                  href={`/api/media/${message.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label="Open shared image"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`/api/media/${message.id}`}
                                    alt="Shared image"
                                    loading="lazy"
                                    className="max-h-80 w-full rounded-xl object-contain"
                                  />
                                </a>
                              ) : message.type === "VOICE" && message.mediaUrl ? (
                                <div className="min-w-48">
                                  <p className="mb-2 text-xs font-semibold">
                                    🎤 Voice note
                                  </p>
                                  <audio
                                    controls
                                    preload="metadata"
                                    src={`/api/media/${message.id}`}
                                    className="max-w-full"
                                  >
                                    Your browser cannot play this audio.
                                  </audio>
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                  {message.content}
                                </p>
                              )}

                              <div
                                className={`mt-2 flex items-center justify-end gap-1.5 text-[10px] ${
                                  isMine ? "text-indigo-100" : "text-slate-400"
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

                {imagePreview && (
                  <div className="border-t border-slate-100 bg-indigo-50 p-4">
                    <p className="mb-2 text-sm font-semibold text-slate-700">
                      Image preview
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Image selected to send"
                      className="max-h-48 max-w-full rounded-xl object-contain"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={cancelImage}
                        disabled={uploadingMedia}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void sendSelectedImage()}
                        disabled={uploadingMedia}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {uploadingMedia ? "Uploading..." : "Send image"}
                      </button>
                    </div>
                  </div>
                )}

                <form
                  onSubmit={sendMessage}
                  className="border-t border-slate-100 bg-white p-3 sm:p-5"
                >
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={onImageSelected}
                    className="hidden"
                    aria-label="Choose an image"
                  />

                  {recording && (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                      <span className="font-semibold">
                        🔴 Recording: {Math.floor(recordingSeconds / 60)}:
                        {String(recordingSeconds % 60).padStart(2, "0")}
                        {" "} / 2:00
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelVoiceRecording}
                          className="rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={stopAndSendVoice}
                          className="rounded-lg bg-red-600 px-3 py-2 font-bold text-white"
                        >
                          Stop & send
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50">
                    <button
                      type="button"
                      title="Send an image"
                      aria-label="Send an image"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingMedia || recording}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl transition hover:bg-indigo-50 disabled:opacity-50"
                    >
                      🖼️
                    </button>

                    <button
                      type="button"
                      title="Record a voice note"
                      aria-label="Record a voice note"
                      onClick={() => void startVoiceRecording()}
                      disabled={uploadingMedia || recording}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl transition hover:bg-indigo-50 disabled:opacity-50"
                    >
                      🎤
                    </button>

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
                      disabled={!content.trim() || sending || recording}
                      className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
                    >
                      {sending ? "Sending..." : "Send ➤"}
                    </button>
                  </div>

                  <p className="mt-2 px-2 text-[11px] text-slate-400">
                    🖼️ Image · 🎤 Voice note · Enter to send · Shift + Enter
                    for a new line
                    {uploadingMedia ? " · Uploading media..." : ""}
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
