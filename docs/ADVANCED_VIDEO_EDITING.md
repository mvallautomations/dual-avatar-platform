# Advanced Video Editing Features

This document describes the advanced video editing capabilities in the Dual Avatar Platform, including audio transcription editing, eye contact mapping, and timeline-based editing.

## Table of Contents

- [Audio Transcription & Editing](#audio-transcription--editing)
- [Eye Contact Mapping](#eye-contact-mapping)
- [Timeline Editor](#timeline-editor)
- [API Reference](#api-reference)

## Audio Transcription & Editing

### Overview

The platform includes powerful audio transcription capabilities powered by Whisper AI, allowing you to:

- Automatically transcribe video audio with word-level timestamps
- Edit transcriptions with synchronized playback
- Generate subtitles/captions automatically
- Export transcriptions in multiple formats (SRT, VTT, TXT, JSON)

### Features

#### Word-Level Timestamps

Each transcription includes precise word-level timing information:

```json
{
  "id": 1,
  "text": "Hello, welcome to the video.",
  "start": 0.5,
  "end": 2.3,
  "words": [
    { "word": "Hello", "start": 0.5, "end": 0.8, "confidence": 0.98 },
    { "word": "welcome", "start": 0.9, "end": 1.2, "confidence": 0.95 },
    { "word": "to", "start": 1.25, "end": 1.35, "confidence": 0.99 },
    { "word": "the", "start": 1.4, "end": 1.5, "confidence": 0.97 },
    { "word": "video", "start": 1.55, "end": 2.3, "confidence": 0.96 }
  ]
}
```

#### Manual Editing

- Edit transcription text while maintaining timing
- Adjust start/end times for each segment
- Click segments to jump to that point in the video
- Real-time visual feedback of current playback position

#### Subtitle Generation

Automatically generate subtitles with smart line breaking:

```javascript
// Generate subtitles from transcription
await api.generateSubtitles(transcriptionId, {
  maxCharsPerLine: 42,  // Max characters per line
  maxDuration: 5,        // Max duration per subtitle (seconds)
});
```

#### Export Formats

- **SRT**: Standard SubRip format
- **VTT**: WebVTT format for web players
- **TXT**: Plain text transcript
- **JSON**: Full structured data

### Usage Example

```typescript
// 1. Create transcription
const { data } = await api.createTranscription(videoId, {
  audioStorageKey: 'videos/abc123/audio.mp3',
  language: 'en',
});

// 2. Wait for processing (status changes to 'completed')
const transcription = await api.getTranscription(videoId);

// 3. Edit segments if needed
const updatedSegments = transcription.segments.map(seg => ({
  ...seg,
  text: seg.text.replace('um', ''),  // Remove filler words
}));
await api.updateTranscription(transcription.id, updatedSegments);

// 4. Generate subtitles
await api.generateSubtitles(transcription.id);

// 5. Export
await api.exportTranscription(transcription.id, 'srt');
```

---

## Eye Contact Mapping

### Overview

Eye contact mapping uses computer vision to track and correct eye gaze in videos, ensuring avatars look directly at the camera/viewer. This creates more engaging and professional-looking videos.

### Features

#### Gaze Tracking

- Detects eye positions in every frame
- Tracks gaze direction with 3D coordinates
- Identifies blink events automatically
- Provides confidence scores for each detection

#### Gaze Correction

Intelligently redirects gaze toward a target position (typically the camera):

```javascript
await api.startEyeTracking(videoId, {
  videoStorageKey: 'videos/abc123/video.mp4',
  targetPosition: { x: 0, y: 0, z: 1 },  // Camera position
  correctionStrength: 1.0,                // 0-1, how much to correct
  smoothing: 0.5,                         // 0-1, temporal smoothing
  preserveBlinking: true,
  framerate: 30,
});
```

#### Parameters

- **Target Position**: 3D coordinates where eyes should look (camera position)
  - `x`: Horizontal offset
  - `y`: Vertical offset
  - `z`: Depth (typically 1.0 for straight ahead)

- **Correction Strength**: 0.0 to 1.0
  - `0.0`: No correction (original gaze)
  - `0.5`: 50% blend between original and corrected
  - `1.0`: Full correction to target

- **Smoothing**: 0.0 to 1.0
  - `0.0`: No temporal smoothing (may look jittery)
  - `0.5`: Moderate smoothing
  - `1.0`: Maximum smoothing (very smooth but less responsive)

#### Eye Contact Metrics

Get analytics about eye contact quality:

```javascript
const metrics = await api.getEyeContactMetrics(videoId);

console.log(metrics);
// {
//   averageConfidence: 0.92,         // How confident the detection is
//   eyeContactPercentage: 78.5,      // % of time making eye contact
//   blinkCount: 45,                  // Number of blinks detected
//   averageGazeDeviation: 12.3       // Average degrees off-target
// }
```

#### Gaze Heatmap

Visualize where the person is looking throughout the video:

```javascript
const heatmap = await api.getGazeHeatmap(videoId, 1920, 1080);
// Returns 2D array of gaze density values
```

### Usage Example

```typescript
// 1. Start eye tracking
const { data } = await api.startEyeTracking(videoId, {
  videoStorageKey: 'videos/abc123/video.mp4',
  targetPosition: { x: 0, y: 0, z: 1 },
  correctionStrength: 0.8,
  smoothing: 0.6,
});

// 2. Wait for processing
// (You'll receive WebSocket notifications when complete)

// 3. Check metrics
const metrics = await api.getEyeContactMetrics(videoId);
console.log(`Eye contact: ${metrics.eyeContactPercentage}%`);

// 4. Adjust settings if needed
await api.updateEyeTrackingConfig(eyeTrackingId, {
  correctionStrength: 1.0,  // Increase correction
});

// 5. Apply correction to video
await api.applyEyeCorrection(videoId, {
  eyeTrackingId,
  outputPath: 'videos/abc123/corrected.mp4',
});
```

###  Best Practices

1. **Start with moderate correction**: Begin with `correctionStrength: 0.7` and adjust
2. **Use smoothing**: Set `smoothing: 0.5-0.6` to avoid jittery movements
3. **Preserve blinks**: Always set `preserveBlinking: true` for natural results
4. **Check metrics first**: Review eye contact percentage before applying correction
5. **Iterate**: Fine-tune settings based on the specific video content

---

## Timeline Editor

### Overview

The timeline editor provides a professional multi-track editing interface for precise video composition.

### Features

#### Multi-Track Editing

- Unlimited video/audio/image/text tracks
- Drag-and-drop clip positioning
- Precise timeline scrubbing
- Zoom in/out for detailed editing

#### Clip Operations

##### Create Clip

```javascript
await api.createClip(videoId, {
  type: 'video',
  startTime: 0,
  endTime: 10.5,
  trackIndex: 0,
  sourceAssetId: 'asset-uuid',
  properties: {
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    opacity: 1.0,
  },
});
```

##### Trim Clip

```javascript
// Trim clip to new start/end times
await api.trimClip(clipId, 2.5, 8.0);
```

##### Split Clip

```javascript
// Split at specific time
const { firstClip, secondClip } = await api.splitClip(clipId, 5.0);
```

##### Duplicate Clip

```javascript
// Duplicate with time offset
await api.duplicateClip(clipId, 1.0);  // 1 second after original
```

#### Collision Detection

Automatically detect overlapping clips on the same track:

```javascript
const { collisions } = await api.checkCollisions(videoId);

collisions.forEach(collision => {
  console.log(`Clip ${collision.clip1.id} overlaps ${collision.clip2.id}`);
  console.log(`Overlap: ${collision.overlapStart}s to ${collision.overlapEnd}s`);
});
```

#### Auto-Arrange

Automatically arrange clips to remove overlaps:

```javascript
await api.arrangeClips(videoId);
// Clips will be repositioned to avoid collisions
```

#### Validation

Validate timeline structure:

```javascript
const { valid, errors } = await api.validateTimeline(videoId);

if (!valid) {
  errors.forEach(error => console.error(error));
}
```

### Clip Properties

Each clip supports extensive customization:

```javascript
{
  properties: {
    // Position and transform
    position: { x: 100, y: 50 },      // Pixels from top-left
    scale: { x: 1.5, y: 1.5 },        // Scale multipliers
    rotation: 45,                       // Degrees
    opacity: 0.8,                       // 0-1

    // Crop
    crop: {
      top: 10,
      bottom: 10,
      left: 20,
      right: 20,
    },
  },

  // Effects
  effects: [
    {
      type: 'blur',
      params: { radius: 5 },
    },
    {
      type: 'colorGrade',
      params: { brightness: 1.2, contrast: 1.1, saturation: 1.05 },
    },
  ],

  // Transitions
  transitions: {
    in: { type: 'fade', duration: 0.5 },
    out: { type: 'fade', duration: 0.5 },
  },

  // Audio
  volume: 0.8,
  muted: false,
}
```

### Usage Example

```typescript
// 1. Get current timeline
const { clips, duration } = await api.getTimeline(videoId);

// 2. Add new clip
await api.createClip(videoId, {
  type: 'video',
  startTime: 0,
  endTime: 5,
  trackIndex: 0,
  sourceAssetId: assetId,
});

// 3. Add audio track
await api.createClip(videoId, {
  type: 'audio',
  startTime: 0,
  endTime: 15,
  trackIndex: 1,
  sourceAssetId: audioAssetId,
  volume: 0.7,
});

// 4. Add text overlay
await api.createClip(videoId, {
  type: 'text',
  startTime: 2,
  endTime: 5,
  trackIndex: 2,
  properties: {
    text: 'Welcome!',
    fontSize: 48,
    color: '#FFFFFF',
    position: { x: 960, y: 540 },
  },
});

// 5. Check for issues
const { valid, errors } = await api.validateTimeline(videoId);

// 6. Export timeline for FFmpeg
await api.exportTimeline(videoId, 'ffmpeg');
```

---

## API Reference

### Transcription Endpoints

```
POST   /api/v1/transcriptions/video/:videoId
GET    /api/v1/transcriptions/video/:videoId
PUT    /api/v1/transcriptions/:transcriptionId
POST   /api/v1/transcriptions/:transcriptionId/subtitles
GET    /api/v1/transcriptions/:transcriptionId/export
GET    /api/v1/transcriptions/subtitles/video/:videoId
PUT    /api/v1/transcriptions/subtitles/:trackId
```

### Eye Tracking Endpoints

```
POST   /api/v1/eye-tracking/video/:videoId
GET    /api/v1/eye-tracking/video/:videoId
PUT    /api/v1/eye-tracking/:eyeTrackingId
POST   /api/v1/eye-tracking/video/:videoId/apply
GET    /api/v1/eye-tracking/video/:videoId/metrics
GET    /api/v1/eye-tracking/video/:videoId/heatmap
```

### Timeline Endpoints

```
GET    /api/v1/timeline/video/:videoId
POST   /api/v1/timeline/video/:videoId/clips
PUT    /api/v1/timeline/clips/:clipId
DELETE /api/v1/timeline/clips/:clipId
POST   /api/v1/timeline/clips/:clipId/duplicate
POST   /api/v1/timeline/clips/:clipId/trim
POST   /api/v1/timeline/clips/:clipId/split
GET    /api/v1/timeline/video/:videoId/collisions
POST   /api/v1/timeline/video/:videoId/arrange
GET    /api/v1/timeline/video/:videoId/validate
GET    /api/v1/timeline/video/:videoId/export
PUT    /api/v1/timeline/video/:videoId/bulk
```

---

## Frontend Components

### TranscriptEditor

```tsx
import { TranscriptEditor } from '@/components/video-editor/TranscriptEditor';

<TranscriptEditor
  videoId={videoId}
  transcription={transcription}
  onUpdate={handleUpdate}
/>
```

### TimelineEditor

```tsx
import { TimelineEditor } from '@/components/video-editor/TimelineEditor';

<TimelineEditor
  videoId={videoId}
  clips={clips}
  duration={duration}
  onUpdate={handleUpdate}
/>
```

### EyeContactControls

```tsx
import { EyeContactControls } from '@/components/video-editor/EyeContactControls';

<EyeContactControls
  videoId={videoId}
  videoStorageKey={storageKey}
  onApply={handleApply}
/>
```

---

## Database Schema

The advanced editing features use the following database tables:

- `transcriptions`: Stores transcription data with segments and word-level timestamps
- `eye_tracking_data`: Stores eye tracking frames and configuration
- `timeline_clips`: Stores timeline clips with properties and effects
- `subtitle_tracks`: Stores subtitle/caption tracks
- `audio_segments`: Stores audio segment data for fine-grained editing

See `migrations/002_advanced_video_editing.sql` for full schema details.

---

## Performance Considerations

### Transcription

- Processing time: ~1-2x real-time (5-minute video takes 5-10 minutes)
- Supports local Whisper or OpenAI API
- Consider using local Whisper for high-volume processing

### Eye Tracking

- Processing time: ~3-5x real-time (depends on video resolution)
- GPU acceleration strongly recommended
- Keyframe-only mode available for UI preview (much faster)

### Timeline

- Optimized for up to 100 clips per video
- Use pagination for very large timelines
- Bulk update API available for multiple clip changes

---

## Troubleshooting

### Transcription Issues

**Problem**: Transcription stuck in "processing" status
- **Solution**: Check Whisper service logs, ensure audio file is accessible

**Problem**: Poor transcription accuracy
- **Solution**: Verify audio quality, try specifying correct language, consider using OpenAI API

### Eye Tracking Issues

**Problem**: Eye tracking fails to detect eyes
- **Solution**: Ensure video has clear facial visibility, adequate lighting

**Problem**: Correction looks unnatural
- **Solution**: Reduce `correctionStrength` to 0.6-0.8, increase `smoothing` to 0.6-0.7

### Timeline Issues

**Problem**: Clips overlapping unexpectedly
- **Solution**: Use collision detection API, run auto-arrange

**Problem**: Video rendering fails
- **Solution**: Validate timeline first, check for missing assets

---

## Future Enhancements

Planned features for future releases:

- Real-time collaborative editing
- AI-powered scene detection
- Automatic B-roll suggestions
- Voice cloning integration
- Advanced color grading
- Motion tracking and stabilization
- Green screen keying
- Multi-camera angle switching

---

For more information, see:
- [Getting Started Guide](../GETTING_STARTED.md)
- [API Documentation](./api/)
- [Architecture Overview](./architecture/)
