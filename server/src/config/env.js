const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : [],
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

  // Background Campaign Worker Settings
  CAMPAIGN_WORKER_ENABLED: process.env.CAMPAIGN_WORKER_ENABLED !== 'false',
  CAMPAIGN_RATE_LIMIT_DELAY_MS: parseInt(process.env.CAMPAIGN_RATE_LIMIT_DELAY_MS, 10) || 50,
  CAMPAIGN_BATCH_SIZE: parseInt(process.env.CAMPAIGN_BATCH_SIZE, 10) || 10,
  CAMPAIGN_MAX_RETRIES: parseInt(process.env.CAMPAIGN_MAX_RETRIES, 10) || 3,

  // Observability & Health
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  HEALTH_CHECK_TIMEOUT_MS: parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS, 10) || 3000,
};

// Production Environment Safety Invariants
if (env.NODE_ENV === 'production') {
  const errors = [];

  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL is required in production.');
  }

  if (
    !env.JWT_SECRET ||
    env.JWT_SECRET === 'default_jwt_secret_change_in_production_32chars' ||
    env.JWT_SECRET.length < 32
  ) {
    errors.push('JWT_SECRET must be explicitly set and >= 32 characters in production.');
  }

  if (errors.length > 0) {
    console.error('CRITICAL: Production environment configuration validation failed:');
    errors.forEach((err) => console.error(` - ${err}`));
    throw new Error(`Production Configuration Invariant Failed: ${errors.join('; ')}`);
  }
}

module.exports = env;
