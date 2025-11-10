import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createVideo,
  getVideos,
  getVideo,
  updateVideo,
  deleteVideo,
  renderVideo,
  getVideoStatus,
  downloadVideo,
  cancelRender,
} from '../controllers/video.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post(
  '/',
  [
    body('project_id').isUUID(),
    body('title').trim().notEmpty(),
    body('script').optional().isObject(),
    body('timeline').optional().isObject(),
  ],
  createVideo
);

router.get(
  '/',
  [
    query('project_id').optional().isUUID(),
    query('status').optional().isIn(['draft', 'rendering', 'completed', 'failed']),
  ],
  getVideos
);

router.get('/:id', [param('id').isUUID()], getVideo);

router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('title').optional().trim().notEmpty(),
    body('script').optional().isObject(),
    body('timeline').optional().isObject(),
  ],
  updateVideo
);

router.delete('/:id', [param('id').isUUID()], deleteVideo);

router.post('/:id/render', [param('id').isUUID()], renderVideo);

router.get('/:id/status', [param('id').isUUID()], getVideoStatus);

router.get('/:id/download', [param('id').isUUID()], downloadVideo);

router.post('/:id/cancel', [param('id').isUUID()], cancelRender);

export default router;
