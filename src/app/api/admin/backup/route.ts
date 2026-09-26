import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();

        // Verify user authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin status
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('uid', user.id)
            .single();

        if (userError || !userData || userData.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const tables = [
            'users',
            'vacations',
            'surgeons',
            'vacation_amounts_full',
            'notifications',
            'messages',
            'conversations'
        ];

        const backupData: Record<string, any> = {};
        backupData['_metadata'] = {
            generatedAt: new Date().toISOString(),
            version: '1.0'
        };

        // Fetch data for each table sequentially or in parallel
        const fetchPromises = tables.map(async (table) => {
            const { data, error } = await supabase.from(table).select('*');
            if (error) {
                console.error(`Error fetching table ${table}:`, error);
                backupData[table] = { error: error.message };
            } else {
                backupData[table] = data;
            }
        });

        await Promise.all(fetchPromises);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `vacationeasy_backup_${timestamp}.json`;

        return new NextResponse(JSON.stringify(backupData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`
            },
        });
    } catch (error: any) {
        console.error("Backup generation failed:", error);
        return NextResponse.json({ error: 'Failed to generate backup' }, { status: 500 });
    }
}
