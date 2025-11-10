import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getTimeline,
  createClip,
  updateClip,
  removeClip,
  copyClip,
  trimTimelineClip,
  splitTimelineClip,
  checkCollisions,
  arrangeClips,
  validateTimelineStructure,
  exportTimeline,
  bulkUpdateClips,
} from '../controllers/timeline.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get timeline for video
router.get('/video/:videoId', [param('videoId').isUUID()], getTimeline);

// Create clip
router.post(
  '/video/:videoId/clips',
  [
    param('videoId').isUUID(),
    body('type').isIn(['video', 'audio', 'image', 'text', 'avatar']),
    body('startTime').isFloat({ min: 0 }),
    body('endTime').isFloat({ min: 0 }),
    body('trackIndex').optional().isInt({ min: 0 }),
  ],
  createClip
);

// Update clip
router.put('/clips/:clipId', [param('clipId').isUUID()], updateClip);

// Delete clip
router.delete('/clips/:clipId', [param('clipId').isUUID()], removeClip);

// Duplicate clip
router.post(
  '/clips/:clipId/duplicate',
  [param('clipId').isUUID(), body('offsetTime').optional().isFloat()],
  copyClip
);

// Trim clip
router.post(
  '/clips/:clipId/trim',
  [
    param('clipId').isUUID(),
    body('startTime').isFloat({ min: 0 }),
    body('endTime').isFloat({ min: 0 }),
  ],
  trimTimelineClip
);

// Split clip
router.post(
  '/clips/:clipId/split',
  [param('clipId').isUUID(), body('splitTime').isFloat({ min: 0 })],
  splitTimelineClip
);

// Check collisions
router.get('/video/:videoId/collisions', [param('videoId').isUUID()], checkCollisions);

// Auto-arrange clips
router.post('/video/:videoId/arrange', [param('videoId').isUUID()], arrangeClips);

// Validate timeline
router.get('/video/:videoId/validate', [param('videoId').isUUID()], validateTimelineStructure);

// Export timeline
router.get(
  '/video/:videoId/export',
  [param('videoId').isUUID(), query('format').optional().isIn(['ffmpeg', 'json'])],
  exportTimeline
);

// Bulk update clips
router.put(
  '/video/:videoId/bulk',
  [param('videoId').isUUID(), body('clips').isArray()],
  bulkUpdateClips
);

export default router;
