'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  Scissors,
  Copy,
  Trash2,
  Plus,
  ZoomIn,
  ZoomOut,
  Grid,
} from 'lucide-react';

interface TimelineClip {
  id: string;
  trackIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  type: 'video' | 'audio' | 'image' | 'text' | 'avatar';
  properties: any;
  volume: number;
  muted: boolean;
}

interface TimelineEditorProps {
  videoId: string;
  clips: TimelineClip[];
  duration: number;
  onUpdate?: (clips: TimelineClip[]) => void;
}

export function TimelineEditor({ videoId, clips, duration, onUpdate }: TimelineEditorProps) {
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>(clips);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  const pixelsPerSecond = 50 * zoom;
  const trackHeight = 60;
  const trackCount = Math.max(...timelineClips.map((c) => c.trackIndex), 3) + 1;

  const handleClipDragStart = (clipId: string, e: React.MouseEvent) => {
    setIsDragging(true);
    setDraggedClipId(clipId);
    setSelectedClipId(clipId);
  };

  const handleClipDrag = (e: React.MouseEvent) => {
    if (!isDragging || !draggedClipId || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newStartTime = Math.max(0, x / pixelsPerSecond);
    const newTrackIndex = Math.floor(y / trackHeight);

    setTimelineClips((prev) =>
      prev.map((clip) => {
        if (clip.id === draggedClipId) {
          const duration = clip.endTime - clip.startTime;
          return {
            ...clip,
            startTime: newStartTime,
            endTime: newStartTime + duration,
            trackIndex: newTrackIndex,
          };
        }
        return clip;
      })
    );
  };

  const handleClipDragEnd = () => {
    setIsDragging(false);
    setDraggedClipId(null);
    onUpdate?.(timelineClips);
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || isDragging) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(duration, x / pixelsPerSecond));
    setCurrentTime(newTime);
  };

  const handleSplitClip = async () => {
    if (!selectedClipId) return;

    const response = await fetch(`/api/v1/timeline/clips/${selectedClipId}/split`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ splitTime: currentTime }),
    });

    if (response.ok) {
      const { data } = await response.json();
      setTimelineClips((prev) => [
        ...prev.filter((c) => c.id !== selectedClipId),
        data.firstClip,
        data.secondClip,
      ]);
    }
  };

  const handleDuplicateClip = async () => {
    if (!selectedClipId) return;

    const response = await fetch(`/api/v1/timeline/clips/${selectedClipId}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ offsetTime: 1 }),
    });

    if (response.ok) {
      const { data } = await response.json();
      setTimelineClips((prev) => [...prev, data]);
    }
  };

  const handleDeleteClip = async () => {
    if (!selectedClipId) return;

    await fetch(`/api/v1/timeline/clips/${selectedClipId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    setTimelineClips((prev) => prev.filter((c) => c.id !== selectedClipId));
    setSelectedClipId(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const getClipColor = (type: string) => {
    const colors = {
      video: 'bg-blue-500',
      audio: 'bg-green-500',
      image: 'bg-purple-500',
      text: 'bg-yellow-500',
      avatar: 'bg-pink-500',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <span className="text-sm text-white font-mono">{formatTime(currentTime)}</span>
          <span className="text-sm text-gray-400">/ {formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSplitClip}
            disabled={!selectedClipId}
          >
            <Scissors className="h-4 w-4 mr-2" />
            Split
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDuplicateClip}
            disabled={!selectedClipId}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDeleteClip}
            disabled={!selectedClipId}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <div className="h-6 w-px bg-gray-700 mx-2" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom((z) => Math.min(z + 0.5, 4))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom((z) => Math.max(z - 0.5, 0.5))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline tracks */}
      <div className="flex-1 overflow-auto">
        <div
          ref={timelineRef}
          className="relative bg-gray-900 min-h-full"
          style={{
            width: `${duration * pixelsPerSecond}px`,
            height: `${trackCount * trackHeight}px`,
          }}
          onClick={handleTimelineClick}
          onMouseMove={handleClipDrag}
          onMouseUp={handleClipDragEnd}
          onMouseLeave={handleClipDragEnd}
        >
          {/* Time ruler */}
          <div className="sticky top-0 left-0 right-0 h-8 bg-gray-800 border-b border-gray-700 z-10">
            {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-gray-600"
                style={{ left: `${i * pixelsPerSecond}px` }}
              >
                <span className="text-xs text-gray-400 ml-1">{i}s</span>
              </div>
            ))}
          </div>

          {/* Track lines */}
          {Array.from({ length: trackCount }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-b border-gray-700"
              style={{
                top: `${i * trackHeight + 32}px`,
                height: `${trackHeight}px`,
              }}
            />
          ))}

          {/* Clips */}
          {timelineClips.map((clip) => (
            <div
              key={clip.id}
              className={`absolute rounded cursor-move transition-opacity ${getClipColor(
                clip.type
              )} ${
                selectedClipId === clip.id ? 'ring-2 ring-white' : ''
              } ${isDragging && draggedClipId === clip.id ? 'opacity-70' : ''}`}
              style={{
                left: `${clip.startTime * pixelsPerSecond}px`,
                top: `${clip.trackIndex * trackHeight + 32}px`,
                width: `${(clip.endTime - clip.startTime) * pixelsPerSecond}px`,
                height: `${trackHeight - 8}px`,
              }}
              onMouseDown={(e) => handleClipDragStart(clip.id, e)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedClipId(clip.id);
              }}
            >
              <div className="p-2 text-white text-xs truncate">
                <div className="font-semibold">{clip.type.toUpperCase()}</div>
                <div className="text-gray-200">
                  {formatTime(clip.duration)}
                </div>
              </div>
            </div>
          ))}

          {/* Playhead */}
          <div
            ref={playheadRef}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
            style={{ left: `${currentTime * pixelsPerSecond}px` }}
          >
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Track labels */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gray-800 border-r border-gray-700">
        <div className="h-8" /> {/* Spacer for ruler */}
        {Array.from({ length: trackCount }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-xs text-gray-400 border-b border-gray-700"
            style={{ height: `${trackHeight}px` }}
          >
            T{i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
