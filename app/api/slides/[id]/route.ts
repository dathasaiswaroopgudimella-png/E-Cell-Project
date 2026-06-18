import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getSlideById, updateSlide, deleteSlide, UpdateSlideInput } from '@/repository/slides';
import { supabaseAdmin } from '@/services/supabase';

// Helper to extract file name from Supabase storage URL
function getFileNameFromUrl(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1];
}

// GET /api/slides/:id - Public fetch slide details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const slide = await getSlideById(id);

    if (!slide) {
      return NextResponse.json({ error: 'Slide not found.' }, { status: 404 });
    }

    return NextResponse.json({ slide });
  } catch (error) {
    const err = error as Error;
    console.error('GET single slide API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch slide details.' },
      { status: 500 }
    );
  }
}

// PUT /api/slides/:id - Protected update slide metadata
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Bearer token is required.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token.' },
        { status: 401 }
      );
    }

    const userId = decoded.sub;

    // 2. Fetch existing slide to check ownership
    const existingSlide = await getSlideById(id);
    if (!existingSlide) {
      return NextResponse.json({ error: 'Slide not found.' }, { status: 404 });
    }

    if (existingSlide.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this slide.' },
        { status: 403 }
      );
    }

    // 3. Parse and Validate body
    const body = await request.json();
    const { title, description, tags, competitionName, year, category } = body;

    // Build update object
    const updateData: UpdateSlideInput = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (competitionName !== undefined) updateData.competitionName = competitionName;
    
    if (year !== undefined) {
      const parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear)) {
        return NextResponse.json({ error: 'Year must be a valid number.' }, { status: 400 });
      }
      updateData.year = parsedYear;
    }
    
    if (category !== undefined) updateData.category = category;

    updateData.updatedAt = new Date().toISOString();

    // 4. Update in Database
    const updatedSlide = await updateSlide(id, updateData);
    if (!updatedSlide) {
      return NextResponse.json({ error: 'Failed to update slide.' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Slide updated successfully.',
      slide: updatedSlide,
    });
  } catch (error) {
    const err = error as Error;
    console.error('PUT slide API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

// DELETE /api/slides/:id - Protected delete slide and storage files
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Bearer token is required.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token.' },
        { status: 401 }
      );
    }

    const userId = decoded.sub;

    // 2. Fetch existing slide to check ownership
    const existingSlide = await getSlideById(id);
    if (!existingSlide) {
      return NextResponse.json({ error: 'Slide not found.' }, { status: 404 });
    }

    if (existingSlide.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this slide.' },
        { status: 403 }
      );
    }

    // 3. Delete files from Supabase Storage
    const slideFileName = getFileNameFromUrl(existingSlide.slideUrl);
    const previewFileName = getFileNameFromUrl(existingSlide.previewUrl);

    // Run deletes asynchronously or in parallel
    const { error: slideDeleteError } = await supabaseAdmin.storage
      .from('slides')
      .remove([slideFileName]);

    if (slideDeleteError) {
      console.warn(`Warning deleting slide file ${slideFileName}:`, slideDeleteError);
    }

    const { error: previewDeleteError } = await supabaseAdmin.storage
      .from('previews')
      .remove([previewFileName]);

    if (previewDeleteError) {
      console.warn(`Warning deleting preview file ${previewFileName}:`, previewDeleteError);
    }

    // 4. Delete DB record
    const deleted = await deleteSlide(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete slide record from database.' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Slide and associated files deleted successfully.',
    });
  } catch (error) {
    const err = error as Error;
    console.error('DELETE slide API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
