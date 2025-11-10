import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import {
  createTimelineClip,
  getTimelineClips,
  updateTimelineClip,
  deleteTimelineClip,
  duplicateTimelineClip,
  trimClip,
  splitClip,
  detectClipCollisions,
  autoArrangeClips,
  calculateTimelineDuration,
  exportTimelineToFormat,
  validateTimeline,
  TimelineClip,
} from '../services/timeline.service';

/**
 * Get all timeline clips for a video
 */
export const getTimeline = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    // Verify video belongs to user
    const videoResult = await query(
      'SELECT id FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    const clips = await getTimelineClips(videoId);
    const duration = calculateTimelineDuration(clips);

    res.json({
      success: true,
      data: {
        clips,
        duration,
        clipCount: clips.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new timeline clip
 */
export const createClip = async (
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
    const clipData = req.body;
    const userId = req.user?.id;

    // Verify video belongs to user
    const videoResult = await query(
      'SELECT id FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    const clip = await createTimelineClip(videoId, userId!, clipData);

    res.status(201).json({
      success: true,
      data: clip,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a timeline clip
 */
export const updateClip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { clipId } = req.params;
    const updates = req.body;
    const userId = req.user?.id;

    // Verify clip belongs to user
    const checkResult = await query(
      `SELECT tc.id FROM timeline_clips tc
       JOIN videos v ON tc.video_id = v.id
       WHERE tc.id = $1 AND v.user_id = $2`,
      [clipId, userId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Clip not found', 404);
    }

    const clip = await updateTimelineClip(clipId, updates);

    res.json({
      success: true,
      data: clip,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a timeline clip
 */
export const removeClip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { clipId } = req.params;
    const userId = req.user?.id;

    // Verify clip belongs to user
    const checkResult = await query(
      `SELECT tc.id FROM timeline_clips tc
       JOIN videos v ON tc.video_id = v.id
       WHERE tc.id = $1 AND v.user_id = $2`,
      [clipId, userId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Clip not found', 404);
    }

    await deleteTimelineClip(clipId);

    res.json({
      success: true,
      message: 'Clip deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Duplicate a timeline clip
 */
export const copyClip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { clipId } = req.params;
    const { offsetTime } = req.body;
    const userId = req.user?.id;

    // Verify clip belongs to user
    const checkResult = await query(
      `SELECT tc.id FROM timeline_clips tc
       JOIN videos v ON tc.video_id = v.id
       WHERE tc.id = $1 AND v.user_id = $2`,
      [clipId, userId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Clip not found', 404);
    }

    const newClip = await duplicateTimelineClip(clipId, offsetTime);

    res.status(201).json({
      success: true,
      data: newClip,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trim a clip
 */
export const trimTimelineClip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { clipId } = req.params;
    const { startTime, endTime } = req.body;
    const userId = req.user?.id;

    // Verify clip belongs to user
    const checkResult = await query(
      `SELECT tc.id FROM timeline_clips tc
       JOIN videos v ON tc.video_id = v.id
       WHERE tc.id = $1 AND v.user_id = $2`,
      [clipId, userId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Clip not found', 404);
    }

    const clip = await trimClip(clipId, startTime, endTime);

    res.json({
      success: true,
      data: clip,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Split a clip at a specific time
 */
export const splitTimelineClip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { clipId } = req.params;
    const { splitTime } = req.body;
    const userId = req.user?.id;

    // Verify clip belongs to user
    const checkResult = await query(
      `SELECT tc.id FROM timeline_clips tc
       JOIN videos v ON tc.video_id = v.id
       WHERE tc.id = $1 AND v.user_id = $2`,
      [clipId, userId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Clip not found', 404);
    }

    const [firstClip, secondClip] = await splitClip(clipId, splitTime);

    res.json({
      success: true,
      data: {
        firstClip,
        secondClip,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Detect clip collisions
 */
export const checkCollisions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    // Verify video belongs to user
    const videoResult = await query(
      'SELECT id FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    const clips = await getTimelineClips(videoId);
    const collisions = detectClipCollisions(clips);

    res.json({
      success: true,
      data: {
        collisions,
        hasCollisions: collisions.length > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Auto-arrange clips to avoid collisions
 */
export const arrangeClips = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    // Verify video belongs to user
    const videoResult = await query(
      'SELECT id FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    const clips = await getTimelineClips(videoId);
    const arrangedClips = autoArrangeClips(clips);

    // Update all clips with new positions
    for (const clip of arrangedClips) {
      await updateTimelineClip(clip.id, {
        startTime: clip.startTime,
        endTime: clip.endTime,
      });
    }

    res.json({
      success: true,
      data: arrangedClips,
      message: 'Clips auto-arranged',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate timeline
 */
export const validateTimelineStructure = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    // Verify video belongs to user
    const videoResult = await query(
      'SELECT id FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    const clips = await getTimelineClips(videoId);
    const validation = validateTimeline(clips);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export timeline to various formats
 */
export const exportTimeline = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const { format } = req.query;
    const userId = req.user?.id;

    // Verify video belongs to user
    const videoResult = await query(
      'SELECT id FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    const clips = await getTimelineClips(videoId);
    const exportFormat = (format as string) || 'json';

    if (!['ffmpeg', 'json'].includes(exportFormat)) {
      throw new AppError('Invalid export format', 400);
    }

    const content = exportTimelineToFormat(clips, exportFormat as any);

    // Set appropriate content type
    const contentTypes: Record<string, string> = {
      ffmpeg: 'text/plain',
      json: 'application/json',
    };

    res.setHeader('Content-Type', contentTypes[exportFormat]);
    res.setHeader('Content-Disposition', `attachment; filename="timeline.${exportFormat}"`);

    res.send(content);
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update clips
 */
export const bulkUpdateClips = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const { clips } = req.body;
    const userId = req.user?.id;

    // Verify video belongs to user
    const videoResult = await query(
      'SELECT id FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    // Update all clips
    const updatedClips: TimelineClip[] = [];
    for (const clipUpdate of clips) {
      const clip = await updateTimelineClip(clipUpdate.id, clipUpdate);
      updatedClips.push(clip);
    }

    res.json({
      success: true,
      data: updatedClips,
      message: `${updatedClips.length} clips updated`,
    });
  } catch (error) {
    next(error);
  }
};
