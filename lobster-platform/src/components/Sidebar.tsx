"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/campaigns", label: "社媒运营" },
  { href: "/products", label: "产品资料" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[200px] shrink-0 bg-white border-r border-border flex flex-col">
      <nav className="flex-1 p-2 pt-4 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? "bg-primary/10 text-primary"
                : "text-secondary hover:bg-surface-bright"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
