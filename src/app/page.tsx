
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-black text-white">
            B
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              BOUESTI<span className="text-indigo-600"> CHAT</span>
            </h1>
            <p className="text-xs text-slate-500">Your campus. Your people.</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-white sm:block"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
          >
            Join the campus
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-12 md:grid-cols-2 md:pb-32 md:pt-20">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Made for BOUESTI students
          </div>

          <h2 className="max-w-2xl text-5xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Campus gist,
            <br />
            <span className="text-indigo-600">without the distance.</span>
          </h2>

          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
            Meet your course mates, catch up with friends, create group chats,
            and stay connected with the BOUESTI community—all in one place.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-2xl bg-indigo-600 px-7 py-4 text-center font-bold text-white shadow-xl shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700"
            >
              Get started — it&apos;s free →
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border border-slate-200 bg-white px-7 py-4 text-center font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              I already have an account
            </Link>
          </div>

          <div className="mt-10 flex items-center gap-4 text-sm text-slate-500">
            <div className="flex -space-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#f7f8fc] bg-amber-200 font-bold text-amber-900">S</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#f7f8fc] bg-emerald-200 font-bold text-emerald-900">T</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#f7f8fc] bg-pink-200 font-bold text-pink-900">A</div>
            </div>
            <p>One campus. New connections. Real conversations.</p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -left-8 top-16 h-40 w-40 rounded-full bg-indigo-200/60 blur-3xl" />
          <div className="absolute -right-5 bottom-10 h-40 w-40 rounded-full bg-pink-200/60 blur-3xl" />

          <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-5 shadow-2xl shadow-indigo-100 sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Your messages</p>
                <h3 className="mt-1 text-xl font-extrabold">Campus inbox</h3>
              </div>
              <div className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-600">Demo</div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-800">D</div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="font-bold">Department mates</p>
                    <span className="text-xs text-slate-400">10:24</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500">Who has the lecture notes? 📚</p>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
              </div>

              <div className="flex items-center gap-3 rounded-2xl p-4 transition hover:bg-slate-50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">C</div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="font-bold">Course crew 🎓</p>
                    <span className="text-xs text-slate-400">09:51</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500">Our timetable is out!</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl p-4 transition hover:bg-slate-50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pink-100 text-lg font-bold text-pink-800">M</div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="font-bold">Micheal</p>
                    <span className="text-xs text-slate-400">Yesterday</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500">You dey around campus? 😂</p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-indigo-600 p-5 text-white">
              <p className="text-sm font-medium text-indigo-100">Good conversations start here.</p>
              <p className="mt-1 text-xl font-extrabold">Your campus, connected.</p>
            </div>
            <p className="mt-4 text-center text-xs text-slate-400">
              Preview only · Sample messages, not real chats
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">Everything in one place</p>
            <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Stay connected on campus</h3>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Built around the way BOUESTI students communicate, collaborate, and make memories.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-100 bg-[#f7f8fc] p-6">
              <div className="text-3xl">💬</div>
              <h4 className="mt-4 text-lg font-extrabold">Private chats</h4>
              <p className="mt-2 leading-7 text-slate-600">Have one-to-one conversations with your campus friends.</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-[#f7f8fc] p-6">
              <div className="text-3xl">👥</div>
              <h4 className="mt-4 text-lg font-extrabold">Group conversations</h4>
              <p className="mt-2 leading-7 text-slate-600">Keep your course mates and project teams in one chat.</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-[#f7f8fc] p-6">
              <div className="text-3xl">🎓</div>
              <h4 className="mt-4 text-lg font-extrabold">Student community</h4>
              <p className="mt-2 leading-7 text-slate-600">A space designed specifically for the BOUESTI student community.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-7 text-center text-sm text-slate-500">
        © 2026 BOUESTI CHAT. Built for the campus community.
      </footer>
    </main>
  );
}
