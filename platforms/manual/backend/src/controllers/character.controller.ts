import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile, generateUniqueFilename } from '../utils/storage';

export const createCharacter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, voice_id, avatar_config } = req.body;
    const userId = req.user?.id;
    const id = uuidv4();

    const result = await query(
      `INSERT INTO characters (id, user_id, name, voice_id, avatar_config, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [id, userId, name, voice_id || null, avatar_config || {}]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getCharacters = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const result = await query(
      'SELECT * FROM characters WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getCharacter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query(
      'SELECT * FROM characters WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Character not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateCharacter = async (
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
    const { name, voice_id, avatar_config } = req.body;
    const userId = req.user?.id;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (voice_id !== undefined) {
      updates.push(`voice_id = $${paramCount++}`);
      values.push(voice_id);
    }

    if (avatar_config) {
      updates.push(`avatar_config = $${paramCount++}`);
      values.push(JSON.stringify(avatar_config));
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(id, userId);

    const result = await query(
      `UPDATE characters SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount++} AND user_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Character not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCharacter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query(
      'DELETE FROM characters WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Character not found', 404);
    }

    res.json({
      success: true,
      message: 'Character deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const uploadCharacterAsset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!req.file) {
      throw new AppError('No file provided', 400);
    }

    // Verify character belongs to user
    const charResult = await query(
      'SELECT id FROM characters WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (charResult.rows.length === 0) {
      throw new AppError('Character not found', 404);
    }

    // Upload file
    const filename = generateUniqueFilename(req.file.originalname);
    const key = await uploadFile(req.file.buffer, filename, {
      folder: `characters/${id}`,
      contentType: req.file.mimetype,
    });

    res.json({
      success: true,
      data: {
        key,
        filename,
      },
    });
  } catch (error) {
    next(error);
  }
};
