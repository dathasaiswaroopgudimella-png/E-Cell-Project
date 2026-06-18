# CaseVault - E-Cell Case Competition Slide Gallery Project Codebase & Knowledge Base

This file contains the complete explanation, database schema, structure, and all code files for the **CaseVault** project. You can paste this entire document into any AI model (e.g., Claude, ChatGPT, Gemini) to train it on the codebase, ask questions, or request modifications.

---

## 1. Project Overview & Architecture

**CaseVault** is a premium, full-stack web application designed for university E-Cell chapters to upload, showcase, filter, search, and manage slide decks from elite global case competitions.

### Tech Stack:
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Styling:** TailwindCSS v4
- **Database & Auth:** Supabase (Auth, PostgreSQL DB, Storage)
- **JWT Verification:** `jose` library (for secure, custom verification of Supabase auth tokens in Next.js middleware or route handlers)

### Architecture Highlights:
- **Server Component Fetching:** The homepage (`/`) runs as a Server Component, calling the `repository` layer directly using the `supabaseAdmin` client. This avoids client-side network roundtrips and handles initial data load instantly.
- **Client Mutations:** Actions like registration, login, slide upload, and slide deletion are client-side operations calling local Next.js API routes (`/api/*`). These API routes act as a secure proxy, verifying the JWT bearer token before interacting with Supabase.
- **Strict Validations:** The codebase features robust input and file validations (e.g., checking `instanceof File` for uploads, sanitizing query inputs to avoid PostgREST crashes, validating integer formats for slide years).
- **Hydration Safety:** Uses client-side hooks initialized safely on mount to prevent SSR/CSR hydration mismatches.

---

## 2. Directory Tree
```
E-Cell project/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   └── register/route.ts
│   │   └── slides/
│   │       ├── [id]/route.ts
│   │       └── route.ts
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── upload/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Footer.tsx
│   ├── Gallery.tsx
│   ├── Hero.tsx
│   ├── Navbar.tsx
│   ├── Skeleton.tsx
│   └── SlideCard.tsx
├── hooks/
│   └── useAuth.tsx
├── lib/
│   └── jwt.ts
├── repository/
│   ├── slides.ts
│   └── users.ts
├── services/
│   └── supabase.ts
├── types/
│   └── index.ts
├── schema.sql
├── package.json
└── README.md
```

---

## 3. Database Schema (`schema.sql`)
```sql
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create slides table
CREATE TABLE IF NOT EXISTS public.slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    "competitionName" TEXT NOT NULL,
    year INTEGER NOT NULL,
    category TEXT NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "slideUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "userId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security (RLS) on slides
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Users policies:
-- Anyone can view user profiles (or we can restrict, but public read is safe)
CREATE POLICY "Allow public read users" ON public.users
    FOR SELECT USING (true);

-- Auth users can insert their own profile
CREATE POLICY "Allow insert own user" ON public.users
    FOR INSERT WITH CHECK (true); -- Insert is handled during register API with service role or authenticated

-- Slides policies:
-- Anyone can read slides (Public view)
CREATE POLICY "Allow public select slides" ON public.slides
    FOR SELECT USING (true);

-- Authenticated users can insert their own slides
CREATE POLICY "Allow authenticated insert slides" ON public.slides
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = "userId");

-- Users can update their own slides
CREATE POLICY "Allow owner update slides" ON public.slides
    FOR UPDATE TO authenticated
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");

-- Users can delete their own slides
CREATE POLICY "Allow owner delete slides" ON public.slides
    FOR DELETE TO authenticated
    USING (auth.uid() = "userId");

```

---

## 4. Complete Source Code Files

### File: `.gitignore`

```markdown
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

```

---

### File: `AGENTS.md`

```markdown
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

```

---

### File: `app/api/auth/login/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message || 'Invalid email or password.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        createdAt: data.user.created_at,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('Login API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

```

---

### File: `app/api/auth/register/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/services/supabase';
import { createUser } from '@/repository/users';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // Sign up user in Supabase Auth (using admin client to bypass email confirmation or sign up directly)
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email so that users can log in immediately!
    });

    if (signUpError || !signUpData.user) {
      // If error is that the user already exists, or other auth errors
      return NextResponse.json(
        { error: signUpError?.message || 'Registration failed.' },
        { status: 400 }
      );
    }

    const userId = signUpData.user.id;

    // Create user record in our public.users table
    const dbUser = await createUser(userId, email);

    if (!dbUser) {
      return NextResponse.json(
        { error: 'Failed to sync user profile in database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Registration successful.',
      user: dbUser,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Registration API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

```

---

### File: `app/api/slides/route.ts`

```typescript
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

```

---

### File: `app/api/slides/[id]/route.ts`

```typescript
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

```

---

### File: `app/favicon.ico`

```markdown
         (  F          (  n  00     (-  �         �  �F  (                                                           $   ]   �   �   ]   $                                       �   �   �   �   �   �   �   �                           8   �   �   �   �   �   �   �   �   �   �   8                  �   �   �   �   �   �   �   �   �   �   �   �              �   �   �   �   �   �   �   �   �   �   �   �   �   �       #   �   �   �OOO�������������������������ggg�   �   �   �   #   Y   �   �   ��������������������������555�   �   �   �   Y   �   �   �   �   �kkk���������������������   �   �   �   �   �   �   �   �   �   �			������������������   �   �   �   �   �   Y   �   �   �   �   �JJJ���������kkk�   �   �   �   �   �   Y   #   �   �   �   �   ����������			�   �   �   �   �   �   #       �   �   �   �   �   �111�DDD�   �   �   �   �   �   �              �   �   �   �   �   �   �   �   �   �   �   �                  8   �   �   �   �   �   �   �   �   �   �   8                           �   �   �   �   �   �   �   �                                       $   ]   �   �   ]   $                                                                                                                                                                                                                                                                                    (       @                                                                               ,   U   �   �   �   �   U   ,                                                                                      *   �   �   �   �   �   �   �   �   �   �   �   �   *                                                                      �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                          Q   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   Q                                               r   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   r                                       r   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   r                               O   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   O                          �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                      �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �               (   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   '           �   �   �   �   �   �   �888���������������������������������������������������������___�   �   �   �   �   �   �   �          �   �   �   �   �   �   ����������������������������������������������������������SSS�   �   �   �   �   �   �   �      +   �   �   �   �   �   �   �   �hhh�����������������������������������������������������   �   �   �   �   �   �   �   �   +   T   �   �   �   �   �   �   �   ��������������������������������������������������,,,�   �   �   �   �   �   �   �   �   T   �   �   �   �   �   �   �   �   �   �GGG���������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �+++���������������������������������jjj�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ����������������������������������   �   �   �   �   �   �   �   �   �   �   �   T   �   �   �   �   �   �   �   �   �   �   ��������������������������III�   �   �   �   �   �   �   �   �   �   �   �   T   +   �   �   �   �   �   �   �   �   �   �   �   �hhh����������������������   �   �   �   �   �   �   �   �   �   �   �   +      �   �   �   �   �   �   �   �   �   �   �   ������������������,,,�   �   �   �   �   �   �   �   �   �   �   �   �          �   �   �   �   �   �   �   �   �   �   �   �   �GGG�������������   �   �   �   �   �   �   �   �   �   �   �   �   �           '   �   �   �   �   �   �   �   �   �   �   �   �   ����������   �   �   �   �   �   �   �   �   �   �   �   �   (               �   �   �   �   �   �   �   �   �   �   �   �   �333�___�   �   �   �   �   �   �   �   �   �   �   �   �   �                      �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                          O   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   O                               r   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   r                                       r   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   r                                               Q   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   Q                                                          �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                                      *   �   �   �   �   �   �   �   �   �   �   �   �   *                                                                                      ,   U   �   �   �   �   U   ,                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               (   0   `           -                                                                                             	   (   L   j   �   �   �   �   j   K   (   	                                                                                                                                          V   �   �   �   �   �   �   �   �   �   �   �   �   �   �   U                                                                                                                      %   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   &                                                                                                      �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                                                          Q   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   R                                                                              �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                                     �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                             �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                     �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                              �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                       P   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   O                                  �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                              �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                       #   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   #                   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                  �   �   �   �   �   �   �   �   �   �$$$�hhh�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�eee�PPP��   �   �   �   �   �   �   �   �   �              U   �   �   �   �   �   �   �   �   �   ������������������������������������������������������������������������������������������sss�   �   �   �   �   �   �   �   �   �   �   U           �   �   �   �   �   �   �   �   �   �   �   �eee��������������������������������������������������������������������������������������   �   �   �   �   �   �   �   �   �   �   �       	   �   �   �   �   �   �   �   �   �   �   �   ����������������������������������������������������������������������������������HHH�   �   �   �   �   �   �   �   �   �   �   �   �   	   (   �   �   �   �   �   �   �   �   �   �   �   �   �EEE�����������������������������������������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   (   K   �   �   �   �   �   �   �   �   �   �   �   �   �   �������������������������������������������������������������������������,,,�   �   �   �   �   �   �   �   �   �   �   �   �   �   L   j   �   �   �   �   �   �   �   �   �   �   �   �   �   �)))���������������������������������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   j   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ������������������������������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ����������������������������������������������������������iii�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �eee������������������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ��������������������������������������������������HHH�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   j   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �EEE���������������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   j   L   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �����������������������������������������,,,�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   K   (   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �)))�������������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   (   	   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ����������������������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   	       �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ��������������������������iii�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �           U   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �eee����������������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   U              �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ������������������HHH�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                  �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �EEE�������������   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                   #   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   ���������,,,�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   #                       �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �222�}}}�   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                              �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                  O   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   P                                       �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                              �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                     �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                             �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                                     �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                                              R   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   Q                                                                                          �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �                                                                                                      &   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   �   %                                                                                                                      U   �   �   �   �   �   �   �   �   �   �   �   �   �   �   V                                                                                                                                          	   (   K   j   �   �   �   �   j   L   (   	                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        �PNG

   IHDR         \r�f   sRGB ���   8eXIfMM *    �i            �       �           D"8s  IDATx�]	�ՙn�]<QVA���h$	�N��13*�q��d�č�I���D�L2��(�(Ԙ2�ę�G	��q_@屈���xț�Џ��{o�������U�{}�O��;������9�d���(Dg��8	��N �]��@�hx�?v �N�3�=`;�6�.�&��u��  ��6�P��н��@�àR� P�iZq�^DN���wp����X�hИHg@��
:��|�5` p"@�'�ɲ�s{�p�*�2����� d ү���|(0�
0 ��>K�
�xX�6 IJ� �C|?$KEN�}ϓ|������h $	2 ��|/� . Nz �#���W�e�
�5������ܶ���;�y �� �g�s�h^  I�� DL(�;�8��Hjg�cH|x�1��R"�a���Ӂ� G��@��9`/`%0�H�@j�~,���K
�,t).��I���D�T�O�)~��V�u$b 誛�U%�7������ _�$b 8A������J�3` 510wQ�?��vr���:�2�K�@ ��v*{%#��A�Z�咁^(��=�g \��W�����!:��,`�6��643�:@�c.Fٟ����u?�<��'������_܏vp: �8Q��
I�Ł�p{3���kHȢ�G�����c�Ѽ<�62&�
��2uC�����敭��T�3�
�����;���d�/~m��.��X�@{�w.��d]G�� {lK��Eb���(P�RuM�T�C�����d��])��_Lm�=��=@b���K��GUk�^�U�������)1����g�T���m`9�\����Q��@����Ⱆ6�:ڞ�^�w�����E�D�� �	�5����F�,��
�X"�d�m�<�nB~��@����t�t�x���;�f�>����I8����8��C1۪$B���e���+��jl��EZ��& ��S:�:�6�m����\G1��`���!�nl�l�Ɗ�^�Q`��@Oc�S��@e�ͷ���qb�p���S��@up���F�D@�Г������2@#����L3 �A��$H2� _h��FH#rq(��O�D�򤬈���runGOWa�b� &�SgD�3�ED�to�*Ǥ����9k��~)���,$� x�R�1�v�K ��9�D䍁U(�w�&LE��ꩻ�S)��3�Y8x8 $.i�(��K�ŀY����a�]����4��ǀ	c����@3�f����4� Ƣ���/*b��� ���$!I�~��7�B*-1`	o � �	�$��ǡD�����L������ �J"���OQ��)��2@#�x4�"$e ���I�8��Oi��8�"� �G��8[x�t<�.��7&�m&؎R�^��tq� ؕ�.���Y�-2� �d� ��*_��&d|j\�W�b ��G����*g�� ��釁�F4�"I�؃�/ b1q�N����Y�D��p���9���p�}w\� �Ԥ���1 j`��O���xK=��H�� �A��1�#�
D:U8j���t���$b b�A||�U�Q��26%��)1 ��_�ꢳ!~D��� ��+b >A��:]�E$��50��GDhR�t����ݻwR�)��P� ��n$� 3���@bS�Nu�,Y�j�ʲ��:����;�����@�`�|�-[)�'OV��Ն�sFxڮ��ۥ�n}͛7�����~��ƺ�:���Q��J_��UKj8�q0x���;v4 ̞=[�hW=�	��	�&�!e5�8hѢE��w�]�����6���_�iW}�SZ�?	�/`�;vl�}��2 <�h�" ����A�܁�X,�m۶�+V�(��<�w���#F�^���;���aH�c ���)S�*�{a���p��c89(�^����4�&E��oÆ��W�/��u�=�^���*?{k^�_E�����z���g�� UI-���{WU*
�:p�9.tڷo(/ݺus>��3�'�^�Rg���ڞG��I_D�������~~� ��{���?N0�7�S��.ƍ׸�~?}/y]nA;�أ���2 ]�FOB2C?�_I����[�:�:�=#�OzK�-� ��ϣ�%����?j��I���P�ۯ��{N�-hU��t�:������� ,���G�K�-hU���c�hP7 ����@�n?�\�-�k�.���2�:�� �`��F��=�-�V�_�G��܂V� ��}�0 WI����F��ʭ���sM�rZ�8pJ�Q�*@OK8���
rZ��ݖa, ��w� �S�W^y����.��5�at7��ݏ���Tv#�~7n��A"�����+��W��pM��/�hK8����g��F/^������M{e ��R�|�)q��7�t��?8'���K��P~���瞰�\��r��>�ǷUk �eP��|�^x����
�/V/��v���������*�p�v�� ����ʟ]J��}��k8(������ĉ�ѣGǗ�O�mڴq,X�o���e.�^ �Qx���p�t����4^_�N�{�����y�2 �s����� �-عsg�s���i�v��Z8
!~PJ?�c�������|�] �ܽ{��z�긓R��1pn���z�����tlp�9�f�r�v�jT殿�z�4*O�L�~����ԕ3��4�~~�r�;�m�xY�+���������3 r�;�m�x�4���:7]ՁqL�4)U��!r�1��u�6���$��7����8�w��̙3Ǹ|5�>?�\z��O���͆� ��,�E����3�����2���[����2Wu:E�����^p.H1cJ�t�]}��B�u��SOu�����Ic�O�����%�  �AZ������k����D?�5 �@Q�����3�w�+��"��T��S��Uޥ�13��?��5 M'݋��>p��Z�j�~fj�׈�סԐ�n�����>� ��i5D�[bf ��~a�'�`Xc��� -�1�k����āI�������k��Q�ů|�k�M��(92�@�t�����݂X-�Lדa��N4��qܞ'$f0@�@V�nA�ܘY�L9:�|/^s� ��	��)0`�j��T\w�uZ-����¨\�	@�:��c�t���{�-��Rb��1%� �I,Y%T���~��r�1����C��,�$��*ˀ���f<��0z����h�F���� ����|���8Z-�CR����Tg� �HRf��glY����s��-��p��'+����m�_ؒg������C�{ �	����Ȫ�ϏΙ3g�-�GR|׹7`G��񥡘�0�U��_ٵZЏ�د�D�)���\>����ʗ������z N���@��~~��-��P��{rs���@�<����|.]�Ը|��m|g����_��y�W�KD1�b�M���%�s\����r�1��n�\�ƒ�"-� �`.4��~%3��I}[0A��$��= -�>BH"G�ۏ�^r��<�EBG�i �%���9�@^�~~@�����1����@� t�-[����{%@C�$�mAg���Κ5kʆх����/双O��l��ӿ��B�@.X���u�p�O��6��x�9MPn�`߷o_���^n�`t�
��(�����\r��s�A�y���ۂ�T��@h
�E0l�0��;�tڵӘkƸN����Y�jU��
S#�|^㽺- |��p�N�.���ޥ`�^{�zL�6��4 �ě�b��e�]&"�d�sΜ9Uޥ�U0�!��*nP�*`���o֨v����i8G�����hh��m������ɓ�s�=�{J�U0�Ղ���wZ������������8bEz���,Y�D��![C�>}��7:k׮�no��f� >jvR?#b��X�(��F�AT�F��i��[�{��zv��>��C���a+�[0B2�D��=��G~�(
�ĺ������LO�\s�܂>"8|�`[)
&Lp8�'��������4 oGe�#�ۏ�lْ_\�D̀܂�2Z�l��i�9��t�ȑ9f ޢ�-����=���Y�y��n?uQ�}Xͬ�sA�i >=��1�=R��+� +�܂��.2 ��K������CƢۃ20h� �˫%53�5@�MA�%���̣������j[��9�;�� _(�����0��~r���\�{�m�P����x#TT9��n?����N#��ץ&�}� ��)
�T�VL�!���j���`�p �8@Rr�UAV�A����=��-����pLH�`@n�*Ȋ1�܂U���?}w ]�H2@�ߴi��V���[�˯%�������5 �8�)Э
T`��|rZbZ-�.�!da+@� ���ߞ�Z�gf�[0p���� �� I��gr�$��o%P�_rCy�V�|߽����"m�Y���-�[ l��k xA� ��ۯ9]�[pҤI�Ȩ�pP���k ��Feِ���gHE�d�nAm"Z�$��5}���z�8����2r�X�|� ��Sܻw��r�J�s�J�~�T�f�z{ �ͫ ��x�j?j��Q�E�n� �js���|G�xз�<dXt(��Q�E�.�p�47 ��)���;��ys�_�V�D���-XTi����?� �~�薜����� �`Q�=V�?���^�
������.]�|X�
�m�B~��?���J� �D�������~�h r�����ER���A݀�B���~w�q�Ӿ}���<�ŕ[й5�d��-�`�5 ?�Kq�~l4��0@��)����/I��(����؋���n��9���Y�4�!�Cو2ח*w9���GKݐ�s�&�r�e��s��?�6�8J� |(�uwO䴁d�&K)�nA��?R���n@7,��8�=���r�e����n�M�69k��M7�����J��R�]�e�n��9���Z���� /?នo>��󕾤�rzr�� ��`���V{���u��4448�V��ra��p� ��QRZ�<{�dK.F9��#~T���s.����N%*� ���Ýu�8G&����/W:*x%�{�}@� ��l���Nc#�AI�������i����*?�د�0}�g���C"Āpۯ������4薒ҏ(b�8�_Q�Y� ���r7'���`��� �j �6�� *��3�W�g��"��l��1�:�Sg}%� �	��P?����1`�����Y� ��"��D�0b@�� �����9������[t��F1���p`k�\U�`��R��A#W81 e`)R�ZM��� ��[u��F0�	rq.����� #^�=C"Ā9P'�R~f�� �
pn�zdC"�e���?�\K����@&$b }jz�3۵� x/{��1 Ra�#�|��ƟUK�= &�^��TM�n�2�9�5)?s���{O'�D��D���o [kM�oK0�x�� �Td�_@]b r� �G�����; ����D��D���1�gaR�`��'`0�  �>\��/���f��������ŀ����!fn�Z�|b����U�.t���ट���r�9�+��������	�b rnE�Dk�= ��8�����!b R�Cl�P�E�`�܌�K�'~�@���}*�!`�@��6 L��;��	$b@D��?#��g�F�
��V��1�v��;�Es��Q����=ɮ�4���b@T��n��!��3q�0^�V�� c ��1�ܶ��[����M�=8I����1@�څ@Cu��`N�o�� WJĀ� W����e��I�� n��N�mீ��ܴ�_d��(�4`E܅I� ���"̵�1 *3�+\�E� �\M���)g	r���
���8�>��p�?vI� �0�ǀ~�!b������$'�%"I����R��i�1 �0��? S~&�� �r�����{ n�_�����L�?��T�e��Ǝ�7�C"r��OQ~"qI� ��O 8�?$b �܋r�#@�_�v�J̙��/��3�'d�/����W[����o'N��l��-2� ���@j�O~��0���2` H�@�؄��+����pOB� �uO��(l�S�ԕ���9����~�c�:x/�Xd�.���Ɣ�d ��V�y@F $H2� ����+M*�i��l8O@F $H2� ���2�4& r�PO��֢����7N�YS ����Y�1`��;�JS3n� g[�'��@W@"la`32�n?'�HB2p
�hām�mu �����j@F@��V����Z!��xI���H�y�ѱ)��>��Z!6 ���a�`�����dDV$9f���	pM�6�I�!LG:\LdrwPy�~�P�%��L3��7�TK��Am�mo|�6��	3��-�h J3��?�67 �yr���"����g��4. $�1���_�[*��&���S/�dq�������C��h �3��>�6Ŷ%������\�#�RZq��=lK|ŔX��X�WS�e j5 /����$���:��v@������8���d��1(�z2~F�)���3��͋���l��C�������#����=�.\Lt? %� N$9b�%�:���2��u	 �1|-�	ld�����t $b��@?���@� �F�c��ρ^�D�d�[9�ࠐz�����:
H�@ ��P2v )~���@����z5��|����R�ֵ���|`#�W39؂��<�"-�0��\<�d��u�oGLz 1��Gp����e�倯d� .�jH�@j�F�3��@ c{s<��J&	�@�����b���w��  �� ��n���v��< �����,M;��*p>p!0hH��{=�����x�]I�� DLh����<'��h8�@V �#��J���f� I�� �Hn����W�}�N�t[u�$�������� �@� 2 	�]&)�� #�3���,	=%�T���k�&�  I�����I��ӳ� �[8	�	�L�]�]t�T�g���6�-@b2 U�OV��: A?��} .i�|	�xC���rv�w; ��#�>�i 8_b82 �WP����� �� {'n���8�z;�Ƥy��s� ��@���P��o|�S�ih $3��@߹j��    IEND�B`�
```

---

### File: `app/globals.css`

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

```

---

### File: `app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'CaseVault | Case Competition Slide Showcase',
  description: 'Curated excellence from top-tier global case competitions. Explore elite solutions across business strategy, finance, marketing, and social impact.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <AuthProvider>
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}


```

---

### File: `app/login/page.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      login(data.token, data.user);
      router.push('/');
      router.refresh();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Something went wrong. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-slate-50">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to upload and manage your competition slides
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 border-l-4 border-red-500">
            <div className="flex">
              <div className="text-sm font-medium text-red-800">{error}</div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm"
                  placeholder="name@university.edu"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm"
                  placeholder="••••••••"
                  suppressHydrationWarning
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-500">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

```

---

### File: `app/page.tsx`

```typescript
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

```

---

### File: `app/register/page.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Something went wrong during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-slate-50">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
            Create an account
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign up to publish showcase slides for case competitions
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 border-l-4 border-red-500">
            <div className="flex">
              <div className="text-sm font-medium text-red-800">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-4 border-l-4 border-green-500">
            <div className="flex">
              <div className="text-sm font-medium text-green-800">{success}</div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm"
                  placeholder="name@university.edu"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm"
                  placeholder="••••••••"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm"
                  placeholder="••••••••"
                  suppressHydrationWarning
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

```

---

### File: `app/upload/page.tsx`

```typescript
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

```

---

### File: `CLAUDE.md`

```markdown
@AGENTS.md

```

---

### File: `components/Footer.tsx`

```typescript
import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-950 text-slate-400 py-10 mt-auto border-t border-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-bold text-white tracking-tight">
              CaseVault
            </Link>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-medium">
            <Link href="/" className="hover:text-white transition-colors">
              The Gallery
            </Link>
            <span className="cursor-not-allowed hover:text-slate-400">
              Methodology
            </span>
            <span className="cursor-not-allowed hover:text-slate-400">
              Privacy Policy
            </span>
            <span className="cursor-not-allowed hover:text-slate-400">
              Contact Support
            </span>
          </nav>

          {/* Copyright */}
          <div className="text-xs">
            &copy; {new Date().getFullYear()} CaseVault Executive. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

```

---

### File: `components/Gallery.tsx`

```typescript
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

```

---

### File: `components/Hero.tsx`

```typescript
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

```

---

### File: `components/Navbar.tsx`

```typescript
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

```

---

### File: `components/Skeleton.tsx`

```typescript
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

```

---

### File: `components/SlideCard.tsx`

```typescript
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

```

---

### File: `eslint.config.mjs`

```markdown
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

```

---

### File: `hooks/useAuth.tsx`

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('casevault_token');
    const savedUser = localStorage.getItem('casevault_user');
    
    const timer = setTimeout(() => {
      if (savedToken) {
        setToken(savedToken);
      }
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem('casevault_user');
        }
      }
      setLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('casevault_token', newToken);
    localStorage.setItem('casevault_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('casevault_token');
    localStorage.removeItem('casevault_user');
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

```

---

### File: `lib/jwt.ts`

```typescript
import { jwtVerify } from 'jose';

const jwtSecret = process.env.SUPABASE_JWT_SECRET || '';

export interface DecodedToken {
  sub: string;
  email?: string;
  [key: string]: unknown;
}

export async function verifyJWT(token: string): Promise<DecodedToken | null> {
  if (!jwtSecret) {
    console.error('SUPABASE_JWT_SECRET is not configured.');
    return null;
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    return payload as DecodedToken;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

```

---

### File: `next-env.d.ts`

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.

```

---

### File: `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

```

---

### File: `package.json`

```json
{
  "name": "e-cell-project",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.108.2",
    "jose": "^6.2.3",
    "lucide-react": "^1.18.0",
    "next": "16.2.9",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.9",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}

```

---

### File: `postcss.config.mjs`

```markdown
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;

```

---

### File: `README.md`

```markdown
# 🏆 CaseVault — E-Cell Case Competition Slide Showcase

CaseVault is a premium, state-of-the-art full-stack web application designed for university E-Cell chapters to organize, showcase, filter, search, and manage slide decks from elite global case competitions.

Designed with modern design aesthetics, CaseVault features a fully responsive masonry/grid gallery, high-speed server-rendered initial page loading, secure JWT-based stateless authentication, and strict PostgreSQL Row Level Security (RLS).

---

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2.9-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2.4-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Supabase-Database%20%26%20Storage-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/JWT%20Jose-Secure-blue?style=for-the-badge" alt="Jose JWT" />
</p>

---

## 📖 Table of Contents

- [🚀 Key Features](#-key-features)
- [🏗️ Architectural Architecture](#%EF%B8%8F-architectural-architecture)
- [💻 Tech Stack](#-tech-stack)
- [🛠️ Getting Started & Installation](#%EF%B8%8F-getting-started--installation)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup (`schema.sql`)](#database-setup-schemasql)
  - [Local Setup](#local-setup)
- [⚡ API Reference](#-api-reference)
  - [Authentication Routes](#authentication-routes)
  - [Slides CRUD Routes](#slides-crud-routes)
- [📂 Project Directory Structure](#-project-directory-structure)
- [🛡️ Security & Row Level Security (RLS)](#%EF%B8%8F-security--row-level-security-rls)
- [🌐 Deployment Guide (Vercel)](#-deployment-guide-vercel)
- [💡 Technical Design & Interview Reference](#-technical-design--interview-reference)
- [📜 License](#-license)

---

## 🚀 Key Features

* **🔐 Custom JWT Auth System**: Secure user authentication built directly on top of Supabase Auth, returning a JWT token verified statelessly on the backend.
* **📤 Seamless Slide Upload**: A drag-and-drop file interface for PDFs, combined with a separate upload for custom preview/thumbnail images.
* **🔍 Real-time Search**: Multi-field server-side search querying `title`, `description`, and `competitionName` instantly.
* **🏷️ Smart Category & Tag Filters**: Quick-filtering buttons for categories (Strategy, Finance, Marketing, Social Impact) and custom tag tokens.
* **↕️ Multidimensional Sorting**: Sort decks by *Latest Submissions*, *Oldest*, or alphabetically (*Title A-Z*, *Title Z-A*).
* **📄 State-Synced Pagination**: Full server-side pagination integrated directly into the browser URL query state.
* **⚙️ Safe Client Hydration**: Tailored state loading that guarantees **0 hydration mismatches** from third-party browser autofills or password managers.
* **🧹 Storage Rollback & Safety**: Auto-cleans orphaned PDF or thumbnail assets from Supabase Storage if the database record insertion fails.

---

## 🏗️ Architectural Architecture

CaseVault utilizes a decoupled **Repository Pattern** to split the API routing layer from the database operations.

```
┌──────────────────────────────────────────────────┐
│                   Client (Browser)               │
│  ┌──────────────────────────────────────────────┐│
│  │  React Components (Gallery, Upload, Auth)    ││
│  │  useAuth hook → JWT stored in localStorage   ││
│  └──────────────────────────────────────────────┘│
└─────────────────────┬────────────────────────────┘
                      │ HTTP (REST)
┌─────────────────────▼────────────────────────────┐
│            Next.js App Router (Server)           │
│  ┌────────────────────────────────────────────┐  │
│  │  /app/api/auth/login      POST             │  │
│  │  /app/api/auth/register   POST             │  │
│  │  /app/api/slides          GET  | POST      │  │
│  │  /app/api/slides/[id]     GET | PUT | DEL  │  │
│  └────────────────────┬───────────────────────┘  │
│                       │                          │
│  ┌────────────────────▼───────────────────────┐  │
│  │  Repository Layer (repository/slides.ts)   │  │
│  │  Repository Layer (repository/users.ts)    │  │
│  └────────────────────┬───────────────────────┘  │
└───────────────────────┼──────────────────────────┘
                        │ Supabase Client (Admin)
┌───────────────────────▼──────────────────────────┐
│                 Supabase Backend                 │
│  ┌─────────────┐  ┌───────────┐  ┌───────────┐  │
│  │  PostgreSQL  │  │  Storage  │  │   Auth    │  │
│  │  (users,     │  │  (slides, │  │  (JWT,    │  │
│  │   slides)    │  │  previews)│  │  sessions)│  │
│  │  + RLS       │  │           │  │           │  │
│  └─────────────┘  └───────────┘  └───────────┘  │
└──────────────────────────────────────────────────┘
```

1. **High-Performance SSR**: The gallery homepage utilizes Next.js Server Components, rendering the database query directly on the server to prevent loading spinners.
2. **Stateless Middleware Verification**: Protected REST API routes verify the JWT token statelessly using the `jose` library, eliminating database lookup latency on route guards.
3. **Transactional Safety**: Uploads use an upload-and-rollback strategy to ensure no orphaned files occupy Supabase Storage.

---

## 💻 Tech Stack

| Component | Technology | Description |
| --- | --- | --- |
| **Framework** | Next.js 16.2.9 | App Router (using Turbopack in development) |
| **Language** | TypeScript 5.x | Strictly-typed codebase |
| **Styling** | TailwindCSS v4 | Modern, utility-first CSS engine |
| **Auth Engine** | Supabase Auth | Account management |
| **Database** | PostgreSQL | Supabase-hosted relational database |
| **Storage** | Supabase Storage | Multi-bucket binary assets (PDFs & Thumbnails) |
| **JWT Utility** | `jose` | Low-overhead stateless JWT verification |

---

## 🛠️ Getting Started & Installation

### Prerequisites
* **Node.js** ≥ 18.0.0
* **npm** or **Yarn**
* A **Supabase** Project (Create one on [supabase.com](https://supabase.com))

### Environment Configuration
Copy `.env.local.example` to `.env.local` in your root directory:
```bash
cp .env.local.example .env.local
```
Fill in the credentials from your Supabase Dashboard (**Settings** -> **API**):
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (Your Anon Public Key)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (Your Server-Side Service Role Key)
SUPABASE_JWT_SECRET=<your-jwt-secret>
```

### Database Setup (`schema.sql`)
1. Go to your **Supabase Dashboard** -> **SQL Editor** -> **New Query**.
2. Copy the entire contents of [`schema.sql`](schema.sql) and paste it into the editor.
3. Run the query to create tables, foreign keys, and RLS policies.
4. Go to **Storage** -> **New Bucket**:
   * Create a public bucket called `slides`
   * Create a public bucket called `previews`

### Local Setup
```bash
# Install dependencies
npm install

# Run the Turbopack development server
npm run dev

# Run TypeScript compilation and production build
npm run build

# Start production server
npm run start
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## ⚡ API Reference

### Authentication Routes

#### `POST /api/auth/register` (Public)
Creates a new authenticated user and synchronizes their record to the database profile table.
* **Payload**:
  ```json
  {
    "email": "user@university.edu",
    "password": "strongpassword123"
  }
  ```
* **Success (200 OK)**:
  ```json
  {
    "message": "Registration successful.",
    "user": { "id": "uuid", "email": "user@university.edu", "createdAt": "..." }
  }
  ```

#### `POST /api/auth/login` (Public)
Authenticates credentials and returns a secure JWT bearer token.
* **Payload**:
  ```json
  {
    "email": "user@university.edu",
    "password": "strongpassword123"
  }
  ```
* **Success (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": { "id": "uuid", "email": "user@university.edu", "createdAt": "..." }
  }
  ```

---

### Slides CRUD Routes

#### `GET /api/slides` (Public)
Fetches a paginated, sorted, filtered list of competition slide decks.
* **Query Params**:
  * `page` (number, default: `1`)
  * `limit` (number, default: `10`)
  * `search` (string, optional)
  * `tag` (string, optional)
  * `sort` (string: `latest` | `oldest` | `title_asc` | `title_desc`)
* **Success (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "title": "Project Olympus",
        "description": "Global expansion...",
        "tags": ["strategy", "consulting"],
        "competitionName": "Wharton Case 2024",
        "year": 2024,
        "category": "Strategy",
        "previewUrl": "https://...",
        "slideUrl": "https://...",
        "userId": "uuid"
      }
    ],
    "page": 1,
    "limit": 10,
    "total": 1
  }
  ```

#### `POST /api/slides` (Protected)
Uploads and registers a new slide presentation.
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Body** (`multipart/form-data`):
  * `slideFile`: PDF File (binary, max 20MB)
  * `previewImage`: Image File (binary, max 5MB)
  * `title`: string
  * `description`: string
  * `competitionName`: string
  * `year`: string (number string, e.g. "2024")
  * `category`: string
  * `tags`: string (comma-separated, optional)
* **Success (201 Created)**:
  ```json
  {
    "message": "Slide published successfully.",
    "slide": { "id": "uuid", "title": "Project Olympus", ... }
  }
  ```

#### `GET /api/slides/:id` (Public)
Gets full details of a specific slide deck by its UUID.

#### `PUT /api/slides/:id` (Protected, Owner Only)
Updates the metadata of a slide deck. Must be requested by the deck's creator.
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Body** (JSON): Any subset of `{ title, description, tags, competitionName, year, category }`.

#### `DELETE /api/slides/:id` (Protected, Owner Only)
Deletes a slide deck from the database and permanently removes its associated files from Supabase Storage buckets.
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`

---

## 📂 Project Directory Structure

```
E-Cell project/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts       # Authentication API
│   │   │   └── register/route.ts    # Registration API
│   │   └── slides/
│   │       ├── [id]/route.ts        # GET, PUT, DELETE slides
│   │       └── route.ts             # GET list + POST creation
│   ├── login/page.tsx               # Sign In screen
│   ├── register/page.tsx            # Sign Up screen
│   ├── upload/page.tsx              # Interactive Upload screen
│   ├── globals.css                  # Tailwind styles
│   ├── layout.tsx                   # Master App Shell (Providers, Header, Footer)
│   └── page.tsx                     # Server-rendered Gallery
├── components/
│   ├── Footer.tsx                   # Page footer component
│   ├── Gallery.tsx                  # Search, filter, page control component
│   ├── Hero.tsx                     # Landing presentation header
│   ├── Navbar.tsx                   # Interactive navigation bar with auth triggers
│   ├── Skeleton.tsx                 # Shimmer placeholder state
│   └── SlideCard.tsx                # Card representation with interactive triggers
├── hooks/
│   └── useAuth.tsx                  # React Auth context manager
├── lib/
│   └── jwt.ts                       # Stateless JWKS decryption using jose
├── repository/
│   ├── slides.ts                    # PostgreSQL transaction layer for slides
│   └── users.ts                     # Database users sync layer
├── services/
│   └── supabase.ts                  # Supabase client configurations
├── types/
│   └── index.ts                     # Domain interfaces & shapes
├── schema.sql                       # Database structure definition
├── PROJECT_SUMMARY.md               # Unified codebase summary
└── README.md                        # Project documentation (this file)
```

---

## 🛡️ Security & Row Level Security (RLS)

All database operations enforce security rules both at the API routing proxy level and natively within PostgreSQL:

* **API Level**: Mutating endpoints (`POST`, `PUT`, `DELETE`) require a JWT header, decoding the client token against Supabase JWT Secret.
* **Database Level**: Every table has RLS enabled:
  ```sql
  -- Slides table policies
  ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
  
  -- Public select is permitted
  CREATE POLICY "Allow public select slides" ON public.slides FOR SELECT USING (true);
  
  -- Creation requires authenticated session match
  CREATE POLICY "Allow authenticated insert slides" ON public.slides FOR INSERT TO authenticated WITH CHECK (auth.uid() = "userId");
  
  -- Modification requires ownership
  CREATE POLICY "Allow owner update slides" ON public.slides FOR UPDATE TO authenticated USING (auth.uid() = "userId") WITH CHECK (auth.uid() = "userId");
  ```

---

## 🌐 Deployment Guide (Vercel)

CaseVault is pre-configured for instant deployment on Vercel:

1. Push your repository to GitHub.
2. Link your repository in **Vercel** -> **Add New Project**.
3. Vercel automatically detects the Next.js workspace.
4. Input your four environment variables from `.env.local` under **Environment Variables**.
5. Click **Deploy**.

---

## 💡 Technical Design & Interview Reference

### 1. Why use the Repository Pattern?
Decoupling the API routes from Supabase SDK functions ensures that database structure changes or alternate query builders (like Prisma or Drizzle) can be easily swapped in the repository files without modifying the API layer.

### 2. How are Hydration Mismatches handled?
Autofills injection from password managers modify forms before React mounts. CaseVault addresses this by utilizing React mount effects to delay state loading and sets `suppressHydrationWarning` on all susceptible form controls.

### 3. How does Search scaling work?
PostgreSQL filters are performed server-side using case-insensitive `ilike` operations and array queries to maintain low load times.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

```

---

### File: `repository/slides.ts`

```typescript
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

```

---

### File: `repository/users.ts`

```typescript
import { supabaseAdmin } from '@/services/supabase';
import { User } from '@/types';

export async function createUser(id: string, email: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([{ id, email }])
    .select()
    .single();

  if (error) {
    console.error('Error in createUser repository:', error);
    return null;
  }
  return {
    id: data.id,
    email: data.email,
    createdAt: data.createdAt,
  };
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error in getUserById repository:', error);
    return null;
  }
  return {
    id: data.id,
    email: data.email,
    createdAt: data.createdAt,
  };
}

```

---

### File: `schema.sql`

```markdown
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create slides table
CREATE TABLE IF NOT EXISTS public.slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    "competitionName" TEXT NOT NULL,
    year INTEGER NOT NULL,
    category TEXT NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "slideUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "userId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security (RLS) on slides
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Users policies:
-- Anyone can view user profiles (or we can restrict, but public read is safe)
CREATE POLICY "Allow public read users" ON public.users
    FOR SELECT USING (true);

-- Auth users can insert their own profile
CREATE POLICY "Allow insert own user" ON public.users
    FOR INSERT WITH CHECK (true); -- Insert is handled during register API with service role or authenticated

-- Slides policies:
-- Anyone can read slides (Public view)
CREATE POLICY "Allow public select slides" ON public.slides
    FOR SELECT USING (true);

-- Authenticated users can insert their own slides
CREATE POLICY "Allow authenticated insert slides" ON public.slides
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = "userId");

-- Users can update their own slides
CREATE POLICY "Allow owner update slides" ON public.slides
    FOR UPDATE TO authenticated
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");

-- Users can delete their own slides
CREATE POLICY "Allow owner delete slides" ON public.slides
    FOR DELETE TO authenticated
    USING (auth.uid() = "userId");

```

---

### File: `services/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL environment variable is missing.');
}
if (!supabaseAnonKey) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is missing.');
}

// Client for general public/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for administrative backend operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

```

---

### File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}

```

---

### File: `types/index.ts`

```typescript
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Slide {
  id: string;
  title: string;
  description: string;
  tags: string[];
  competitionName: string;
  year: number;
  category: string;
  previewUrl: string;
  slideUrl: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SlidesResponse {
  data: Slide[];
  page: number;
  limit: number;
  total: number;
}

```

---
