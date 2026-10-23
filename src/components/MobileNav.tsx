
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationLinks = [
  {
    label: "Students",
    href: "/students",
    icon: "👥",
  },
  {
    label: "Messages",
    href: "/messages",
    icon: "💬",
  },
  {
    label: "Profile",
    href: "/profile",
    icon: "👤",
  },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Leaves space so the navigation does not cover page content */}
      <div className="h-20 md:hidden" aria-hidden="true" />

      {/* Fixed bottom navigation for mobile screens */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {navigationLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="text-xl" aria-hidden="true">
                  {link.icon}
                </span>

                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
