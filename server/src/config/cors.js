const env = require('./env');

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const sanitize = (url) => (typeof url === 'string' ? url.trim().replace(/\/+$/, '') : '');
    const cleanOrigin = sanitize(origin);

    const allowedOrigins = [
      sanitize(env.CLIENT_URL),
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...((env.ALLOWED_ORIGINS || []).map(sanitize)),
    ].filter(Boolean);

    // In development mode, allow localhost, 127.0.0.1, and local private network IPs
    const isDevelopment = env.NODE_ENV === 'development';
    const isAllowed = allowedOrigins.includes(cleanOrigin) || isDevelopment;

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

module.exports = corsOptions;
