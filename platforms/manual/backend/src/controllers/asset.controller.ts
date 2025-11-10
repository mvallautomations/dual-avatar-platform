import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import {
  uploadFile,
  generateUniqueFilename,
  deleteFile,
  getSignedUrl,
} from '../utils/storage';

export const uploadAsset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      throw new AppError('No file provided', 400);
    }

    const { type, project_id } = req.body;
    const userId = req.user?.id;
    const id = uuidv4();

    // If project_id provided, verify it belongs to user
    if (project_id) {
      const projectResult = await query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [project_id, userId]
      );

      if (projectResult.rows.length === 0) {
        throw new AppError('Project not found', 404);
      }
    }

    // Upload file to storage
    const filename = generateUniqueFilename(req.file.originalname);
    const key = await uploadFile(req.file.buffer, filename, {
      folder: `assets/${type}`,
      contentType: req.file.mimetype,
    });

    // Save asset metadata to database
    const result = await query(
      `INSERT INTO assets (id, user_id, project_id, filename, storage_key, type, size, mime_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [
        id,
        userId,
        project_id || null,
        req.file.originalname,
        key,
        type,
        req.file.size,
        req.file.mimetype,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getAssets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { type, project_id } = req.query;

    let queryText = 'SELECT * FROM assets WHERE user_id = $1';
    const params: any[] = [userId];
    let paramCount = 2;

    if (type) {
      queryText += ` AND type = $${paramCount++}`;
      params.push(type);
    }

    if (project_id) {
      queryText += ` AND project_id = $${paramCount++}`;
      params.push(project_id);
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

export const getAsset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query(
      'SELECT * FROM assets WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Asset not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAsset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get asset info
    const result = await query(
      'SELECT storage_key FROM assets WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Asset not found', 404);
    }

    const storageKey = result.rows[0].storage_key;

    // Delete from storage
    await deleteFile(storageKey);

    // Delete from database
    await query('DELETE FROM assets WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Asset deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getAssetUrl = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query(
      'SELECT storage_key FROM assets WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Asset not found', 404);
    }

    const storageKey = result.rows[0].storage_key;

    // Generate signed URL valid for 1 hour
    const url = getSignedUrl(storageKey, 3600);

    res.json({
      success: true,
      data: { url },
    });
  } catch (error) {
    next(error);
  }
};
