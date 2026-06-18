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
