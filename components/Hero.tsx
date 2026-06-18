import React from 'react';

export default function Hero() {
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            The Gallery
          </h1>
          <p className="text-lg text-slate-500 font-medium leading-relaxed">
            Curated excellence from top-tier global case competitions. Explore elite solutions across disciplines.
          </p>
        </div>
      </div>
    </div>
  );
}
