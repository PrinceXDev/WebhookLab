#!/usr/bin/env node

import crypto from 'crypto';

const secret = crypto.randomBytes(32).toString('base64');

console.log('\n🔐 Generated NEXTAUTH_SECRET:\n');
console.log(secret);
console.log('\n📋 Copy this value to your .env files:\n');
console.log('   - apps/web/.env.local');
console.log('   - apps/server/.env');
console.log('\n⚠️  Use the SAME secret in both files!\n');
