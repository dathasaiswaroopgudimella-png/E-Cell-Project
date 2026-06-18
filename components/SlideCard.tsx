'use client';

import React, { useState } from 'react';
import { Slide } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { ExternalLink, Trash2, Calendar, Award, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface SlideCardProps {
  slide: Slide;
  onDeleteSuccess?: (id: string) => void;
}

export default function SlideCard({ slide, onDeleteSuccess }: SlideCardProps) {
  const { user, token, isAuthenticated } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = isAuthenticated && user?.id === slide.userId;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this case presentation? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/slides/${slide.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete slide');
      }

      if (onDeleteSuccess) {
        onDeleteSuccess(slide.id);
      }
    } catch (err) {
      const error = err as Error;
      alert(error.message || 'An error occurred during deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="group flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative h-full">
      
      {/* Category Tag overlay */}
      <span className="absolute top-3 left-3 z-10 rounded-md bg-white/95 backdrop-blur px-2.5 py-1 text-xs font-bold text-slate-800 shadow-sm border border-slate-100">
        {slide.category}
      </span>

      {/* Preview Image */}
      <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden border-b border-slate-200 flex-shrink-0">
        <Image
          src={slide.previewUrl}
          alt={slide.title}
          fill
          className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-5">
        
        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 line-clamp-2 leading-snug tracking-tight mb-2 group-hover:text-blue-600 transition-colors">
          {slide.title}
        </h3>

        {/* Description / Summary */}
        <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-grow leading-relaxed">
          {slide.description}
        </p>

        {/* Metadata */}
        <div className="space-y-1.5 border-t border-slate-100 pt-4 mb-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">{slide.competitionName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Class of {slide.year}</span>
          </div>
        </div>

        {/* Tags list */}
        {slide.tags && slide.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {slide.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-auto pt-2">
          {isOwner ? (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
              title="Delete Case presentation"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div />
          )}

          <a
            href={slide.slideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
          >
            Open PDF
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

      </div>
    </div>
  );
}
