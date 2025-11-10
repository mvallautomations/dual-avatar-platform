import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import {
  processEyeTracking,
  applyGazeCorrection,
  createEyeTrackingRecord,
  updateEyeTrackingFrames,
  getEyeTrackingKeyframes,
  calculateEyeContactMetrics,
  applyEyeContactCorrection,
  generateGazeHeatmap,
  EyeTrackingConfig,
  EyeTrackingFrame,
} from '../services/eyeTracking.service';
import { emitToUser } from '../config/socket';

/**
 * Start eye tracking analysis for a video
 */
export const startEyeTracking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { videoId } = req.params;
    const {
      videoStorageKey,
      targetPosition,
      correctionStrength,
      smoothing,
      preserveBlinking,
      framerate,
    } = req.body;
    const userId = req.user?.id;

    // Verify video belongs to user
    const videoResult = await query(
      'SELECT id FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    const config: EyeTrackingConfig = {
      targetPosition: targetPosition || { x: 0, y: 0, z: 1 },
      correctionStrength: correctionStrength || 1.0,
      smoothing: smoothing || 0.5,
      preserveBlinking: preserveBlinking !== false,
      framerate: framerate || 30,
    };

    // Create eye tracking record
    const eyeTrackingId = await createEyeTrackingRecord(videoId, userId!, config);

    // Start async processing
    processEyeTrackingAsync(eyeTrackingId, videoStorageKey, config, userId!);

    res.status(202).json({
      success: true,
      data: { eyeTrackingId },
      message: 'Eye tracking started',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Async eye tracking processing
 */
async function processEyeTrackingAsync(
  eyeTrackingId: string,
  videoStorageKey: string,
  config: EyeTrackingConfig,
  userId: string
) {
  try {
    // Process eye tracking
    const frames = await processEyeTracking(videoStorageKey, config);

    // Apply gaze correction
    const correctedFrames = applyGazeCorrection(frames, config);

    // Save results
    await updateEyeTrackingFrames(eyeTrackingId, correctedFrames);

    // Notify user via WebSocket
    emitToUser(userId, 'eye-tracking:completed', {
      eyeTrackingId,
      frameCount: correctedFrames.length,
    });
  } catch (error) {
    await query(
      'UPDATE eye_tracking_data SET status = $1, updated_at = NOW() WHERE id = $2',
      ['failed', eyeTrackingId]
    );

    emitToUser(userId, 'eye-tracking:failed', {
      eyeTrackingId,
      error: (error as Error).message,
    });
  }
}

/**
 * Get eye tracking data for a video
 */
export const getEyeTrackingData = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const { keyframesOnly } = req.query;
    const userId = req.user?.id;

    const result = await query(
      `SELECT et.* FROM eye_tracking_data et
       JOIN videos v ON et.video_id = v.id
       WHERE et.video_id = $1 AND v.user_id = $2
       ORDER BY et.created_at DESC
       LIMIT 1`,
      [videoId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Eye tracking data not found', 404);
    }

    const data = result.rows[0];

    // Return keyframes only if requested (for UI performance)
    if (keyframesOnly === 'true' && data.frames) {
      const keyframes = getEyeTrackingKeyframes(data.frames, 30);
      data.frames = keyframes;
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update eye tracking configuration
 */
export const updateEyeTrackingConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eyeTrackingId } = req.params;
    const { targetPosition, correctionStrength, smoothing } = req.body;
    const userId = req.user?.id;

    // Verify eye tracking belongs to user
    const checkResult = await query(
      `SELECT et.id, et.frames FROM eye_tracking_data et
       JOIN videos v ON et.video_id = v.id
       WHERE et.id = $1 AND v.user_id = $2`,
      [eyeTrackingId, userId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Eye tracking data not found', 404);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (targetPosition) {
      updates.push(`target_position = $${paramCount++}`);
      values.push(JSON.stringify(targetPosition));
    }

    if (correctionStrength !== undefined) {
      updates.push(`correction_strength = $${paramCount++}`);
      values.push(correctionStrength);
    }

    if (smoothing !== undefined) {
      updates.push(`smoothing = $${paramCount++}`);
      values.push(smoothing);
    }

    updates.push(`updated_at = NOW()`);
    values.push(eyeTrackingId);

    await query(
      `UPDATE eye_tracking_data SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    // Re-apply gaze correction with new config
    if (checkResult.rows[0].frames) {
      const originalFrames: EyeTrackingFrame[] = checkResult.rows[0].frames;

      const newConfig: Partial<EyeTrackingConfig> = {
        targetPosition,
        correctionStrength,
        smoothing,
      };

      const correctedFrames = applyGazeCorrection(originalFrames, newConfig as EyeTrackingConfig);

      await updateEyeTrackingFrames(eyeTrackingId, correctedFrames);
    }

    res.json({
      success: true,
      message: 'Eye tracking configuration updated',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Apply eye contact correction to video
 */
export const applyEyeCorrection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const { eyeTrackingId, outputPath } = req.body;
    const userId = req.user?.id;

    // Verify video belongs to user
    const videoResult = await query(
      'SELECT id FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    // Apply correction (async process)
    const outputUrl = await applyEyeContactCorrection(videoId, eyeTrackingId, outputPath);

    // Update video with corrected output
    await query('UPDATE videos SET output_url = $1, updated_at = NOW() WHERE id = $2', [
      outputUrl,
      videoId,
    ]);

    res.json({
      success: true,
      data: { outputUrl },
      message: 'Eye contact correction applied',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get eye contact metrics for a video
 */
export const getEyeContactMetrics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    // Get eye tracking data
    const result = await query(
      `SELECT et.frames FROM eye_tracking_data et
       JOIN videos v ON et.video_id = v.id
       WHERE et.video_id = $1 AND v.user_id = $2 AND et.status = 'completed'
       ORDER BY et.created_at DESC
       LIMIT 1`,
      [videoId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Eye tracking data not found', 404);
    }

    const frames: EyeTrackingFrame[] = result.rows[0].frames;
    const metrics = calculateEyeContactMetrics(frames);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate gaze heatmap
 */
export const getGazeHeatmap = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const { width, height } = req.query;
    const userId = req.user?.id;

    // Get eye tracking data
    const result = await query(
      `SELECT et.frames FROM eye_tracking_data et
       JOIN videos v ON et.video_id = v.id
       WHERE et.video_id = $1 AND v.user_id = $2 AND et.status = 'completed'
       ORDER BY et.created_at DESC
       LIMIT 1`,
      [videoId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Eye tracking data not found', 404);
    }

    const frames: EyeTrackingFrame[] = result.rows[0].frames;
    const heatmap = generateGazeHeatmap(
      frames,
      parseInt(width as string) || 1920,
      parseInt(height as string) || 1080
    );

    res.json({
      success: true,
      data: heatmap,
    });
  } catch (error) {
    next(error);
  }
};
