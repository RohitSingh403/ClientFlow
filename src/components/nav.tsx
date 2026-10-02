"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SideNav({
  items,
  tone = "dark",
}: {
  items: { href: string; label: string }[];
  tone?: "dark" | "light";
}) {
  const pathname = usePathname();
  return (
    <nav className="nav" data-tone={tone} aria-label="Workspace">
      {items.map((item) => {
        const active = item.href === "/dashboard" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className="nav-link" data-active={active ? "true" : "false"} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
