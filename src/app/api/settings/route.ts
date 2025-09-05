
import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/local-data';

export async function GET(request: Request) {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedSettings = await request.json();
    await updateSettings(updatedSettings);
    return NextResponse.json({ message: 'Settings updated' });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
