import axios from 'axios';
import { logger } from '../utils/logger';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// Eye tracking service configuration
const EYE_TRACKING_SERVICE_URL = process.env.EYE_TRACKING_SERVICE_URL || 'http://localhost:8001';

export interface EyePosition {
  x: number;
  y: number;
  z: number;
}

export interface GazeDirection {
  x: number;
  y: number;
  z: number;
}

export interface EyeTrackingFrame {
  timestamp: number;
  frameNumber: number;
  leftEye: EyePosition;
  rightEye: EyePosition;
  gazeDirection: GazeDirection;
  confidence: number;
  headPose?: {
    yaw: number;
    pitch: number;
    roll: number;
  };
}

export interface EyeTrackingConfig {
  targetPosition: EyePosition;
  correctionStrength: number; // 0.0 to 1.0
  smoothing: number; // 0.0 to 1.0
  preserveBlinking: boolean;
  framerate: number;
}

/**
 * Process video for eye tracking and gaze correction
 */
export async function processEyeTracking(
  videoStorageKey: string,
  config: EyeTrackingConfig
): Promise<EyeTrackingFrame[]> {
  try {
    logger.info(`Starting eye tracking for video: ${videoStorageKey}`);

    // Call eye tracking service (MediaPipe or custom service)
    const response = await axios.post(
      `${EYE_TRACKING_SERVICE_URL}/track`,
      {
        videoUrl: videoStorageKey,
        config: {
          detectFaces: true,
          trackEyes: true,
          trackGaze: true,
          framerate: config.framerate || 30,
        },
      },
      {
        timeout: 600000, // 10 minutes for video processing
      }
    );

    const frames: EyeTrackingFrame[] = response.data.frames;

    logger.info(`Eye tracking completed: ${frames.length} frames processed`);

    return frames;
  } catch (error) {
    logger.error('Eye tracking failed:', error);
    throw new Error('Failed to process eye tracking');
  }
}

/**
 * Apply gaze correction to tracked frames
 */
export function applyGazeCorrection(
  frames: EyeTrackingFrame[],
  config: EyeTrackingConfig
): EyeTrackingFrame[] {
  const targetPos = config.targetPosition;
  const strength = config.correctionStrength;
  const smoothing = config.smoothing;

  const correctedFrames: EyeTrackingFrame[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    // Calculate desired gaze direction toward target
    const desiredGaze = calculateGazeToTarget(
      frame.leftEye,
      frame.rightEye,
      targetPos
    );

    // Blend original gaze with desired gaze based on strength
    let correctedGaze = blendGazeDirections(
      frame.gazeDirection,
      desiredGaze,
      strength
    );

    // Apply temporal smoothing
    if (i > 0 && smoothing > 0) {
      const prevGaze = correctedFrames[i - 1].gazeDirection;
      correctedGaze = smoothGazeDirection(prevGaze, correctedGaze, smoothing);
    }

    correctedFrames.push({
      ...frame,
      gazeDirection: correctedGaze,
    });
  }

  return correctedFrames;
}

/**
 * Calculate gaze direction from eyes to target position
 */
function calculateGazeToTarget(
  leftEye: EyePosition,
  rightEye: EyePosition,
  target: EyePosition
): GazeDirection {
  // Calculate center point between eyes
  const centerX = (leftEye.x + rightEye.x) / 2;
  const centerY = (leftEye.y + rightEye.y) / 2;
  const centerZ = (leftEye.z + rightEye.z) / 2;

  // Calculate direction vector to target
  const dx = target.x - centerX;
  const dy = target.y - centerY;
  const dz = target.z - centerZ;

  // Normalize the vector
  const magnitude = Math.sqrt(dx * dx + dy * dy + dz * dz);

  return {
    x: dx / magnitude,
    y: dy / magnitude,
    z: dz / magnitude,
  };
}

/**
 * Blend two gaze directions based on strength
 */
function blendGazeDirections(
  original: GazeDirection,
  target: GazeDirection,
  strength: number
): GazeDirection {
  return {
    x: original.x * (1 - strength) + target.x * strength,
    y: original.y * (1 - strength) + target.y * strength,
    z: original.z * (1 - strength) + target.z * strength,
  };
}

/**
 * Apply temporal smoothing between frames
 */
function smoothGazeDirection(
  previous: GazeDirection,
  current: GazeDirection,
  smoothing: number
): GazeDirection {
  return {
    x: previous.x * smoothing + current.x * (1 - smoothing),
    y: previous.y * smoothing + current.y * (1 - smoothing),
    z: previous.z * smoothing + current.z * (1 - smoothing),
  };
}

/**
 * Create eye tracking record in database
 */
export async function createEyeTrackingRecord(
  videoId: string,
  userId: string,
  config: EyeTrackingConfig
): Promise<string> {
  const eyeTrackingId = uuidv4();

  await query(
    `INSERT INTO eye_tracking_data (id, video_id, user_id, target_position, correction_strength, smoothing, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      eyeTrackingId,
      videoId,
      userId,
      JSON.stringify(config.targetPosition),
      config.correctionStrength,
      config.smoothing,
      'pending',
    ]
  );

  return eyeTrackingId;
}

/**
 * Update eye tracking data with processed frames
 */
export async function updateEyeTrackingFrames(
  eyeTrackingId: string,
  frames: EyeTrackingFrame[]
): Promise<void> {
  await query(
    `UPDATE eye_tracking_data
     SET frames = $1, processed_frames = $2, total_frames = $3, status = $4, updated_at = NOW()
     WHERE id = $5`,
    [
      JSON.stringify(frames),
      frames.length,
      frames.length,
      'completed',
      eyeTrackingId,
    ]
  );

  logger.info(`Updated eye tracking record ${eyeTrackingId} with ${frames.length} frames`);
}

/**
 * Get eye tracking keyframes for UI visualization
 */
export function getEyeTrackingKeyframes(
  frames: EyeTrackingFrame[],
  interval: number = 30 // Every 30 frames
): EyeTrackingFrame[] {
  return frames.filter((_, index) => index % interval === 0);
}

/**
 * Detect and preserve blink events
 */
export function detectBlinks(frames: EyeTrackingFrame[]): Array<{ start: number; end: number }> {
  const blinks: Array<{ start: number; end: number }> = [];
  let blinkStart: number | null = null;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    // Low confidence often indicates closed eyes
    const isBlinking = frame.confidence < 0.3;

    if (isBlinking && blinkStart === null) {
      blinkStart = frame.timestamp;
    } else if (!isBlinking && blinkStart !== null) {
      blinks.push({
        start: blinkStart,
        end: frame.timestamp,
      });
      blinkStart = null;
    }
  }

  return blinks;
}

/**
 * Apply eye contact correction to video frames
 */
export async function applyEyeContactCorrection(
  videoId: string,
  eyeTrackingId: string,
  outputPath: string
): Promise<string> {
  try {
    logger.info(`Applying eye contact correction for video: ${videoId}`);

    // Get eye tracking data
    const result = await query(
      'SELECT frames, target_position FROM eye_tracking_data WHERE id = $1',
      [eyeTrackingId]
    );

    if (result.rows.length === 0) {
      throw new Error('Eye tracking data not found');
    }

    const frames: EyeTrackingFrame[] = result.rows[0].frames;

    // Call video processing service to apply corrections
    const response = await axios.post(
      `${EYE_TRACKING_SERVICE_URL}/apply-correction`,
      {
        videoId,
        frames,
        outputPath,
      },
      {
        timeout: 600000, // 10 minutes
      }
    );

    logger.info(`Eye contact correction applied: ${response.data.outputUrl}`);

    return response.data.outputUrl;
  } catch (error) {
    logger.error('Failed to apply eye contact correction:', error);
    throw error;
  }
}

/**
 * Generate eye tracking heatmap for visualization
 */
export function generateGazeHeatmap(
  frames: EyeTrackingFrame[],
  width: number,
  height: number
): number[][] {
  // Initialize heatmap grid
  const gridSize = 50;
  const heatmap: number[][] = Array(gridSize)
    .fill(0)
    .map(() => Array(gridSize).fill(0));

  // Accumulate gaze points
  frames.forEach((frame) => {
    // Project gaze onto 2D screen space (simplified)
    const x = Math.floor((frame.gazeDirection.x + 1) * (gridSize / 2));
    const y = Math.floor((frame.gazeDirection.y + 1) * (gridSize / 2));

    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
      heatmap[y][x]++;
    }
  });

  // Normalize heatmap
  const maxValue = Math.max(...heatmap.flat());
  if (maxValue > 0) {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        heatmap[y][x] = heatmap[y][x] / maxValue;
      }
    }
  }

  return heatmap;
}

/**
 * Calculate eye contact metrics
 */
export function calculateEyeContactMetrics(frames: EyeTrackingFrame[]): {
  averageConfidence: number;
  eyeContactPercentage: number;
  blinkCount: number;
  averageGazeDeviation: number;
} {
  const blinks = detectBlinks(frames);

  let totalConfidence = 0;
  let eyeContactFrames = 0;
  let totalDeviation = 0;

  const targetGaze = { x: 0, y: 0, z: 1 }; // Forward looking

  frames.forEach((frame) => {
    totalConfidence += frame.confidence;

    // Calculate gaze deviation from target
    const deviation = Math.sqrt(
      Math.pow(frame.gazeDirection.x - targetGaze.x, 2) +
        Math.pow(frame.gazeDirection.y - targetGaze.y, 2) +
        Math.pow(frame.gazeDirection.z - targetGaze.z, 2)
    );

    totalDeviation += deviation;

    // Consider eye contact if deviation is small (within 15 degrees)
    if (deviation < 0.26) {
      // ~15 degrees in radians
      eyeContactFrames++;
    }
  });

  return {
    averageConfidence: totalConfidence / frames.length,
    eyeContactPercentage: (eyeContactFrames / frames.length) * 100,
    blinkCount: blinks.length,
    averageGazeDeviation: totalDeviation / frames.length,
  };
}
