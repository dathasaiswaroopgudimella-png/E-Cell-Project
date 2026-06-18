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
