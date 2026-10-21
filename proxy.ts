import { NextResponse } from 'next/server';

// Middleware is a pass-through until Supabase is configured.
// Route protection is handled client-side via useAuth hook.
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
