import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createCharacter,
  getCharacters,
  getCharacter,
  updateCharacter,
  deleteCharacter,
  uploadCharacterAsset,
} from '../controllers/character.controller';
import { authenticate } from '../middleware/auth';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticate);

router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('voice_id').optional().trim(),
    body('avatar_config').optional().isObject(),
  ],
  createCharacter
);

router.get('/', getCharacters);

router.get('/:id', [param('id').isUUID()], getCharacter);

router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('voice_id').optional().trim(),
    body('avatar_config').optional().isObject(),
  ],
  updateCharacter
);

router.delete('/:id', [param('id').isUUID()], deleteCharacter);

router.post(
  '/:id/upload',
  [param('id').isUUID()],
  upload.single('file'),
  uploadCharacterAsset
);

export default router;
