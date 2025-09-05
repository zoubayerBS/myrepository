import { db, findUserById, findAllUsers, findAllVacations } from './local-data';
import type { AppUser, Vacation } from '@/types';


export async function getUserData(uid: string): Promise<AppUser | null> {
  return findUserById(uid);
}

export async function getAllUsers(): Promise<AppUser[]> {
    return findAllUsers();
}
