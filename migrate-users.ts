import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env' });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function migrateAllUsers() {
    console.log('🚀 Starting improved user migration...\n');

    // 1. Récupérer tous les utilisateurs de la table locale
    const { data: localUsers, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('*');

    if (fetchError) {
        console.error('❌ Error fetching users:', fetchError);
        return;
    }

    console.log(`📊 Found ${localUsers.length} users to process\n`);

    for (const localUser of localUsers) {
        // Nettoyer le username pour l'email (remplacer les espaces par des points)
        const sanitizedUsername = localUser.username.trim().replace(/\s+/g, '.');
        const syntheticEmail = `${sanitizedUsername}@vacationapp.internal`.toLowerCase();

        console.log(`\n👤 Processing user: ${localUser.username} (${syntheticEmail})`);

        const oldUid = localUser.uid;

        try {
            // 2. Créer ou récupérer le compte Auth
            let newUid: string;

            const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: syntheticEmail,
                password: localUser.password,
                email_confirm: true,
                user_metadata: { username: localUser.username },
            });

            if (createError) {
                if (createError.message.includes('already registered')) {
                    console.log(`   ⚠️  Auth account already exists, fetching ID...`);
                    // Récupérer l'ID existant
                    const { data: searchData } = await supabaseAdmin.auth.admin.listUsers();
                    const existingUser = searchData.users.find(u => u.email === syntheticEmail);
                    if (!existingUser) {
                        console.error(`   ❌ Could not find existing user ID`);
                        continue;
                    }
                    newUid = existingUser.id;
                } else {
                    console.error(`   ❌ Error creating auth user:`, createError.message);
                    continue;
                }
            } else {
                newUid = authUser.user.id;
                console.log(`   ✅ Created Supabase Auth user`);
            }

            // 3. Mettre à jour le UID dans la table users
            // Si le CASCADE est activé en SQL, cela mettra à jour TOUTES les tables liées automatiquement !
            const { error: updateUserError } = await supabaseAdmin
                .from('users')
                .update({ uid: newUid })
                .eq('uid', oldUid);

            if (updateUserError) {
                console.error(`   ❌ Error updating users table:`, updateUserError.message);
                console.log(`   💡 Avez-vous bien exécuté le script SQL avec ON UPDATE CASCADE ?`);
            } else {
                console.log(`   ✅ Successfully migrated UID to ${newUid}`);
                console.log(`   🎉 Data in linked tables updated automatically via CASCADE`);
            }

        } catch (error: any) {
            console.error(`   ❌ Unexpected error for ${localUser.username}:`, error.message);
        }
    }

    console.log('\n\n✅ Final migration step completed!');
}

migrateAllUsers().catch(console.error);
