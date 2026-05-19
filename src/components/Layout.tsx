import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/", label: "Головна" },
  { to: "/subjects", label: "Предмети" },
  { to: "/progress", label: "Прогрес" }
];

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen text-ink">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <NavLink to="/" className="soft-ring rounded-2xl">
            <span className="block font-display text-2xl font-black tracking-tight">РозуМашка</span>
            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-moss">
              іспитовий тренажер
            </span>
          </NavLink>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "soft-ring rounded-full px-4 py-2 text-sm font-bold transition",
                    isActive
                      ? "bg-ink text-paper"
                      : "bg-white/60 text-ink hover:bg-white"
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">{children}</main>
    </div>
  );
}
