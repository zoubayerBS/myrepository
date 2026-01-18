import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addUser, findUserByUsername } from '@/lib/local-data';

export async function POST(request: Request) {
    try {
        const userData = await request.json();
        const { username, password, email, prenom, nom, fonction } = userData;

        if (!username || !password || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Check if username is already taken in our DB
        const existingUser = await findUserByUsername(username);
        if (existingUser) {
            return NextResponse.json({ error: 'Ce nom d\'utilisateur est déjà pris' }, { status: 400 });
        }

        // 2. Create user in Supabase Auth
        const supabase = await createClient();
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    prenom,
                    nom,
                    fonction,
                },
            },
        });

        if (authError) {
            console.error('Supabase Auth Signup Error:', authError.message);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        if (!authData.user) {
            return NextResponse.json({ error: 'Failed to create user session' }, { status: 500 });
        }

        // 3. Add user to our custom users table with the same ID as Auth
        const newUser = {
            ...userData,
            uid: authData.user.id,
            role: 'user', // Default role
        };

        const addedUser = await addUser(newUser);

        return NextResponse.json(addedUser, { status: 201 });
    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
