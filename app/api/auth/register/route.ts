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
