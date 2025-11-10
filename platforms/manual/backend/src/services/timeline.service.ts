import { query } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface TimelineClip {
  id: string;
  trackIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  type: 'video' | 'audio' | 'image' | 'text' | 'avatar';
  sourceAssetId?: string;
  sourceUrl?: string;
  properties: {
    position?: { x: number; y: number };
    scale?: { x: number; y: number };
    rotation?: number;
    opacity?: number;
    [key: string]: any;
  };
  effects: Array<{
    type: string;
    params: Record<string, any>;
  }>;
  transitions: {
    in?: { type: string; duration: number };
    out?: { type: string; duration: number };
  };
  volume: number;
  muted: boolean;
  zIndex: number;
}

export interface TimelineState {
  clips: TimelineClip[];
  duration: number;
  fps: number;
  resolution: { width: number; height: number };
}

/**
 * Create a timeline clip
 */
export async function createTimelineClip(
  videoId: string,
  userId: string,
  clipData: Partial<TimelineClip>
): Promise<TimelineClip> {
  const clipId = uuidv4();

  const result = await query(
    `INSERT INTO timeline_clips (
      id, video_id, user_id, track_index, start_time, end_time, duration,
      type, source_asset_id, source_url, properties, effects, transitions,
      volume, muted, z_index, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
    RETURNING *`,
    [
      clipId,
      videoId,
      userId,
      clipData.trackIndex || 0,
      clipData.startTime,
      clipData.endTime,
      clipData.duration || (clipData.endTime! - clipData.startTime!),
      clipData.type,
      clipData.sourceAssetId || null,
      clipData.sourceUrl || null,
      JSON.stringify(clipData.properties || {}),
      JSON.stringify(clipData.effects || []),
      JSON.stringify(clipData.transitions || {}),
      clipData.volume !== undefined ? clipData.volume : 1.0,
      clipData.muted || false,
      clipData.zIndex || 0,
    ]
  );

  return parseClipFromRow(result.rows[0]);
}

/**
 * Get all clips for a video
 */
export async function getTimelineClips(videoId: string): Promise<TimelineClip[]> {
  const result = await query(
    `SELECT * FROM timeline_clips WHERE video_id = $1 ORDER BY track_index, start_time`,
    [videoId]
  );

  return result.rows.map(parseClipFromRow);
}

/**
 * Update a timeline clip
 */
export async function updateTimelineClip(
  clipId: string,
  updates: Partial<TimelineClip>
): Promise<TimelineClip> {
  const setFields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (updates.trackIndex !== undefined) {
    setFields.push(`track_index = $${paramCount++}`);
    values.push(updates.trackIndex);
  }
  if (updates.startTime !== undefined) {
    setFields.push(`start_time = $${paramCount++}`);
    values.push(updates.startTime);
  }
  if (updates.endTime !== undefined) {
    setFields.push(`end_time = $${paramCount++}`);
    values.push(updates.endTime);
  }
  if (updates.duration !== undefined) {
    setFields.push(`duration = $${paramCount++}`);
    values.push(updates.duration);
  }
  if (updates.properties !== undefined) {
    setFields.push(`properties = $${paramCount++}`);
    values.push(JSON.stringify(updates.properties));
  }
  if (updates.effects !== undefined) {
    setFields.push(`effects = $${paramCount++}`);
    values.push(JSON.stringify(updates.effects));
  }
  if (updates.transitions !== undefined) {
    setFields.push(`transitions = $${paramCount++}`);
    values.push(JSON.stringify(updates.transitions));
  }
  if (updates.volume !== undefined) {
    setFields.push(`volume = $${paramCount++}`);
    values.push(updates.volume);
  }
  if (updates.muted !== undefined) {
    setFields.push(`muted = $${paramCount++}`);
    values.push(updates.muted);
  }
  if (updates.zIndex !== undefined) {
    setFields.push(`z_index = $${paramCount++}`);
    values.push(updates.zIndex);
  }

  setFields.push(`updated_at = NOW()`);
  values.push(clipId);

  const result = await query(
    `UPDATE timeline_clips SET ${setFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );

  return parseClipFromRow(result.rows[0]);
}

/**
 * Delete a timeline clip
 */
export async function deleteTimelineClip(clipId: string): Promise<void> {
  await query('DELETE FROM timeline_clips WHERE id = $1', [clipId]);
}

/**
 * Duplicate a timeline clip
 */
export async function duplicateTimelineClip(
  clipId: string,
  offsetTime?: number
): Promise<TimelineClip> {
  const result = await query('SELECT * FROM timeline_clips WHERE id = $1', [clipId]);

  if (result.rows.length === 0) {
    throw new Error('Clip not found');
  }

  const originalClip = parseClipFromRow(result.rows[0]);
  const offset = offsetTime || originalClip.duration;

  return createTimelineClip(result.rows[0].video_id, result.rows[0].user_id, {
    ...originalClip,
    startTime: originalClip.startTime + offset,
    endTime: originalClip.endTime + offset,
  });
}

/**
 * Trim a clip (adjust start/end times)
 */
export async function trimClip(
  clipId: string,
  newStartTime: number,
  newEndTime: number
): Promise<TimelineClip> {
  const duration = newEndTime - newStartTime;

  return updateTimelineClip(clipId, {
    startTime: newStartTime,
    endTime: newEndTime,
    duration,
  });
}

/**
 * Split a clip at a specific time
 */
export async function splitClip(
  clipId: string,
  splitTime: number
): Promise<[TimelineClip, TimelineClip]> {
  const result = await query('SELECT * FROM timeline_clips WHERE id = $1', [clipId]);

  if (result.rows.length === 0) {
    throw new Error('Clip not found');
  }

  const originalClip = parseClipFromRow(result.rows[0]);

  if (splitTime <= originalClip.startTime || splitTime >= originalClip.endTime) {
    throw new Error('Split time must be within clip bounds');
  }

  // Update original clip to end at split time
  const firstClip = await updateTimelineClip(clipId, {
    endTime: splitTime,
    duration: splitTime - originalClip.startTime,
  });

  // Create second clip from split time to original end
  const secondClip = await createTimelineClip(
    result.rows[0].video_id,
    result.rows[0].user_id,
    {
      ...originalClip,
      startTime: splitTime,
      endTime: originalClip.endTime,
      duration: originalClip.endTime - splitTime,
    }
  );

  return [firstClip, secondClip];
}

/**
 * Detect collisions between clips on the same track
 */
export function detectClipCollisions(clips: TimelineClip[]): Array<{
  clip1: TimelineClip;
  clip2: TimelineClip;
  overlapStart: number;
  overlapEnd: number;
}> {
  const collisions: Array<{
    clip1: TimelineClip;
    clip2: TimelineClip;
    overlapStart: number;
    overlapEnd: number;
  }> = [];

  // Group clips by track
  const trackGroups = new Map<number, TimelineClip[]>();
  clips.forEach((clip) => {
    if (!trackGroups.has(clip.trackIndex)) {
      trackGroups.set(clip.trackIndex, []);
    }
    trackGroups.get(clip.trackIndex)!.push(clip);
  });

  // Check for collisions within each track
  trackGroups.forEach((trackClips) => {
    for (let i = 0; i < trackClips.length; i++) {
      for (let j = i + 1; j < trackClips.length; j++) {
        const clip1 = trackClips[i];
        const clip2 = trackClips[j];

        const overlapStart = Math.max(clip1.startTime, clip2.startTime);
        const overlapEnd = Math.min(clip1.endTime, clip2.endTime);

        if (overlapStart < overlapEnd) {
          collisions.push({ clip1, clip2, overlapStart, overlapEnd });
        }
      }
    }
  });

  return collisions;
}

/**
 * Auto-arrange clips to avoid collisions
 */
export function autoArrangeClips(clips: TimelineClip[]): TimelineClip[] {
  // Sort clips by start time
  const sorted = [...clips].sort((a, b) => a.startTime - b.startTime);

  // Track end times for each track
  const trackEndTimes = new Map<number, number>();

  return sorted.map((clip) => {
    const trackEnd = trackEndTimes.get(clip.trackIndex) || 0;

    if (clip.startTime < trackEnd) {
      // Move clip to start after previous clip on this track
      const offset = trackEnd - clip.startTime;
      clip.startTime = trackEnd;
      clip.endTime += offset;
    }

    trackEndTimes.set(clip.trackIndex, clip.endTime);

    return clip;
  });
}

/**
 * Calculate total timeline duration
 */
export function calculateTimelineDuration(clips: TimelineClip[]): number {
  if (clips.length === 0) return 0;
  return Math.max(...clips.map((clip) => clip.endTime));
}

/**
 * Snap time to grid (for UI)
 */
export function snapToGrid(time: number, gridSize: number = 0.1): number {
  return Math.round(time / gridSize) * gridSize;
}

/**
 * Get clips at a specific time
 */
export function getClipsAtTime(clips: TimelineClip[], time: number): TimelineClip[] {
  return clips.filter((clip) => time >= clip.startTime && time < clip.endTime);
}

/**
 * Export timeline to video editing format
 */
export function exportTimelineToFormat(
  clips: TimelineClip[],
  format: 'ffmpeg' | 'premiere' | 'json'
): string {
  switch (format) {
    case 'ffmpeg':
      return exportToFFmpegCommands(clips);
    case 'json':
      return JSON.stringify(clips, null, 2);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Generate FFmpeg commands for timeline
 */
function exportToFFmpegCommands(clips: TimelineClip[]): string {
  const commands: string[] = [];

  // Group clips by track for compositing
  const tracks = new Map<number, TimelineClip[]>();
  clips.forEach((clip) => {
    if (!tracks.has(clip.trackIndex)) {
      tracks.set(clip.trackIndex, []);
    }
    tracks.get(clip.trackIndex)!.push(clip);
  });

  // Generate filter complex for each track
  const filters: string[] = [];
  tracks.forEach((trackClips, trackIndex) => {
    trackClips.forEach((clip, clipIndex) => {
      const inputLabel = `[${trackIndex}:${clipIndex}]`;

      // Apply trim
      filters.push(
        `${inputLabel}trim=start=${clip.startTime}:end=${clip.endTime},setpts=PTS-STARTPTS[v${trackIndex}_${clipIndex}]`
      );

      // Apply effects
      clip.effects.forEach((effect) => {
        // Add effect filters based on type
      });
    });
  });

  return filters.join(';\n');
}

/**
 * Parse clip from database row
 */
function parseClipFromRow(row: any): TimelineClip {
  return {
    id: row.id,
    trackIndex: row.track_index,
    startTime: parseFloat(row.start_time),
    endTime: parseFloat(row.end_time),
    duration: parseFloat(row.duration),
    type: row.type,
    sourceAssetId: row.source_asset_id,
    sourceUrl: row.source_url,
    properties: row.properties || {},
    effects: row.effects || [],
    transitions: row.transitions || {},
    volume: parseFloat(row.volume),
    muted: row.muted,
    zIndex: row.z_index,
  };
}

/**
 * Validate timeline structure
 */
export function validateTimeline(clips: TimelineClip[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  clips.forEach((clip, index) => {
    // Check time validity
    if (clip.startTime < 0) {
      errors.push(`Clip ${index}: Start time cannot be negative`);
    }
    if (clip.endTime <= clip.startTime) {
      errors.push(`Clip ${index}: End time must be after start time`);
    }
    if (clip.duration !== clip.endTime - clip.startTime) {
      errors.push(`Clip ${index}: Duration mismatch`);
    }

    // Check required fields
    if (!clip.type) {
      errors.push(`Clip ${index}: Missing type`);
    }
    if (!clip.sourceAssetId && !clip.sourceUrl && clip.type !== 'text') {
      errors.push(`Clip ${index}: Missing source`);
    }

    // Check volume
    if (clip.volume < 0 || clip.volume > 2) {
      errors.push(`Clip ${index}: Volume out of range (0-2)`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
