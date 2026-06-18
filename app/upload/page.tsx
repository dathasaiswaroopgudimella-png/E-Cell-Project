'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Upload, Image as ImageIcon, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const CATEGORIES = ['Strategy', 'Finance', 'Marketing', 'Social Impact'];
const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

export default function UploadPage() {
  const { isAuthenticated, token, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Form State
  const [title, setTitle] = useState('');
  const [competitionName, setCompetitionName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  // File states
  const [slideFile, setSlideFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);

  // Drag-and-drop highlight state
  const [dragActive, setDragActive] = useState(false);

  // Submission / Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // File Input Refs
  const slideInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);

  // Clean up ObjectURL preview on unmount
  useEffect(() => {
    return () => {
      if (previewImageSrc) {
        URL.revokeObjectURL(previewImageSrc);
      }
    };
  }, [previewImageSrc]);

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirecting...
  }

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle Drop for slide file (PDF)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetSlideFile(file);
    }
  };

  const validateAndSetSlideFile = (file: File) => {
    setError('');
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setError('Only PDF files are supported for case materials.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Slide deck file is too large. Max size is 20MB.');
      return;
    }
    setSlideFile(file);
  };

  // Handle manual file selection
  const handleSlideSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetSlideFile(e.target.files[0]);
    }
  };

  const validateAndSetPreviewFile = (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Preview file must be an image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Thumbnail image is too large. Max size is 5MB.');
      return;
    }
    setPreviewImage(file);
    if (previewImageSrc) URL.revokeObjectURL(previewImageSrc);
    setPreviewImageSrc(URL.createObjectURL(file));
  };

  const handlePreviewSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetPreviewFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!slideFile) {
      setError('Please attach your case competition slide deck (PDF).');
      return;
    }
    if (!previewImage) {
      setError('Please select a preview thumbnail image.');
      return;
    }
    if (!title.trim() || !competitionName.trim() || !description.trim()) {
      setError('Please fill in all required metadata fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('slideFile', slideFile);
      formData.append('previewImage', previewImage);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('competitionName', competitionName.trim());
      formData.append('year', year);
      formData.append('category', category);
      formData.append('tags', tags);

      const res = await fetch('/api/slides', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload presentation.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-grow bg-[#f7f8fb] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to gallery
          </Link>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">Curate Your Work</h1>
          <p className="text-base text-slate-500 max-w-lg mx-auto">
            Submit your strategic analysis to the executive vault. Ensure your materials meet our standards for academic rigor and professional presentation.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 border-l-4 border-red-500 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm font-medium text-red-800">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 border-l-4 border-green-500 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div className="text-sm font-medium text-green-800">Slide uploaded successfully! Redirecting...</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-10 space-y-8">
          
          {/* DRAG AND DROP ZONE FOR SLIDE PDF */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Case Materials</label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => slideInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/30'
              }`}
            >
              <input
                ref={slideInputRef}
                type="file"
                accept=".pdf"
                onChange={handleSlideSelect}
                className="hidden"
              />
              <div className="rounded-full bg-slate-100 p-3 mb-4 text-slate-600">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {slideFile ? `Selected: ${slideFile.name}` : 'Drag and drop slides here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {slideFile ? `${(slideFile.size / 1024 / 1024).toFixed(2)} MB` : 'or click to browse (.pdf only, max 20MB)'}
              </p>
            </div>
          </div>

          {/* PREVIEW THUMBNAIL */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Preview Thumbnail</label>
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl border border-slate-200">
              
              {/* Image Preview Box */}
              <div className="w-40 h-24 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden flex-shrink-0 relative">
                {previewImageSrc ? (
                  <Image src={previewImageSrc} alt="Preview Thumbnail" fill className="object-cover" unoptimized />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                )}
              </div>

              {/* Choose File Action */}
              <div className="text-center sm:text-left space-y-2">
                <button
                  type="button"
                  onClick={() => previewInputRef.current?.click()}
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none"
                >
                  Choose File
                </button>
                <input
                  ref={previewInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePreviewSelect}
                  className="hidden"
                />
                <p className="text-xs text-slate-500">Optimal ratio 16:9, Max size 5MB.</p>
              </div>

            </div>
          </div>

          {/* CASE TITLE */}
          <div className="space-y-1.5">
            <label htmlFor="case-title" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Case Title</label>
            <input
              id="case-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a prestigious title..."
              className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm"
              suppressHydrationWarning
            />
          </div>

          {/* COMPETITION NAME & YEAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="competition-name" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Competition Name</label>
              <input
                id="competition-name"
                type="text"
                required
                value={competitionName}
                onChange={(e) => setCompetitionName(e.target.value)}
                placeholder="e.g., Global Strategy Case 2024"
                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm"
                suppressHydrationWarning
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="year" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Year</label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm"
                suppressHydrationWarning
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CATEGORY & TAGS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="category" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Category</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm"
                suppressHydrationWarning
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="tags" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Tags (comma-separated)</label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., consulting, tech, analysis"
                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm"
                suppressHydrationWarning
              />
            </div>
          </div>

          {/* EXECUTIVE SUMMARY / DESCRIPTION */}
          <div className="space-y-1.5">
            <label htmlFor="summary" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Executive Summary</label>
            <textarea
              id="summary"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a concise summary of the case problem and your strategic solution..."
              className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm"
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-4 border-t border-slate-100 pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-950 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish to Vault'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
