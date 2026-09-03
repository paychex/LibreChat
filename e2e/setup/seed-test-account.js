/**
 * Seed the local E2E test account (libre_playwright_np) in MongoDB.
 *
 * This script ensures the Playwright test account exists in the local database
 * so E2E tests can authenticate using local email/password login.
 *
 * Uses the same credentials from .env (E2E_USERNAME / E2E_PASSWORD).
 * If the account already exists, updates the password to match.
 *
 * Usage:
 *   node e2e/setup/seed-test-account.js
 *   npm run e2e:seed
 */
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27117/LibreChat';
const E2E_USERNAME = process.env.E2E_USERNAME;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

async function seedTestAccount() {
  if (!E2E_USERNAME || !E2E_PASSWORD) {
    console.error('✗ E2E_USERNAME and E2E_PASSWORD must be set in .env');
    process.exit(1);
  }

  const email = E2E_USERNAME.toLowerCase().trim();
  const username = email.split('@')[0];
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(E2E_PASSWORD, salt);

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');

    const existing = await users.findOne({ email });

    if (existing) {
      await users.updateOne({ email }, { $set: { password: hashedPassword, role: 'ADMIN' } });
      console.log(`✓ Updated password and role for existing test account: ${email} (role: ADMIN)`);
    } else {
      await users.insertOne({
        name: username,
        username,
        email,
        password: hashedPassword,
        provider: 'local',
        emailVerified: true,
        role: 'ADMIN',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✓ Created test account: ${email} (username: ${username})`);
    }
  } catch (error) {
    console.error('✗ Failed to seed test account:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedTestAccount();
