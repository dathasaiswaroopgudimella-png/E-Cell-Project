import { jwtVerify, createRemoteJWKSet } from 'jose';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// Create a cached JWKS set from Supabase's well-known endpoint
const JWKS = createRemoteJWKSet(
  new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
);

export interface DecodedToken {
  sub: string;
  email?: string;
  [key: string]: unknown;
}

export async function verifyJWT(token: string): Promise<DecodedToken | null> {
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not configured.');
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${supabaseUrl}/auth/v1`,
    });
    return payload as DecodedToken;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}
