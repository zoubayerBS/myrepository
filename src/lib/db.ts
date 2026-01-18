import { createAdminClient } from './supabase/admin';

export function getDb() {
    return createAdminClient();
}
