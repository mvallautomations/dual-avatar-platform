import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  uploadAsset,
  getAssets,
  getAsset,
  deleteAsset,
  getAssetUrl,
} from '../controllers/asset.controller';
import { authenticate } from '../middleware/auth';
import multer from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_VIDEO_SIZE_MB || '500') * 1024 * 1024,
  },
});

// All routes require authentication
router.use(authenticate);

router.post(
  '/upload',
  upload.single('file'),
  [body('type').isIn(['image', 'audio', 'video', 'other'])],
  uploadAsset
);

router.get(
  '/',
  [
    query('type').optional().isIn(['image', 'audio', 'video', 'other']),
    query('project_id').optional().isUUID(),
  ],
  getAssets
);

router.get('/:id', [param('id').isUUID()], getAsset);

router.delete('/:id', [param('id').isUUID()], deleteAsset);

router.get('/:id/url', [param('id').isUUID()], getAssetUrl);

export default router;
