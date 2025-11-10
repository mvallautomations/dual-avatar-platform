import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import { logger } from '../utils/logger';
import { query } from '../config/database';
import { downloadFile } from '../utils/storage';
import { v4 as uuidv4 } from 'uuid';

// Whisper AI Configuration
const WHISPER_API_URL = process.env.WHISPER_API_URL || 'http://localhost:9000/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface TranscriptionSegment {
  id: number;
  text: string;
  start: number;
  end: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[];
  fullText: string;
  duration: number;
  language: string;
  confidence: number;
}

/**
 * Transcribe audio using Whisper AI (local or OpenAI)
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  language: string = 'en',
  useLocal: boolean = true
): Promise<TranscriptionResult> {
  try {
    if (useLocal) {
      return await transcribeWithLocalWhisper(audioBuffer, language);
    } else {
      return await transcribeWithOpenAI(audioBuffer, language);
    }
  } catch (error) {
    logger.error('Transcription failed:', error);
    throw new Error('Failed to transcribe audio');
  }
}

/**
 * Transcribe using local Whisper API (faster-whisper or whisper.cpp)
 */
async function transcribeWithLocalWhisper(
  audioBuffer: Buffer,
  language: string
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('file', Readable.from(audioBuffer), {
    filename: 'audio.mp3',
    contentType: 'audio/mpeg',
  });
  formData.append('language', language);
  formData.append('word_timestamps', 'true');
  formData.append('response_format', 'verbose_json');

  const response = await axios.post(`${WHISPER_API_URL}/audio/transcriptions`, formData, {
    headers: formData.getHeaders(),
    timeout: 300000, // 5 minutes
  });

  const data = response.data;

  // Parse segments with word-level timestamps
  const segments: TranscriptionSegment[] = data.segments?.map((seg: any) => ({
    id: seg.id,
    text: seg.text.trim(),
    start: seg.start,
    end: seg.end,
    words: seg.words?.map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.probability || 1.0,
    })),
  })) || [];

  return {
    segments,
    fullText: data.text,
    duration: data.duration,
    language: data.language || language,
    confidence: calculateAverageConfidence(segments),
  };
}

/**
 * Transcribe using OpenAI's Whisper API
 */
async function transcribeWithOpenAI(
  audioBuffer: Buffer,
  language: string
): Promise<TranscriptionResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const formData = new FormData();
  formData.append('file', Readable.from(audioBuffer), {
    filename: 'audio.mp3',
    contentType: 'audio/mpeg',
  });
  formData.append('model', 'whisper-1');
  formData.append('language', language);
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');

  const response = await axios.post(
    'https://api.openai.com/v1/audio/transcriptions',
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      timeout: 300000,
    }
  );

  const data = response.data;

  const segments: TranscriptionSegment[] = data.segments?.map((seg: any, idx: number) => ({
    id: idx,
    text: seg.text.trim(),
    start: seg.start,
    end: seg.end,
    words: seg.words?.map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: 1.0,
    })),
  })) || [];

  return {
    segments,
    fullText: data.text,
    duration: data.duration || segments[segments.length - 1]?.end || 0,
    language: data.language || language,
    confidence: 1.0,
  };
}

/**
 * Calculate average confidence across all words
 */
function calculateAverageConfidence(segments: TranscriptionSegment[]): number {
  let totalConfidence = 0;
  let wordCount = 0;

  segments.forEach((seg) => {
    seg.words?.forEach((word) => {
      totalConfidence += word.confidence;
      wordCount++;
    });
  });

  return wordCount > 0 ? totalConfidence / wordCount : 1.0;
}

/**
 * Create transcription record in database
 */
export async function createTranscription(
  videoId: string,
  userId: string,
  audioStorageKey: string,
  language: string = 'en'
): Promise<string> {
  const transcriptionId = uuidv4();
  const startTime = Date.now();

  try {
    // Create initial record
    await query(
      `INSERT INTO transcriptions (id, video_id, user_id, language, status, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [transcriptionId, videoId, userId, language, 'processing']
    );

    // Download audio file
    logger.info(`Downloading audio for transcription: ${audioStorageKey}`);
    const audioBuffer = await downloadFile(audioStorageKey);

    // Transcribe
    logger.info(`Starting transcription for video: ${videoId}`);
    const result = await transcribeAudio(audioBuffer, language);

    const processingTime = Date.now() - startTime;

    // Update with results
    await query(
      `UPDATE transcriptions
       SET segments = $1, full_text = $2, duration = $3, word_count = $4,
           confidence_score = $5, status = $6, processing_time = $7,
           model = $8, updated_at = NOW()
       WHERE id = $9`,
      [
        JSON.stringify(result.segments),
        result.fullText,
        result.duration,
        countWords(result.fullText),
        result.confidence,
        'completed',
        processingTime,
        'whisper-large-v3',
        transcriptionId,
      ]
    );

    logger.info(`Transcription completed for video: ${videoId} in ${processingTime}ms`);

    return transcriptionId;
  } catch (error) {
    logger.error(`Transcription failed for video: ${videoId}`, error);

    // Mark as failed
    await query(
      `UPDATE transcriptions SET status = $1, updated_at = NOW() WHERE id = $2`,
      ['failed', transcriptionId]
    );

    throw error;
  }
}

/**
 * Update transcription segments (for manual editing)
 */
export async function updateTranscriptionSegments(
  transcriptionId: string,
  segments: TranscriptionSegment[]
): Promise<void> {
  const fullText = segments.map((s) => s.text).join(' ');
  const wordCount = countWords(fullText);

  await query(
    `UPDATE transcriptions
     SET segments = $1, full_text = $2, word_count = $3, updated_at = NOW()
     WHERE id = $4`,
    [JSON.stringify(segments), fullText, wordCount, transcriptionId]
  );
}

/**
 * Generate subtitles from transcription
 */
export async function generateSubtitles(
  transcriptionId: string,
  videoId: string,
  maxCharsPerLine: number = 42,
  maxDuration: number = 5
): Promise<string> {
  // Get transcription
  const result = await query('SELECT segments FROM transcriptions WHERE id = $1', [
    transcriptionId,
  ]);

  if (result.rows.length === 0) {
    throw new Error('Transcription not found');
  }

  const segments: TranscriptionSegment[] = result.rows[0].segments;

  // Create subtitle entries with smart line breaking
  const entries = createSubtitleEntries(segments, maxCharsPerLine, maxDuration);

  // Create subtitle track
  const subtitleTrackId = uuidv4();
  await query(
    `INSERT INTO subtitle_tracks (id, video_id, transcription_id, name, language, is_default, entries, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      subtitleTrackId,
      videoId,
      transcriptionId,
      'Default',
      'en',
      true,
      JSON.stringify(entries),
    ]
  );

  return subtitleTrackId;
}

/**
 * Create subtitle entries with smart line breaking
 */
function createSubtitleEntries(
  segments: TranscriptionSegment[],
  maxCharsPerLine: number,
  maxDuration: number
): Array<{ start: number; end: number; text: string }> {
  const entries: Array<{ start: number; end: number; text: string }> = [];

  for (const segment of segments) {
    const words = segment.words || [];
    if (words.length === 0) continue;

    let currentEntry = {
      start: words[0].start,
      end: words[0].end,
      text: words[0].word,
    };

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const duration = word.end - currentEntry.start;
      const newText = `${currentEntry.text} ${word.word}`;

      // Check if we should start a new entry
      if (
        newText.length > maxCharsPerLine ||
        duration > maxDuration
      ) {
        entries.push({ ...currentEntry });
        currentEntry = {
          start: word.start,
          end: word.end,
          text: word.word,
        };
      } else {
        currentEntry.text = newText;
        currentEntry.end = word.end;
      }
    }

    // Add the last entry
    if (currentEntry.text) {
      entries.push(currentEntry);
    }
  }

  return entries;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Export transcription to various formats
 */
export function exportTranscription(
  segments: TranscriptionSegment[],
  format: 'srt' | 'vtt' | 'txt' | 'json'
): string {
  switch (format) {
    case 'srt':
      return exportToSRT(segments);
    case 'vtt':
      return exportToVTT(segments);
    case 'txt':
      return segments.map((s) => s.text).join(' ');
    case 'json':
      return JSON.stringify(segments, null, 2);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function exportToSRT(segments: TranscriptionSegment[]): string {
  return segments
    .map((seg, idx) => {
      const start = formatTimestamp(seg.start, 'srt');
      const end = formatTimestamp(seg.end, 'srt');
      return `${idx + 1}\n${start} --> ${end}\n${seg.text}\n`;
    })
    .join('\n');
}

function exportToVTT(segments: TranscriptionSegment[]): string {
  const header = 'WEBVTT\n\n';
  const cues = segments
    .map((seg) => {
      const start = formatTimestamp(seg.start, 'vtt');
      const end = formatTimestamp(seg.end, 'vtt');
      return `${start} --> ${end}\n${seg.text}\n`;
    })
    .join('\n');
  return header + cues;
}

function formatTimestamp(seconds: number, format: 'srt' | 'vtt'): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const separator = format === 'srt' ? ',' : '.';

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)}${separator}${pad(ms, 3)}`;
}

function pad(num: number, size: number): string {
  return num.toString().padStart(size, '0');
}
