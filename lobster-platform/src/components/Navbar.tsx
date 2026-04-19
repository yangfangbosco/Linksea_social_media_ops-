"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed top-0 w-full h-14 flex items-center px-8 z-50 bg-white border-b border-border">
      <Link href="/" className="text-base font-bold text-primary tracking-tight">
        LinkSea AI
      </Link>
    </header>
  );
}
