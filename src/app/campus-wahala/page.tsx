
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";

type Student = {
  id: string;
  fullName: string;
  department?: string;
  level?: string;
  profileImageUrl?: string | null;
};

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: Student;
};

type Reaction = {
  id: string;
  studentId: string;
  type: "LAUGH" | "LOVE" | "FIRE" | "CRY" | "EYES";
};

type PollOption = {
  id: string;
  text: string;
  votes: { studentId: string }[];
};

type Post = {
  id: string;
  content: string;
  type: "POST" | "POLL";
  createdAt: string;
  author: Student;
  comments: Comment[];
  reactions: Reaction[];
  options: PollOption[];
  votes: { studentId: string; optionId: string }[];
};

const reactions = [
  { type: "LAUGH", emoji: "😂", label: "Funny" },
  { type: "LOVE", emoji: "❤️", label: "Love" },
  { type: "FIRE", emoji: "🔥", label: "Fire" },
  { type: "CRY", emoji: "😭", label: "Crying" },
  { type: "EYES", emoji: "👀", label: "Eyes" },
] as const;

function timeAgo(date: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  );

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(date).toLocaleDateString();
}

function Avatar({ student, size = "normal" }: { student: Student; size?: "normal" | "small" }) {
  const sizeClass = size === "small" ? "h-8 w-8 text-xs" : "h-11 w-11 text-sm";

  return student.profileImageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={student.profileImageUrl}
      alt=""
      className={`${sizeClass} rounded-full object-cover`}
    />
  ) : (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700`}>
      {student.fullName.charAt(0).toUpperCase()}
    </div>
  );
}

export default function CampusWahalaPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentStudentId, setCurrentStudentId] = useState("");
  const [content, setContent] = useState("");
  const [isPoll, setIsPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [feedFilter, setFeedFilter] = useState<"LATEST" | "TRENDING">("LATEST");

  const loadPosts = useCallback(async () => {
    try {
      const response = await fetch("/api/campus-wahala", {
        cache: "no-store",
      });
      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to load the feed.");
      }

      setPosts(data.posts ?? []);
      setCurrentStudentId(data.currentStudentId ?? "");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  async function sendAction(payload: Record<string, unknown>) {
    const response = await fetch("/api/campus-wahala", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.status === 401) {
      window.location.href = "/login";
      throw new Error("Please log in again.");
    }

    if (!response.ok) {
      throw new Error(data.message || "Action failed.");
    }

    return data;
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError("Write something before posting.");
      return;
    }

    const options = pollOptions.map((option) => option.trim()).filter(Boolean);

    if (isPoll && (options.length < 2 || options.length > 6)) {
      setError("Your poll needs between 2 and 6 options.");
      return;
    }

    setPosting(true);

    try {
      await sendAction({
        action: "post",
        content: trimmedContent,
        ...(isPoll ? { options } : {}),
      });

      setContent("");
      setIsPoll(false);
      setPollOptions(["", ""]);
      setNotice("Your post is live! Let the gist begin 🔥");
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish.");
    } finally {
      setPosting(false);
    }
  }

  async function reactToPost(postId: string, reaction: string) {
    setBusyKey(`${postId}-${reaction}`);
    setError("");

    try {
      await sendAction({ action: "react", postId, reaction });
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to react.");
    } finally {
      setBusyKey("");
    }
  }

  async function addComment(postId: string) {
    const comment = (commentInputs[postId] ?? "").trim();
    if (!comment) return;

    setBusyKey(`${postId}-comment`);
    setError("");

    try {
      await sendAction({ action: "comment", postId, content: comment });
      setCommentInputs((previous) => ({ ...previous, [postId]: "" }));
      setShowComments((previous) => ({ ...previous, [postId]: true }));
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to comment.");
    } finally {
      setBusyKey("");
    }
  }

  async function vote(postId: string, optionId: string) {
    setBusyKey(`${postId}-vote`);
    setError("");

    try {
      await sendAction({ action: "vote", postId, optionId });
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to vote.");
    } finally {
      setBusyKey("");
    }
  }

  const displayedPosts = [...posts].sort((a, b) => {
    if (feedFilter === "TRENDING") {
      const scoreA = a.reactions.length + a.comments.length * 2 + a.votes.length;
      const scoreB = b.reactions.length + b.comments.length * 2 + b.votes.length;
      return scoreB - scoreA;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <main className="min-h-screen bg-slate-50 pb-24 md:pb-8">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#241449] text-white shadow-lg">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <Link href="/students" className="text-sm font-semibold text-violet-200 hover:text-white">
            ← Students
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-black tracking-tight">🔥 Campus Wahala</h1>
            <p className="text-xs text-violet-200">Your campus. Your people. Your gist.</p>
          </div>
          <Link href="/profile" className="text-sm font-semibold text-violet-200 hover:text-white">
            Profile
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-3 py-5 sm:px-5">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-700 p-5 text-white shadow-md sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">
            BOUESTI community
          </p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">
            What&apos;s the gist? 👀
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-violet-100">
            Share your campus moments, ask questions, create polls, and join the conversation.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/15 px-3 py-2">😂 Funny gist</span>
            <span className="rounded-full bg-white/15 px-3 py-2">📊 Campus polls</span>
            <span className="rounded-full bg-white/15 px-3 py-2">🔥 Trending</span>
          </div>
        </section>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {notice}
          </div>
        )}

        <form onSubmit={createPost} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xl">
              💬
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="campus-post" className="mb-2 block text-sm font-bold text-slate-800">
                Drop your gist
              </label>
              <textarea
                id="campus-post"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="What's happening on campus? Make us laugh 😂"
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <div className="mt-1 text-right text-xs text-slate-400">
                {content.length}/2000
              </div>
            </div>
          </div>

          {isPoll && (
            <div className="mt-4 rounded-xl bg-violet-50 p-3">
              <h3 className="mb-3 text-sm font-bold text-violet-900">📊 Poll options</h3>
              <div className="space-y-2">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      value={option}
                      onChange={(event) =>
                        setPollOptions((previous) =>
                          previous.map((item, itemIndex) =>
                            itemIndex === index ? event.target.value : item
                          )
                        )
                      }
                      maxLength={200}
                      placeholder={`Option ${index + 1}`}
                      className="min-w-0 flex-1 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPollOptions((previous) =>
                            previous.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                        aria-label={`Remove option ${index + 1}`}
                        className="rounded-lg px-3 text-red-600 hover:bg-red-100"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 6 && (
                <button
                  type="button"
                  onClick={() => setPollOptions((previous) => [...previous, ""])}
                  className="mt-3 text-sm font-bold text-violet-700 hover:text-violet-900"
                >
                  + Add option
                </button>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setIsPoll((previous) => !previous)}
              className={`rounded-full px-3 py-2 text-sm font-bold transition ${
                isPoll ? "bg-violet-100 text-violet-800" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              📊 {isPoll ? "Remove poll" : "Create poll"}
            </button>
            <button
              type="submit"
              disabled={posting || !content.trim()}
              className="rounded-full bg-violet-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {posting ? "Posting..." : "Post gist 🔥"}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">The latest gist</h2>
            <p className="text-sm text-slate-500">See what your campus people are saying.</p>
          </div>
          <div className="flex rounded-full bg-slate-200 p-1">
            <button
              onClick={() => setFeedFilter("LATEST")}
              className={`rounded-full px-3 py-2 text-xs font-bold ${
                feedFilter === "LATEST" ? "bg-white text-violet-800 shadow-sm" : "text-slate-600"
              }`}
            >
              Latest
            </button>
            <button
              onClick={() => setFeedFilter("TRENDING")}
              className={`rounded-full px-3 py-2 text-xs font-bold ${
                feedFilter === "TRENDING" ? "bg-white text-violet-800 shadow-sm" : "text-slate-600"
              }`}
            >
              🔥 Trending
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading the gist... 🔥
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-violet-300 bg-white p-10 text-center">
            <div className="text-5xl">👀</div>
            <h3 className="mt-3 text-lg font-black text-slate-900">It's quiet in here!</h3>
            <p className="mt-2 text-sm text-slate-500">
              Be the first to drop gist and start the conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedPosts.map((post) => {
              const myReaction = post.reactions.find(
                (reaction) => reaction.studentId === currentStudentId
              );
              const myVote = post.votes.find(
                (vote) => vote.studentId === currentStudentId
              );

              return (
                <article key={post.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <Avatar student={post.author} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-bold text-slate-900">{post.author.fullName}</span>
                          {post.author.id === currentStudentId && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                              YOU
                            </span>
                          )}
                          <span className="text-xs text-slate-400">· {timeAgo(post.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {[post.author.department, post.author.level].filter(Boolean).join(" · ") || "BOUESTI student"}
                        </p>
                      </div>
                      {post.type === "POLL" && (
                        <span className="rounded-full bg-fuchsia-50 px-2.5 py-1 text-xs font-bold text-fuchsia-700">
                          📊 POLL
                        </span>
                      )}
                    </div>

                    <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-800">
                      {post.content}
                    </p>

                    {post.type === "POLL" && (
                      <div className="mt-4 space-y-2">
                        {post.options.map((option) => {
                          const totalVotes = post.votes.length;
                          const optionVotes = option.votes.length;
                          const percentage = totalVotes
                            ? Math.round((optionVotes / totalVotes) * 100)
                            : 0;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={busyKey === `${post.id}-vote`}
                              onClick={() => void vote(post.id, option.id)}
                              className={`relative w-full overflow-hidden rounded-xl border p-3 text-left transition ${
                                myVote?.optionId === option.id
                                  ? "border-violet-400 bg-violet-50"
                                  : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50"
                              }`}
                            >
                              <span
                                className="absolute inset-y-0 left-0 bg-violet-100/80 transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                              <span className="relative flex items-center justify-between gap-3 text-sm">
                                <span className="font-semibold text-slate-800">
                                  {myVote?.optionId === option.id ? "✓ " : ""}
                                  {option.text}
                                </span>
                                <span className="shrink-0 font-bold text-violet-800">
                                  {percentage}% · {optionVotes}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                        <p className="text-xs text-slate-400">
                          {post.votes.length} vote{post.votes.length === 1 ? "" : "s"} · Tap an option to vote or change your vote.
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>{post.reactions.length} reaction{post.reactions.length === 1 ? "" : "s"}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setShowComments((previous) => ({
                            ...previous,
                            [post.id]: !previous[post.id],
                          }))
                        }
                        className="font-semibold hover:text-violet-700"
                      >
                        💬 {post.comments.length} comment{post.comments.length === 1 ? "" : "s"}
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-5 gap-1 sm:gap-2">
                      {reactions.map((reaction) => {
                        const selected = myReaction?.type === reaction.type;

                        return (
                          <button
                            key={reaction.type}
                            type="button"
                            disabled={busyKey === `${post.id}-${reaction.type}`}
                            onClick={() => void reactToPost(post.id, reaction.type)}
                            title={reaction.label}
                            aria-label={`${reaction.label} reaction`}
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition sm:flex-row sm:gap-2 ${
                              selected
                                ? "border-violet-300 bg-violet-100 text-violet-900"
                                : "border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span className="text-lg">{reaction.emoji}</span>
                            <span className="text-xs font-bold">
                              {post.reactions.filter((item) => item.type === reaction.type).length}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {showComments[post.id] && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <h3 className="mb-3 text-sm font-bold text-slate-800">Join the gist 💬</h3>
                        {post.comments.length > 0 ? (
                          <div className="mb-4 space-y-4">
                            {post.comments.map((comment) => (
                              <div key={comment.id} className="flex items-start gap-2">
                                <Avatar student={comment.author} size="small" />
                                <div className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900">
                                      {comment.author.fullName}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {timeAgo(comment.createdAt)}
                                    </span>
                                  </div>
                                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mb-3 text-sm text-slate-400">No comments yet. Start the conversation!</p>
                        )}

                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            void addComment(post.id);
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            value={commentInputs[post.id] ?? ""}
                            onChange={(event) =>
                              setCommentInputs((previous) => ({
                                ...previous,
                                [post.id]: event.target.value,
                              }))
                            }
                            maxLength={1000}
                            placeholder="Add a comment..."
                            className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          />
                          <button
                            type="submit"
                            disabled={
                              busyKey === `${post.id}-comment` ||
                              !(commentInputs[post.id] ?? "").trim()
                            }
                            className="rounded-full bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50"
                          >
                            Send
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="py-4 text-center text-xs text-slate-400">
          Keep the gist fun. Respect fellow students. 💜
        </footer>
      </div>

      <MobileNav />
    </main>
  );
}
