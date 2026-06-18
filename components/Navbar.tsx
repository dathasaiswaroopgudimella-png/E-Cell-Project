'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Search, Upload, LogOut, LogIn, Menu, X } from 'lucide-react';

const CATEGORIES = ['Strategy', 'Finance', 'Marketing', 'Social Impact'];

export default function Navbar() {
  const { logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    } else {
      params.delete('search');
    }
    params.set('page', '1'); // Reset to page 1 on search
    router.push(`/?${params.toString()}`);
  };

  const handleCategoryClick = (category: string) => {
    const params = new URLSearchParams();
    params.set('tag', category);
    params.set('page', '1');
    router.push(`/?${params.toString()}`);
    setMobileMenuOpen(false);
  };

  const currentTag = searchParams.get('tag') || '';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900 tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">CaseVault</span>
            </Link>
          </div>

          {/* Desktop Navigation Categories */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                suppressHydrationWarning
                className={`transition-colors hover:text-blue-600 ${
                  currentTag.toLowerCase() === category.toLowerCase()
                    ? 'text-blue-600 font-semibold border-b-2 border-blue-600 py-1'
                    : 'text-slate-600'
                }`}
              >
                {category}
              </button>
            ))}
          </nav>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex relative max-w-xs w-full flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              name="search"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search presentations..."
              suppressHydrationWarning
              className="block w-full rounded-full border-0 bg-slate-100 py-1.5 pl-10 pr-3 text-slate-950 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-600 sm:text-sm border-slate-200 shadow-inner"
            />
          </form>

          {/* User Auth Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </Link>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  <LogOut className="h-3.5 w-3.5 text-slate-500" />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 transition"
                >
                  <LogIn className="h-3.5 w-3.5 text-slate-500" />
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-4 sm:hidden">
          <form onSubmit={handleSearchSubmit} className="relative w-full mb-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search presentations..."
              className="block w-full rounded-md border-0 bg-slate-100 py-2 pl-10 pr-3 text-slate-950 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-600 text-sm border-slate-200"
            />
          </form>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 py-1">Categories</div>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`block w-full text-left rounded-md px-3 py-2 text-sm font-medium ${
                  currentTag.toLowerCase() === category.toLowerCase()
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <hr className="my-4 border-slate-100" />

          <div className="space-y-2">
            {isAuthenticated ? (
              <>
                <Link
                  href="/upload"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  <Upload className="h-4 w-4" />
                  Upload Presentation
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/upload"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  <Upload className="h-4 w-4" />
                  Upload Presentation
                </Link>
                <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <LogIn className="h-4 w-4" />
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-md bg-slate-900 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  Register
                </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
