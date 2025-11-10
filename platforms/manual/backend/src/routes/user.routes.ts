import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updatePassword,
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin only routes
router.get('/', authorize('admin'), getUsers);

// User routes
router.get('/:id', [param('id').isUUID()], getUser);

router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
  ],
  updateUser
);

router.delete('/:id', [param('id').isUUID()], deleteUser);

router.post(
  '/:id/password',
  [
    param('id').isUUID(),
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  updatePassword
);

export default router;
