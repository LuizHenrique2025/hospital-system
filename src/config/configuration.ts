export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  cors: {
    origin: process.env.FRONTEND_URL,
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL_MS || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '120', 10),
    authLimit: parseInt(process.env.AUTH_THROTTLE_LIMIT || '5', 10),
    authBlockDuration: parseInt(
      process.env.AUTH_THROTTLE_BLOCK_MS || '300000',
      10,
    ),
  },
});
