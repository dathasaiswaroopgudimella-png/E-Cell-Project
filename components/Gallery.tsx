'use client';

import React, { useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Slide } from '@/types';
import SlideCard from './SlideCard';
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

interface GalleryProps {
  initialSlides: Slide[];
  total: number;
  page: number;
  limit: number;
  tag?: string;
  sort?: string;
  search?: string;
}

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest Submissions' },
  { value: 'oldest', label: 'Oldest Submissions' },
  { value: 'title_asc', label: 'Alphabetical (A-Z)' },
];

export default function Gallery({
  initialSlides,
  total,
  page,
  limit,
  tag = '',
  sort = 'latest',
  search = '',
}: GalleryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(total / limit);

  const updateParams = (newParams: { [key: string]: string | number | undefined }) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.push(`/?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateParams({ page: newPage });
    }
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParams({ sort: e.target.value, page: 1 });
  };

  const handleMobileSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = mobileSearchInputRef.current?.value || '';
    updateParams({ search: val.trim(), page: 1 });
  };

  const clearFilters = () => {
    if (mobileSearchInputRef.current) mobileSearchInputRef.current.value = '';
    router.push('/');
  };

  const handleDeleteSuccess = () => {
    router.refresh();
  };

  return (
    <div className="space-y-8">
      
      {/* Filtering, Search & Sorting Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        
        {/* Sort Select */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          <span>Sort by:</span>
          <select
            value={sort}
            onChange={handleSortChange}
            suppressHydrationWarning
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:border-blue-600 focus:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Small screen search input */}
        <div className="flex sm:hidden w-full">
          <form onSubmit={handleMobileSearchSubmit} className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              ref={mobileSearchInputRef}
              key={`mobile-search-${search}`}
              type="text"
              defaultValue={search}
              placeholder="Search presentations..."
              className="block w-full rounded-lg border border-slate-300 py-1.5 pl-10 pr-3 text-sm focus:border-blue-600 focus:outline-none"
            />
          </form>
        </div>

        {/* Active Filters Summary */}
        {(tag || search) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Active Filters:</span>
            {tag && (
              <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                Category: {tag}
                <button onClick={() => updateParams({ tag: undefined, page: 1 })} className="hover:text-blue-900 ml-1">×</button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                Search: &ldquo;{search}&rdquo;
                <button onClick={() => updateParams({ search: undefined, page: 1 })} className="hover:text-blue-900 ml-1">×</button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-4"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Gallery Cards Grid */}
      {initialSlides.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {initialSlides.map((slide) => (
            <SlideCard key={slide.id} slide={slide} onDeleteSuccess={handleDeleteSuccess} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-inner">
          <svg
            className="mx-auto h-12 w-12 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m-9 1V4a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-slate-900">No presentations found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {(tag || search)
              ? 'Try modifying your search query or filter tags.'
              : 'Start by uploading the first case study.'}
          </p>
          {(tag || search) && (
            <div className="mt-6">
              <button
                onClick={clearFilters}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between border-t border-slate-200 px-4 py-4 sm:px-0 mt-8">
          <div className="-mt-px flex w-0 flex-1">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="inline-flex items-center border-t-2 border-transparent pr-1 pt-4 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="mr-3 h-5 w-5 text-slate-400" aria-hidden="true" />
              Previous
            </button>
          </div>
          <div className="hidden md:-mt-px md:flex">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const p = idx + 1;
              return (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`inline-flex items-center border-t-2 px-4 pt-4 text-sm font-medium transition ${
                    p === page
                      ? 'border-blue-500 text-blue-600 font-semibold'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <div className="-mt-px flex w-0 flex-1 justify-end">
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="inline-flex items-center border-t-2 border-transparent pl-1 pt-4 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Next
              <ChevronRight className="ml-3 h-5 w-5 text-slate-400" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}

    </div>
  );
}
export const dynamic = 'force-dynamic';
