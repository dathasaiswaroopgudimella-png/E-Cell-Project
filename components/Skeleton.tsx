import React from 'react';

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm animate-pulse">
      <div className="h-48 bg-slate-200 w-full" />
      <div className="p-5 space-y-4">
        <div className="h-4 bg-slate-200 rounded w-1/4" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
        </div>
        <div className="h-3 bg-slate-200 rounded w-5/6" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-3 bg-slate-200 rounded w-1/3" />
          <div className="h-8 bg-slate-200 rounded-lg w-1/4" />
        </div>
      </div>
    </div>
  );
}

export default function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
