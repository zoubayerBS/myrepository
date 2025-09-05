import { supabase } from './supabase';

export function getDb() {
    return supabase;
}
