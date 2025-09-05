import path from 'path';
import bcrypt from 'bcrypt';

let dbInstance: any = null;

async function initializeDB(db: any) {
    // Create users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            uid TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'admin'))
        );
    `);

    // Create vacations table
    db.exec(`
        CREATE TABLE IF NOT EXISTS vacations (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            patientName TEXT NOT NULL,
            matricule TEXT NOT NULL,
            surgeon TEXT NOT NULL,
            operation TEXT NOT NULL,
            reason TEXT NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('En attente', 'Validée', 'Refusée')),
            FOREIGN KEY (userId) REFERENCES users(uid)
        );
    `);

     // Create settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);

    // Create surgeons table
    db.exec(`
        CREATE TABLE IF NOT EXISTS surgeons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
    `);

    // Create messages table
    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversationId TEXT NOT NULL,
            senderId TEXT NOT NULL,
            receiverId TEXT NOT NULL,
            subject TEXT NOT NULL,
            content TEXT NOT NULL,
            read INTEGER NOT NULL DEFAULT 0,
            isArchived INTEGER NOT NULL DEFAULT 0, -- New column
            createdAt TEXT NOT NULL,
            FOREIGN KEY (senderId) REFERENCES users(uid),
            FOREIGN KEY (receiverId) REFERENCES users(uid)
        );
    `);

    // Create notifications table - NEW
    db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            relatedId TEXT,
            read INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(uid)
        );
    `);

    console.log("Database schema checked/initialized.");

    // --- Seed Data (if tables are empty) ---
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (userCount.count === 0) {
        console.log("Seeding users...");
        const insertUser = db.prepare('INSERT INTO users (uid, email, username, password, role) VALUES (?, ?, ?, ?, ?)');
        const usersToSeed = [
            { uid: 'admin-user', email: 'admin@vacationease.app', username: 'admin', password: 'password', role: 'admin' },
            { uid: 'normal-user', email: 'user@vacationease.app', username: 'user', password: 'password', role: 'user' },
        ];

        for (const user of usersToSeed) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            insertUser.run(user.uid, user.email, user.username, hashedPassword, user.role);
        }
    }

    const vacationCount = db.prepare('SELECT COUNT(*) as count FROM vacations').get() as { count: number };
    if (vacationCount.count === 0) {
        console.log("Seeding vacations...");
        const insertVacation = db.prepare('INSERT INTO vacations (id, userId, date, time, patientName, matricule, surgeon, operation, reason, type, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        db.transaction((vacations: any) => {
             for (const v of vacations) insertVacation.run(v.id, v.userId, v.date, v.time, v.patientName, v.matricule, v.surgeon, v.operation, v.reason, v.type, v.amount, v.status);
        })([
             { id: '1', userId: 'normal-user', date: new Date('2024-07-20T10:00:00Z').toISOString(), time: '10:00', patientName: 'Alice Martin', matricule: 'M12345', surgeon: 'Dr. Dubois', operation: 'Appendicectomie', reason: 'Necessite du travail', type: 'acte', amount: 35, status: 'Validée' },
             { id: '2', userId: 'normal-user', date: new Date('2024-07-22T14:30:00Z').toISOString(), time: '14:30', patientName: 'Bob Lefebvre', matricule: 'M67890', surgeon: 'Dr. Durand', operation: 'Cholécystectomie', reason: 'Astreinte A.M', type: 'forfait', amount: 25, status: 'En attente' },
             { id: '3', userId: 'admin-user', date: new Date('2024-07-25T09:00:00Z').toISOString(), time: '09:00', patientName: 'Charlie Dupont', matricule: 'M11223', surgeon: 'Dr. Petit', operation: 'Herniorraphie', reason: 'Astreinte nuit', type: 'acte', amount: 35, status: 'Refusée' },
        ]);
    }

    const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
    if (settingsCount.count === 0) {
        console.log("Seeding settings...");
        const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        db.transaction((settings: any) => {
            for (const setting of settings) insertSetting.run(setting.key, setting.value);
        })([
            { key: 'acteAmount', value: '35' },
            { key: 'forfaitAmount', value: '25' },
        ]);
    }

    const surgeonCount = db.prepare('SELECT COUNT(*) as count FROM surgeons').get() as { count: number };
    if (surgeonCount.count === 0) {
        console.log("Seeding surgeons...");
        const insertSurgeon = db.prepare('INSERT INTO surgeons (name) VALUES (?)');
        db.transaction((surgeons: any) => {
            for (const surgeon of surgeons) insertSurgeon.run(surgeon);
        })([ 'Dr. Dubois', 'Dr. Durand', 'Dr. Petit', 'Dr. Martin' ]);
    }
}

export async function getDb() {
    if (typeof window === 'undefined') { // Only run on the server
        if (!dbInstance) {
            try {
                const { default: Database } = await import('better-sqlite3'); // Dynamic async import
                const dbPath = process.env.NODE_ENV === 'production' && process.versions.electron ?
                    path.join(process.resourcesPath, 'db.sqlite') :
                    path.resolve(process.cwd(), 'src/db/db.sqlite');
                dbInstance = new Database(dbPath);

                // Ensure DB is initialized when this module is loaded
                await initializeDB(dbInstance);
            } catch(err) {
                console.error("Database initialization failed:", err);
                // Exit gracefully if the db can't be set up
                process.exit(1);
            }
        }
        return dbInstance;
    } else {
        console.warn("Attempted to access database on the client. This should not happen.");
        return null;
    }
}