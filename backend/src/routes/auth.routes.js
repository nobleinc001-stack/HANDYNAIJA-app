import { Router } from 'express';
import { registerUser, loginUser, resetPassword } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { registerSchema, loginSchema, resetPasswordSchema } from '../validators/auth.validator.js';

const router = Router();

router.post('/register', validateBody(registerSchema), registerUser);
router.post('/login', validateBody(loginSchema), loginUser);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);

export default router;
