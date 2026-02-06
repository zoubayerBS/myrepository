import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { addUserAdmin, findUserByUsername } from '@/lib/local-data';

export async function POST(request: Request) {
    console.log('[API SIGNUP] Received request');
    try {
        const userData = await request.json();
        const { username, password, email, prenom, nom, fonction } = userData;

        console.log('[API SIGNUP] Data:', { username, email, prenom, nom, fonction });

        if (!username || !password || !email) {
            console.log('[API SIGNUP] Missing fields');
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Check if username is already taken in our DB
        console.log('[API SIGNUP] Checking username availability...');
        const existingUser = await findUserByUsername(username);
        if (existingUser) {
            console.log('[API SIGNUP] Username already taken:', username);
            return NextResponse.json({ error: 'Ce nom d\'utilisateur est déjà pris' }, { status: 400 });
        }

        // 2. Create user in Supabase Auth using Admin Client
        console.log('[API SIGNUP] Creating auth user...');
        const supabaseAdmin = createAdminClient();
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                username,
                prenom,
                nom,
                fonction,
            },
        });

        if (authError) {
            console.error('[API SIGNUP] Supabase Auth Error:', authError.message);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        if (!authData.user) {
            console.error('[API SIGNUP] No user data returned');
            return NextResponse.json({ error: 'Failed to create user session' }, { status: 500 });
        }

        console.log('[API SIGNUP] Auth user created:', authData.user.id);

        // 3. Add user to our custom users table with the same ID as Auth using Admin Client to bypass RLS
        console.log('[API SIGNUP] Adding user to local DB...');
        const newUser = {
            ...userData,
            uid: authData.user.id,
            role: 'user', // Default role
        };

        const addedUser = await addUserAdmin(newUser);
        console.log('[API SIGNUP] Local user created successfully');

        return NextResponse.json(addedUser, { status: 201 });
    } catch (error: any) {
        console.error('[API SIGNUP] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
