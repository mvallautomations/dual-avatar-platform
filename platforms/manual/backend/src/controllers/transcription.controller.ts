import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import {
  createTranscription,
  updateTranscriptionSegments,
  generateSubtitles,
  exportTranscription,
  TranscriptionSegment,
} from '../services/transcription.service';

/**
 * Create a new transcription for a video
 */
export const createVideoTranscription = async (
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
    const { audioStorageKey, language } = req.body;
    const userId = req.user?.id;

    // Verify video belongs to user
    const videoResult = await query(
      'SELECT id FROM videos WHERE id = $1 AND user_id = $2',
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    // Create transcription (async process)
    const transcriptionId = await createTranscription(
      videoId,
      userId!,
      audioStorageKey,
      language || 'en'
    );

    res.status(202).json({
      success: true,
      data: { transcriptionId },
      message: 'Transcription started',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transcription for a video
 */
export const getVideoTranscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    const result = await query(
      `SELECT t.* FROM transcriptions t
       JOIN videos v ON t.video_id = v.id
       WHERE t.video_id = $1 AND v.user_id = $2
       ORDER BY t.created_at DESC
       LIMIT 1`,
      [videoId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Transcription not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update transcription segments (manual editing)
 */
export const updateTranscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transcriptionId } = req.params;
    const { segments } = req.body;
    const userId = req.user?.id;

    // Verify transcription belongs to user
    const result = await query(
      `SELECT t.id FROM transcriptions t
       JOIN videos v ON t.video_id = v.id
       WHERE t.id = $1 AND v.user_id = $2`,
      [transcriptionId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Transcription not found', 404);
    }

    await updateTranscriptionSegments(transcriptionId, segments);

    res.json({
      success: true,
      message: 'Transcription updated',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate subtitles from transcription
 */
export const createSubtitlesFromTranscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { transcriptionId } = req.params;
    const { maxCharsPerLine, maxDuration } = req.body;
    const userId = req.user?.id;

    // Verify transcription belongs to user
    const result = await query(
      `SELECT t.video_id FROM transcriptions t
       JOIN videos v ON t.video_id = v.id
       WHERE t.id = $1 AND v.user_id = $2`,
      [transcriptionId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Transcription not found', 404);
    }

    const videoId = result.rows[0].video_id;

    const subtitleTrackId = await generateSubtitles(
      transcriptionId,
      videoId,
      maxCharsPerLine,
      maxDuration
    );

    res.status(201).json({
      success: true,
      data: { subtitleTrackId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export transcription in various formats
 */
export const exportTranscriptionFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { transcriptionId } = req.params;
    const { format } = req.query;
    const userId = req.user?.id;

    // Verify and get transcription
    const result = await query(
      `SELECT t.segments FROM transcriptions t
       JOIN videos v ON t.video_id = v.id
       WHERE t.id = $1 AND v.user_id = $2`,
      [transcriptionId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Transcription not found', 404);
    }

    const segments: TranscriptionSegment[] = result.rows[0].segments;
    const exportFormat = (format as string) || 'srt';

    if (!['srt', 'vtt', 'txt', 'json'].includes(exportFormat)) {
      throw new AppError('Invalid export format', 400);
    }

    const content = exportTranscription(segments, exportFormat as any);

    // Set appropriate content type and filename
    const contentTypes: Record<string, string> = {
      srt: 'text/srt',
      vtt: 'text/vtt',
      txt: 'text/plain',
      json: 'application/json',
    };

    res.setHeader('Content-Type', contentTypes[exportFormat]);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transcription.${exportFormat}"`
    );

    res.send(content);
  } catch (error) {
    next(error);
  }
};

/**
 * Get subtitle tracks for a video
 */
export const getSubtitleTracks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    const result = await query(
      `SELECT st.* FROM subtitle_tracks st
       JOIN videos v ON st.video_id = v.id
       WHERE st.video_id = $1 AND v.user_id = $2
       ORDER BY st.created_at DESC`,
      [videoId, userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update subtitle track
 */
export const updateSubtitleTrack = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { trackId } = req.params;
    const { entries, style } = req.body;
    const userId = req.user?.id;

    // Verify track belongs to user
    const checkResult = await query(
      `SELECT st.id FROM subtitle_tracks st
       JOIN videos v ON st.video_id = v.id
       WHERE st.id = $1 AND v.user_id = $2`,
      [trackId, userId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Subtitle track not found', 404);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (entries) {
      updates.push(`entries = $${paramCount++}`);
      values.push(JSON.stringify(entries));
    }

    if (style) {
      updates.push(`style = $${paramCount++}`);
      values.push(JSON.stringify(style));
    }

    updates.push(`updated_at = NOW()`);
    values.push(trackId);

    await query(
      `UPDATE subtitle_tracks SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    res.json({
      success: true,
      message: 'Subtitle track updated',
    });
  } catch (error) {
    next(error);
  }
};
