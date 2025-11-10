import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { emitRenderProgress } from '../config/socket';
import { getSignedUrl } from '../utils/storage';

export const createVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, title, script, timeline } = req.body;
    const userId = req.user?.id;
    const id = uuidv4();

    // Verify project belongs to user
    const projectResult = await query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [project_id, userId]
    );

    if (projectResult.rows.length === 0) {
      throw new AppError('Project not found', 404);
    }

    const result = await query(
      `INSERT INTO videos (id, project_id, user_id, title, script, timeline, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [id, project_id, userId, title, script || {}, timeline || {}, 'draft']
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getVideos = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { project_id, status } = req.query;

    let queryText = 'SELECT * FROM videos WHERE user_id = $1';
    const params: any[] = [userId];
    let paramCount = 2;

    if (project_id) {
      queryText += ` AND project_id = $${paramCount++}`;
      params.push(project_id);
    }

    if (status) {
      queryText += ` AND status = $${paramCount++}`;
      params.push(status);
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query(
      'SELECT * FROM videos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, script, timeline } = req.body;
    const userId = req.user?.id;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (title) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }

    if (script) {
      updates.push(`script = $${paramCount++}`);
      values.push(JSON.stringify(script));
    }

    if (timeline) {
      updates.push(`timeline = $${paramCount++}`);
      values.push(JSON.stringify(timeline));
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(id, userId);

    const result = await query(
      `UPDATE videos SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount++} AND user_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query(
      'DELETE FROM videos WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    res.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const renderVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get video
    const result = await query(
      'SELECT * FROM videos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    // Update status to rendering
    await query(
      `UPDATE videos SET status = $1, render_started_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      ['rendering', id]
    );

    // TODO: Implement actual video rendering logic
    // This would typically queue a background job
    // For now, we'll just emit a socket event
    emitRenderProgress(id, 0, 'starting');

    res.json({
      success: true,
      message: 'Video rendering started',
      data: { videoId: id },
    });
  } catch (error) {
    next(error);
  }
};

export const getVideoStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query(
      'SELECT id, status, render_progress, render_started_at, render_completed_at FROM videos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const downloadVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query(
      'SELECT output_url, status FROM videos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Video not found', 404);
    }

    const video = result.rows[0];

    if (video.status !== 'completed') {
      throw new AppError('Video is not ready for download', 400);
    }

    if (!video.output_url) {
      throw new AppError('Video file not found', 404);
    }

    // Generate signed URL for download
    const downloadUrl = getSignedUrl(video.output_url, 3600);

    res.json({
      success: true,
      data: { downloadUrl },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelRender = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query(
      `UPDATE videos SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 AND status = $4
       RETURNING *`,
      ['cancelled', id, userId, 'rendering']
    );

    if (result.rows.length === 0) {
      throw new AppError('Video not found or not rendering', 404);
    }

    res.json({
      success: true,
      message: 'Render cancelled',
    });
  } catch (error) {
    next(error);
  }
};
