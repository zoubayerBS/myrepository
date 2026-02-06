import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username et mot de passe requis' },
                { status: 400 }
            );
        }

        const supabase = await createClient();
        const supabaseAdmin = createAdminClient();

        // 1. Vérifier l'utilisateur dans la table locale
        const { data: localUser, error: localError } = await supabaseAdmin
            .from('users')
            .select('*')
            .ilike('username', username)
            .single();

        if (localError || !localUser) {
            return NextResponse.json(
                { error: 'Identifiants invalides' },
                { status: 401 }
            );
        }

        // 2. Vérifier le mot de passe
        if (localUser.password !== password) {
            return NextResponse.json(
                { error: 'Identifiants invalides' },
                { status: 401 }
            );
        }

        // 3. Générer email synthétique à partir du vrai username en base (pour correspondre à la migration)
        const sanitizedUsername = localUser.username.trim().replace(/\s+/g, '.');
        const syntheticEmail = `${sanitizedUsername}@vacationapp.internal`.toLowerCase();

        // 4. Tenter connexion Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: syntheticEmail,
            password: password,
        });

        // 5. Si échec, créer le compte Supabase Auth (migration automatique)
        if (authError && authError.message.includes('Invalid login credentials')) {
            console.log(`[LOGIN] Migrating user ${username} to Supabase Auth`);

            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: syntheticEmail,
                password: password,
                email_confirm: true,
                user_metadata: {
                    username: username,
                },
            });

            if (createError) {
                console.error('[LOGIN] Failed to create Supabase Auth user:', createError);
                return NextResponse.json(
                    { error: 'Erreur lors de la migration du compte' },
                    { status: 500 }
                );
            }

            // Mettre à jour le UID dans toutes les tables
            const newUid = newUser.user.id;
            const oldUid = localUser.uid;

            console.log(`[LOGIN] Updating UID from ${oldUid} to ${newUid}`);

            // Mettre à jour users
            const { error: updateUserError } = await supabaseAdmin
                .from('users')
                .update({ uid: newUid })
                .eq('username', username);

            if (updateUserError) {
                console.error('[LOGIN] Failed to update users table:', updateUserError);
            }

            // Mettre à jour vacations
            const { error: updateVacationsError } = await supabaseAdmin
                .from('vacations')
                .update({ userId: newUid })
                .eq('userId', oldUid);

            if (updateVacationsError) {
                console.error('[LOGIN] Failed to update vacations table:', updateVacationsError);
            }

            // Mettre à jour notifications
            const { error: updateNotificationsError } = await supabaseAdmin
                .from('notifications')
                .update({ userId: newUid })
                .eq('userId', oldUid);

            if (updateNotificationsError) {
                console.error('[LOGIN] Failed to update notifications table:', updateNotificationsError);
            }

            // Mettre à jour messages (senderId)
            const { error: updateMessagesSenderError } = await supabaseAdmin
                .from('messages')
                .update({ senderId: newUid })
                .eq('senderId', oldUid);

            if (updateMessagesSenderError) {
                console.error('[LOGIN] Failed to update messages senderId:', updateMessagesSenderError);
            }

            // Mettre à jour messages (receiverId)
            const { error: updateMessagesReceiverError } = await supabaseAdmin
                .from('messages')
                .update({ receiverId: newUid })
                .eq('receiverId', oldUid);

            if (updateMessagesReceiverError) {
                console.error('[LOGIN] Failed to update messages receiverId:', updateMessagesReceiverError);
            }

            console.log(`[LOGIN] Migration completed for user ${username}`);

            // Reconnecter avec le nouveau compte
            const { data: newAuthData, error: newAuthError } = await supabase.auth.signInWithPassword({
                email: syntheticEmail,
                password: password,
            });

            if (newAuthError) {
                console.error('[LOGIN] Failed to sign in after migration:', newAuthError);
                return NextResponse.json(
                    { error: 'Erreur lors de la connexion après migration' },
                    { status: 500 }
                );
            }

            // Récupérer le profil mis à jour
            const { data: updatedUser } = await supabaseAdmin
                .from('users')
                .select('uid, email, username, role, nom, prenom, fonction')
                .eq('uid', newUid)
                .single();

            return NextResponse.json({
                user: updatedUser,
                session: newAuthData.session,
            });
        }

        // 6. Connexion réussie (utilisateur déjà migré)
        if (authData?.session) {
            // Retourner le profil sans le mot de passe
            const { password: _, ...userWithoutPassword } = localUser;

            return NextResponse.json({
                user: userWithoutPassword,
                session: authData.session,
            });
        }

        // 7. Autre erreur
        console.error('[LOGIN] Unexpected auth error:', authError);
        return NextResponse.json(
            { error: 'Erreur de connexion' },
            { status: 500 }
        );

    } catch (error) {
        console.error('[LOGIN] Error:', error);
        return NextResponse.json(
            { error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
