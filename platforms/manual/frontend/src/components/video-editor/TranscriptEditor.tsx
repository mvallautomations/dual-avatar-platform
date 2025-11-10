'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Download, Save, RefreshCw } from 'lucide-react';

interface TranscriptionSegment {
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

interface TranscriptEditorProps {
  videoId: string;
  transcription?: {
    id: string;
    segments: TranscriptionSegment[];
    status: string;
  };
  onUpdate?: (segments: TranscriptionSegment[]) => void;
}

export function TranscriptEditor({ videoId, transcription, onUpdate }: TranscriptEditorProps) {
  const [segments, setSegments] = useState<TranscriptionSegment[]>(
    transcription?.segments || []
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync current segment with playback time
  useEffect(() => {
    const activeSegment = segments.find(
      (seg) => currentTime >= seg.start && currentTime < seg.end
    );
    setActiveSegmentId(activeSegment?.id || null);
  }, [currentTime, segments]);

  const handleTextChange = (id: number, newText: string) => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === id ? { ...seg, text: newText } : seg))
    );
    setHasChanges(true);
  };

  const handleTimeChange = (id: number, field: 'start' | 'end', value: number) => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === id ? { ...seg, [field]: value } : seg))
    );
    setHasChanges(true);
  };

  const handleSegmentClick = (startTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = startTime;
      setCurrentTime(startTime);
    }
  };

  const handleSave = () => {
    onUpdate?.(segments);
    setHasChanges(false);
  };

  const handleExport = async (format: 'srt' | 'vtt' | 'txt') => {
    // Call API to export transcription
    const response = await fetch(
      `/api/v1/transcriptions/${transcription?.id}/export?format=${format}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    );

    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcription.${format}`;
      a.click();
    }
  };

  const handleGenerateSubtitles = async () => {
    // Call API to generate subtitles
    await fetch(`/api/v1/transcriptions/${transcription?.id}/subtitles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        maxCharsPerLine: 42,
        maxDuration: 5,
      }),
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  if (!transcription) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading transcription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExport('srt')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export SRT
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExport('vtt')}
          >
            Export VTT
          </Button>
          <Button size="sm" variant="outline" onClick={handleGenerateSubtitles}>
            Generate Subtitles
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Transcript segments */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {segments.map((segment) => (
          <div
            key={segment.id}
            className={`p-4 rounded-lg border transition-colors cursor-pointer ${
              activeSegmentId === segment.id
                ? 'bg-blue-50 border-blue-300'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleSegmentClick(segment.start)}
          >
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-end gap-1 text-xs text-gray-500 min-w-[80px]">
                <input
                  type="number"
                  value={segment.start.toFixed(2)}
                  onChange={(e) =>
                    handleTimeChange(segment.id, 'start', parseFloat(e.target.value))
                  }
                  className="w-full px-2 py-1 border rounded text-center"
                  step="0.1"
                  onClick={(e) => e.stopPropagation()}
                />
                <span>→</span>
                <input
                  type="number"
                  value={segment.end.toFixed(2)}
                  onChange={(e) =>
                    handleTimeChange(segment.id, 'end', parseFloat(e.target.value))
                  }
                  className="w-full px-2 py-1 border rounded text-center"
                  step="0.1"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <textarea
                value={segment.text}
                onChange={(e) => handleTextChange(segment.id, e.target.value)}
                className="flex-1 p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Word-level timestamps */}
            {segment.words && (
              <div className="mt-2 flex flex-wrap gap-1">
                {segment.words.map((word, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-1 text-xs rounded ${
                      currentTime >= word.start && currentTime < word.end
                        ? 'bg-blue-200'
                        : 'bg-gray-100'
                    }`}
                    title={`${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s (${(
                      word.confidence * 100
                    ).toFixed(0)}%)`}
                  >
                    {word.word}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hidden audio player for syncing */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
}
