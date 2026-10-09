import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import router from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { sendSuccess } from './utils/response.js';

const app = express();

const vercelOriginPattern = /^https:\/\/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+vercel\.app$/i;
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    const isLocalDevelopmentOrigin = process.env.NODE_ENV !== 'production'
      && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin || '');
    const isAllowed = !origin
      || vercelOriginPattern.test(origin)
      || configuredOrigins.includes(origin)
      || isLocalDevelopmentOrigin;

    callback(null, isAllowed);
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => {
  sendSuccess(res, { status: 'ok', service: 'handynaija-backend' });
});

app.use('/api/v1', router);

app.use(notFound);
app.use(errorHandler);

export default app;
