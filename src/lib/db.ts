import { createClient } from './supabase/server';

export async function getDb() {
    return await createClient();
}
