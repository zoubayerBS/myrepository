import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findUserByUsername } from '@/lib/local-data';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const dbUser = await findUserByUsername(username);

        if (!dbUser || dbUser.password !== password) {
            return NextResponse.json({ error: 'Identifiant ou mot de passe incorrect' }, { status: 401 });
        }

        // Success: Remove password and return user data
        const { password: _, ...userWithoutPassword } = dbUser;

        return NextResponse.json(userWithoutPassword);
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
