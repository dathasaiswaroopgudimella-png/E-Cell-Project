import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getSlides, createSlide } from '@/repository/slides';
import { supabaseAdmin } from '@/services/supabase';

// GET /api/slides - Public gallery list
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const sort = searchParams.get('sort') || undefined;

    const result = await getSlides({
      page,
      limit,
      search,
      tag,
      sort,
    });

    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('GET slides API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch slides.' },
      { status: 500 }
    );
  }
}

// POST /api/slides - Protected upload new slide
export async function POST(request: Request) {
  try {
    // 1. Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid Bearer token.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid session or signature.' },
        { status: 401 }
      );
    }

    const userId = decoded.sub;

    // 2. Parse FormData
    const formData = await request.formData();
    const slideFile = formData.get('slideFile');
    const previewImage = formData.get('previewImage');
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const tagsString = formData.get('tags') as string | null;
    const competitionName = formData.get('competitionName') as string | null;
    const yearStr = formData.get('year') as string | null;
    const category = formData.get('category') as string | null;

    // 3. Validation
    if (!slideFile || !previewImage || !title || !description || !competitionName || !yearStr || !category) {
      return NextResponse.json(
        { error: 'Missing required fields. Please fill out all fields and attach files.' },
        { status: 400 }
      );
    }

    if (!(slideFile instanceof File) || !(previewImage instanceof File)) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload valid files.' },
        { status: 400 }
      );
    }

    const year = parseInt(yearStr, 10);
    if (isNaN(year)) {
      return NextResponse.json({ error: 'Year must be a valid number.' }, { status: 400 });
    }

    // File type validation
    if (slideFile.type !== 'application/pdf' && !slideFile.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Case material must be a PDF file.' }, { status: 400 });
    }

    if (!previewImage.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Preview thumbnail must be an image.' }, { status: 400 });
    }

    // 4. File Upload to Supabase Storage
    const slideArrayBuffer = await slideFile.arrayBuffer();
    const slideBuffer = Buffer.from(slideArrayBuffer);
    const slideFileName = `${userId}-${Date.now()}-${slideFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { error: slideUploadError } = await supabaseAdmin.storage
      .from('slides')
      .upload(slideFileName, slideBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });

    if (slideUploadError) {
      console.error('Slide PDF upload error:', slideUploadError);
      return NextResponse.json({ error: `PDF upload failed: ${slideUploadError.message}` }, { status: 500 });
    }

    const previewArrayBuffer = await previewImage.arrayBuffer();
    const previewBuffer = Buffer.from(previewArrayBuffer);
    const previewFileName = `${userId}-${Date.now()}-${previewImage.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { error: previewUploadError } = await supabaseAdmin.storage
      .from('previews')
      .upload(previewFileName, previewBuffer, {
        contentType: previewImage.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (previewUploadError) {
      console.error('Preview image upload error:', previewUploadError);
      // Rollback slide upload
      await supabaseAdmin.storage.from('slides').remove([slideFileName]);
      return NextResponse.json({ error: `Preview image upload failed: ${previewUploadError.message}` }, { status: 500 });
    }

    // Get public URLs
    const slideUrl = supabaseAdmin.storage.from('slides').getPublicUrl(slideFileName).data.publicUrl;
    const previewUrl = supabaseAdmin.storage.from('previews').getPublicUrl(previewFileName).data.publicUrl;

    // Parse tags
    const tags = tagsString
      ? tagsString.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
      : [];

    // 5. Save metadata to DB
    const newSlide = await createSlide({
      title,
      description,
      tags,
      competitionName,
      year,
      category,
      slideUrl,
      previewUrl,
      userId,
    });

    if (!newSlide) {
      // Rollback files on storage
      await supabaseAdmin.storage.from('slides').remove([slideFileName]);
      await supabaseAdmin.storage.from('previews').remove([previewFileName]);
      return NextResponse.json({ error: 'Failed to save slide record to database.' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Slide published successfully.',
      slide: newSlide,
    }, { status: 201 });

  } catch (error) {
    const err = error as Error;
    console.error('POST slides API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
export const dynamic = 'force-dynamic';
