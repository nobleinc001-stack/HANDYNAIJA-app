import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import router from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { sendSuccess } from './utils/response.js';

const app = express();

app.use(cors());
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
