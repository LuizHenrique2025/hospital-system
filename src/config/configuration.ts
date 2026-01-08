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
    origin: process.env.FRONTEND_URL || '*',
  },
});
