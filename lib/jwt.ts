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
