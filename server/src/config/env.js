const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || '',

  JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production_32chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 500,

  // WhatsApp Meta Cloud API
  WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED !== 'false',
  WHATSAPP_MODE: process.env.WHATSAPP_MODE || 'mock', // 'mock' | 'test' | 'production'
  WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION || 'v21.0',
  WHATSAPP_BASE_URL: process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com',
  WHATSAPP_APP_ID: process.env.WHATSAPP_APP_ID || '',
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET || '',
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || '',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || 'crm_whatsapp_verify_token_default',
  WHATSAPP_WEBHOOK_PATH: process.env.WHATSAPP_WEBHOOK_PATH || '/api/v1/webhooks/whatsapp',
};

module.exports = env;
