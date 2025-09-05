
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { findUserById, findUserByUsername, addUser, getAllUsers } from '@/lib/local-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');
  const username = searchParams.get('username');

  if (uid) {
    const user = await findUserById(uid);
    return NextResponse.json(user);
  } else if (username) {
    const user = await findUserByUsername(username);
    return NextResponse.json(user);
  } else {
    const users = await getAllUsers();
    return NextResponse.json(users);
  }
}

export async function POST(request: Request) {
  try {
    const newUser = await request.json();
    const addedUser = await addUser(newUser);
    return NextResponse.json(addedUser, { status: 201 });
  } catch (error) {
    console.error('Failed to add user:', error);
    return NextResponse.json({ error: 'Failed to add user' }, { status: 500 });
  }
}
