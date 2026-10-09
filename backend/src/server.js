import app from './app.js';
import { env } from './config/env.js';
import prisma, { testDatabaseConnection } from './config/database.js';

const startServer = async () => {
  try {
    await testDatabaseConnection();
    console.log('Database connection successful.');

    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`HandyNaija API listening on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
