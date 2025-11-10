import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  startEyeTracking,
  getEyeTrackingData,
  updateEyeTrackingConfig,
  applyEyeCorrection,
  getEyeContactMetrics,
  getGazeHeatmap,
} from '../controllers/eyeTracking.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Start eye tracking analysis
router.post(
  '/video/:videoId',
  [
    param('videoId').isUUID(),
    body('videoStorageKey').notEmpty(),
    body('targetPosition').optional().isObject(),
    body('correctionStrength').optional().isFloat({ min: 0, max: 1 }),
    body('smoothing').optional().isFloat({ min: 0, max: 1 }),
    body('preserveBlinking').optional().isBoolean(),
    body('framerate').optional().isInt(),
  ],
  startEyeTracking
);

// Get eye tracking data
router.get(
  '/video/:videoId',
  [param('videoId').isUUID(), query('keyframesOnly').optional().isBoolean()],
  getEyeTrackingData
);

// Update eye tracking configuration
router.put(
  '/:eyeTrackingId',
  [
    param('eyeTrackingId').isUUID(),
    body('targetPosition').optional().isObject(),
    body('correctionStrength').optional().isFloat({ min: 0, max: 1 }),
    body('smoothing').optional().isFloat({ min: 0, max: 1 }),
  ],
  updateEyeTrackingConfig
);

// Apply eye contact correction to video
router.post(
  '/video/:videoId/apply',
  [param('videoId').isUUID(), body('eyeTrackingId').isUUID(), body('outputPath').notEmpty()],
  applyEyeCorrection
);

// Get eye contact metrics
router.get('/video/:videoId/metrics', [param('videoId').isUUID()], getEyeContactMetrics);

// Get gaze heatmap
router.get(
  '/video/:videoId/heatmap',
  [param('videoId').isUUID(), query('width').optional().isInt(), query('height').optional().isInt()],
  getGazeHeatmap
);

export default router;
