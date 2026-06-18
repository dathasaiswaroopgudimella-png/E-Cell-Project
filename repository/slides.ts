import { supabaseAdmin } from '@/services/supabase';
import { Slide, SlidesResponse } from '@/types';

export interface CreateSlideInput {
  title: string;
  description: string;
  tags: string[];
  competitionName: string;
  year: number;
  category: string;
  previewUrl: string;
  slideUrl: string;
  userId: string;
}

export interface UpdateSlideInput {
  title?: string;
  description?: string;
  tags?: string[];
  competitionName?: string;
  year?: number;
  category?: string;
  previewUrl?: string;
  slideUrl?: string;
  updatedAt?: string;
}

export async function getSlides(params: {
  page: number;
  limit: number;
  search?: string;
  tag?: string;
  sort?: string;
}): Promise<SlidesResponse> {
  const { page, limit, search, tag, sort } = params;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('slides')
    .select('*', { count: 'exact' });

  // Filter by tag/category
  if (tag) {
    // Sanitize tag to prevent PostgREST syntax crashes
    const sanitizedTag = tag.replace(/[,():]/g, ' ').trim();
    if (sanitizedTag) {
      // Check if the tag matches the category column, or if it is inside the tags array
      query = query.or(`category.eq."${sanitizedTag}",tags.cs.{"${sanitizedTag}"}`);
    }
  }

  // Search filter
  if (search) {
    // Sanitize search to prevent PostgREST syntax errors on commas, colons, parentheses
    const sanitizedSearch = search.replace(/[,():]/g, ' ').trim();
    if (sanitizedSearch) {
      const searchPattern = `%${sanitizedSearch}%`;
      query = query.or(
        `title.ilike.${searchPattern},description.ilike.${searchPattern},competitionName.ilike.${searchPattern}`
      );
    }
  }

  // Sorting
  const sortOption = sort || 'latest';
  if (sortOption === 'oldest') {
    query = query.order('createdAt', { ascending: true });
  } else if (sortOption === 'title_asc') {
    query = query.order('title', { ascending: true });
  } else if (sortOption === 'title_desc') {
    query = query.order('title', { ascending: false });
  } else {
    // Default to 'latest'
    query = query.order('createdAt', { ascending: false });
  }

  // Pagination bounds
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching slides from repository:', error);
    return { data: [], page, limit, total: 0 };
  }

  return {
    data: data || [],
    page,
    limit,
    total: count || 0,
  };
}

export async function getSlideById(id: string): Promise<Slide | null> {
  const { data, error } = await supabaseAdmin
    .from('slides')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching slide ${id}:`, error);
    return null;
  }
  return data;
}

export async function createSlide(input: CreateSlideInput): Promise<Slide | null> {
  const { data, error } = await supabaseAdmin
    .from('slides')
    .insert([input])
    .select()
    .single();

  if (error) {
    console.error('Error creating slide in repository:', error);
    return null;
  }
  return data;
}

export async function updateSlide(id: string, input: UpdateSlideInput): Promise<Slide | null> {
  const { data, error } = await supabaseAdmin
    .from('slides')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating slide ${id}:`, error);
    return null;
  }
  return data;
}

export async function deleteSlide(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('slides')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting slide ${id}:`, error);
    return false;
  }
  return true;
}
