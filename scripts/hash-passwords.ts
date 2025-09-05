import { db } from '../src/lib/db';
import bcrypt from 'bcrypt';

async function hashExistingPasswords() {
  console.log('Starting password hashing process...');

  const users = db.prepare('SELECT * FROM users').all() as any[];

  if (!users || users.length === 0) {
    console.log('No users found in the database.');
    return;
  }

  console.log(`Found ${users.length} users.`);

  const salt = bcrypt.genSaltSync(10);
  const updateUserPassword = db.prepare('UPDATE users SET password = ? WHERE uid = ?');

  let updatedCount = 0;

  for (const user of users) {
    // Check if the password is likely a bcrypt hash
    const isHashed = user.password && user.password.startsWith('$2');

    if (!isHashed) {
      console.log(`Hashing password for user: ${user.username} (uid: ${user.uid})`);
      const hashedPassword = bcrypt.hashSync(user.password, salt);
      updateUserPassword.run(hashedPassword, user.uid);
      updatedCount++;
    } else {
      console.log(`Password for user: ${user.username} (uid: ${user.uid}) is already hashed.`);
    }
  }

  if (updatedCount > 0) {
    console.log(`Successfully hashed and updated ${updatedCount} passwords.`);
  } else {
    console.log('No passwords needed to be updated.');
  }

  console.log('Password hashing process finished.');
}

hashExistingPasswords().catch((error) => {
  console.error('An error occurred during password hashing:', error);
  process.exit(1);
});
