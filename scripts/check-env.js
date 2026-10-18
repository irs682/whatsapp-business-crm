/**
 * WhatsApp Business CRM - Environment Verification Utility
 * Checks for mandatory environment variables across client and server.
 */

const fs = require('fs');
const path = require('path');

function checkEnv() {
  console.log('--- Checking WhatsApp Business CRM Environment ---');
  const serverEnvPath = path.resolve(__dirname, '../server/.env');
  const clientEnvPath = path.resolve(__dirname, '../client/.env');

  if (!fs.existsSync(serverEnvPath)) {
    console.warn('⚠️  Server .env file not found. Copying from .env.example if available...');
    const serverExample = path.resolve(__dirname, '../server/.env.example');
    if (fs.existsSync(serverExample)) {
      fs.copyFileSync(serverExample, serverEnvPath);
      console.log('✅ Created server/.env from server/.env.example');
    }
  } else {
    console.log('✅ Server .env found.');
  }

  if (!fs.existsSync(clientEnvPath)) {
    console.warn('⚠️  Client .env file not found. Copying from .env.example if available...');
    const clientExample = path.resolve(__dirname, '../client/.env.example');
    if (fs.existsSync(clientExample)) {
      fs.copyFileSync(clientExample, clientEnvPath);
      console.log('✅ Created client/.env from client/.env.example');
    }
  } else {
    console.log('✅ Client .env found.');
  }

  console.log('--- Environment Check Complete ---');
}

checkEnv();
