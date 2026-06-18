import React from 'react';
import Hero from '@/components/Hero';
import Gallery from '@/components/Gallery';
import { getSlides } from '@/repository/slides';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    tag?: string;
    sort?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = parseInt(params.limit || '9', 10); // 3x3 grid is premium
  const search = params.search || undefined;
  const tag = params.tag || undefined;
  const sort = params.sort || undefined;

  const result = await getSlides({
    page,
    limit,
    search,
    tag,
    sort,
  });

  return (
    <div className="flex-1 flex flex-col">
      <Hero />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex-1 w-full">
        <Gallery
          initialSlides={result.data}
          total={result.total}
          page={result.page}
          limit={result.limit}
          tag={tag}
          sort={sort}
          search={search}
        />
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
export const revalidate = 0;
