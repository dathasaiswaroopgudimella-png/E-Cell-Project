import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-950 text-slate-400 py-10 mt-auto border-t border-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-bold text-white tracking-tight">
              CaseVault
            </Link>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-medium">
            <Link href="/" className="hover:text-white transition-colors">
              The Gallery
            </Link>
            <span className="cursor-not-allowed hover:text-slate-400">
              Methodology
            </span>
            <span className="cursor-not-allowed hover:text-slate-400">
              Privacy Policy
            </span>
            <span className="cursor-not-allowed hover:text-slate-400">
              Contact Support
            </span>
          </nav>

          {/* Copyright */}
          <div className="text-xs">
            &copy; {new Date().getFullYear()} CaseVault Executive. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
