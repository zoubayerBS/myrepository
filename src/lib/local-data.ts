'use server';

import { getDb } from './db';
import type { AppUser, Vacation, VacationStatus, Surgeon } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt'; // Import bcrypt

// --- User Functions ---

export async function findUserById(uid: string): Promise<AppUser | null> {
    try {
        const db = await getDb();
        if (!db) return null;
        const stmt = db.prepare('SELECT * FROM users WHERE uid = ?');
        const user = stmt.get(uid) as AppUser | undefined;
        return user || null;
    } catch (error) {
        console.error("findUserById failed:", error);
        return null;
    }
}

export async function findUserByUsername(username: string): Promise<AppUser | null> {
    try {
        const db = await getDb();
        if (!db) return null;
        const stmt = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)');
        const user = stmt.get(username) as AppUser | undefined;
        return user || null;
    } catch (error) {
        console.error("findUserByUsername failed:", error);
        return null;
    }
}

export async function addUser(user: AppUser): Promise<AppUser> {
    const db = await getDb();
    if (!db) throw new Error("Database not available on client.");

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(user.password, 10); // 10 is the salt rounds

    const stmt = db.prepare('INSERT INTO users (uid, email, username, password, role) VALUES (?, ?, ?, ?, ?)');
    stmt.run(user.uid, user.email, user.username, hashedPassword, user.role);
    return user;
}

export async function getAllUsers(): Promise<AppUser[]> {
    const db = await getDb(); // AWAIT here
    if (!db) return []; // Handle client-side access
    const stmt = db.prepare('SELECT uid, username, email, role FROM users');
    const users = stmt.all() as AppUser[];
    return users;
}

// --- Vacation Functions ---

async function getVacationWithUser(vacationId: string): Promise<Vacation | null> { // Make this async
    const db = await getDb(); // AWAIT here
    if (!db) return null; // Handle client-side access
    const stmt = db.prepare(`
        SELECT v.*, u.username
        FROM vacations v
        LEFT JOIN users u ON v.userId = u.uid
        WHERE v.id = ?
    `);
    const vacationData = stmt.get(vacationId) as any;
    if (!vacationData) return null;

    return {
        ...vacationData,
        user: { username: vacationData.username }
    } as Vacation;
}

export async function findAllVacations(): Promise<Vacation[]> {
    const db = await getDb(); // AWAIT here
    if (!db) return []; // Handle client-side access
    const stmt = db.prepare(`
        SELECT v.*, u.username 
        FROM vacations v
        LEFT JOIN users u ON v.userId = u.uid
        ORDER BY v.date DESC
    `);
    const vacations = stmt.all().map(v => ({...v, user: { username: (v as any).username } })) as Vacation[];
    return vacations;
}

export async function findVacationsByUserId(userId: string): Promise<Vacation[]> {
    const db = await getDb(); // AWAIT here
    if (!db) return []; // Handle client-side access
    const stmt = db.prepare('SELECT * FROM vacations WHERE userId = ? ORDER BY date DESC');
    const vacations = stmt.all(userId) as Vacation[];
    return vacations;
}

export async function addVacation(vacation: Omit<Vacation, 'id'>): Promise<Vacation> {
    const db = await getDb(); // AWAIT here
    if (!db) throw new Error("Database not available on client."); // Or handle as appropriate
    const newId = `${Date.now()}-${Math.random()}`;
    const newVacation = { ...vacation, id: newId };
    const stmt = db.prepare('INSERT INTO vacations (id, userId, date, time, patientName, matricule, surgeon, operation, reason, type, amount, status) VALUES (@id, @userId, @date, @time, @patientName, @matricule, @surgeon, @operation, @reason, @type, @amount, @status)');
    stmt.run(newVacation);
    const result = await getVacationWithUser(newId); // AWAIT here
    if (!result) throw new Error('Could not retrieve new vacation');
    return result;
}

export async function updateVacation(updatedVacation: Vacation): Promise<Vacation> {
    const db = await getDb(); // AWAIT here
    if (!db) throw new Error("Database not available on client."); // Or handle as appropriate
    const stmt = db.prepare('UPDATE vacations SET date = @date, time = @time, patientName = @patientName, matricule = @matricule, surgeon = @surgeon, operation = @operation, reason = @reason, type = @type, amount = @amount, status = @status WHERE id = @id');
    const result = stmt.run(updatedVacation);
    if (result.changes === 0) throw new Error('Vacation not found');
    const updated = await getVacationWithUser(updatedVacation.id); // AWAIT here
    if(!updated) throw new Error('Could not retrieve updated vacation');
    return updated;
}

export async function deleteVacation(vacationId: string): Promise<void> {
    const db = await getDb(); // AWAIT here
    if (!db) throw new Error("Database not available on client."); // Or handle as appropriate
    const stmt = db.prepare('DELETE FROM vacations WHERE id = ?');
    const result = stmt.run(vacationId);
    if (result.changes === 0) throw new Error('Vacation not found');
}

export async function updateVacationStatus(vacationId: string, status: VacationStatus): Promise<Vacation> {
    const db = await getDb(); // AWAIT here
    if (!db) throw new Error("Database not available."); // Or handle as appropriate

    // First, get the vacation details to know the userId
    const vacationStmt = db.prepare('SELECT userId, patientName, status FROM vacations WHERE id = ?');
    const existingVacation = vacationStmt.get(vacationId) as { userId: string, patientName: string, status: VacationStatus } | undefined;

    if (!existingVacation) {
        throw new Error('Vacation not found');
    }

    const stmt = db.prepare('UPDATE vacations SET status = ? WHERE id = ?');
    const result = stmt.run(status, vacationId);
    if (result.changes === 0) throw new Error('Vacation not found');

    const updatedVacation = await getVacationWithUser(vacationId);
    if (!updatedVacation) {
        throw new Error('Failed to retrieve vacation after status update');
    }

    // --- Create Notification ---
    const notificationId = uuidv4();
    const notificationMessage = `Votre demande de vacation pour ${existingVacation.patientName} a été ${status === 'Validée' ? 'validée' : 'refusée'}.`;
    const notificationType = 'vacation_status_change';

    const insertNotificationStmt = db.prepare(
        'INSERT INTO notifications (id, userId, type, message, relatedId, read, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertNotificationStmt.run(
        notificationId,
        existingVacation.userId,
        notificationType,
        notificationMessage,
        vacationId, // relatedId
        0, // unread
        new Date().toISOString()
    );

    // --- Removed WebSocket Notification (Placeholder) ---
    // console.log(`Sending WebSocket notification to user ${existingVacation.userId}: ${notificationMessage}`);
    // Example (requires a WebSocket server endpoint to receive and broadcast):
    // fetch('http://localhost:3001/send-notification', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId: existingVacation.userId, notification: { id: notificationId, message: notificationMessage, type: notificationType } })
    // });


    return updatedVacation;
}

// --- Settings Functions ---

async function getSetting(key: string): Promise<string | null> {
    const db = await getDb(); // AWAIT here
    if (!db) return null; // Handle client-side access
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value ?? null;
}

export async function getSettings(): Promise<{ acteAmount: number; forfaitAmount: number }> {
    const acteAmountStr = await getSetting('acteAmount');
    const forfaitAmountStr = await getSetting('forfaitAmount');
    
    return {
        acteAmount: acteAmountStr ? parseFloat(acteAmountStr) : 35, // default
        forfaitAmount: forfaitAmountStr ? parseFloat(forfaitAmountStr) : 25, // default
    };
}

export async function updateSettings(settings: { acteAmount: number; forfaitAmount: number }): Promise<void> {
    const db = await getDb(); // AWAIT here
    if (!db) throw new Error("Database not available on client."); // Or handle as appropriate
    const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    db.transaction(() => {
        updateStmt.run('acteAmount', settings.acteAmount.toString());
        updateStmt.run('forfaitAmount', settings.forfaitAmount.toString());
    })();
}

// --- Surgeon Functions ---

export async function getAllSurgeons(): Promise<Surgeon[]> {
    try {
        const db = await getDb(); // AWAIT here
        if (!db) return []; // Handle client-side access
        const stmt = db.prepare('SELECT * FROM surgeons ORDER BY name');
        return stmt.all() as Surgeon[];
    } catch (error) {
        console.error("getAllSurgeons failed:", error);
        return [];
    }
}

export async function addSurgeon(name: string): Promise<Surgeon> {
    try {
        const db = await getDb(); // AWAIT here
        if (!db) throw new Error("Database not available on client."); // Or handle as appropriate
        const stmt = db.prepare('INSERT INTO surgeons (name) VALUES (?)');
        const info = stmt.run(name);
        return { id: info.lastInsertRowid as number, name };
    } catch (error) {
        console.error("addSurgeon failed:", error);
        throw new Error("Failed to add surgeon, maybe the name is already taken?");
    }
}

export async function deleteSurgeon(id: number): Promise<void> {
    try {
        const db = await getDb(); // AWAIT here
        if (!db) throw new Error("Database not available on client."); // Or handle as appropriate
        const stmt = db.prepare('DELETE FROM surgeons WHERE id = ?');
        const info = stmt.run(id);
        if (info.changes === 0) {
            throw new Error('Surgeon not found');
        }
    } catch (error) {
        console.error("deleteSurgeon failed:", error);
        throw new Error('Failed to delete surgeon');
    }
}
