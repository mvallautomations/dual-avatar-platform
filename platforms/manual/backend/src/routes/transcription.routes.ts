import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createVideoTranscription,
  getVideoTranscription,
  updateTranscription,
  createSubtitlesFromTranscription,
  exportTranscriptionFile,
  getSubtitleTracks,
  updateSubtitleTrack,
} from '../controllers/transcription.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Transcription routes
router.post(
  '/video/:videoId',
  [param('videoId').isUUID(), body('audioStorageKey').notEmpty(), body('language').optional()],
  createVideoTranscription
);

router.get('/video/:videoId', [param('videoId').isUUID()], getVideoTranscription);

router.put(
  '/:transcriptionId',
  [param('transcriptionId').isUUID(), body('segments').isArray()],
  updateTranscription
);

router.post(
  '/:transcriptionId/subtitles',
  [
    param('transcriptionId').isUUID(),
    body('maxCharsPerLine').optional().isInt(),
    body('maxDuration').optional().isFloat(),
  ],
  createSubtitlesFromTranscription
);

router.get(
  '/:transcriptionId/export',
  [param('transcriptionId').isUUID(), query('format').optional().isIn(['srt', 'vtt', 'txt', 'json'])],
  exportTranscriptionFile
);

// Subtitle tracks routes
router.get('/subtitles/video/:videoId', [param('videoId').isUUID()], getSubtitleTracks);

router.put(
  '/subtitles/:trackId',
  [
    param('trackId').isUUID(),
    body('entries').optional().isArray(),
    body('style').optional().isObject(),
  ],
  updateSubtitleTrack
);

export default router;
