'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Target, Sliders, Play, Download, RefreshCw } from 'lucide-react';

interface EyePosition {
  x: number;
  y: number;
  z: number;
}

interface EyeTrackingData {
  id: string;
  videoId: string;
  status: string;
  frames: any[];
  targetPosition: EyePosition;
  correctionStrength: number;
  smoothing: number;
  processedFrames: number;
  totalFrames: number;
}

interface EyeContactMetrics {
  averageConfidence: number;
  eyeContactPercentage: number;
  blinkCount: number;
  averageGazeDeviation: number;
}

interface EyeContactControlsProps {
  videoId: string;
  videoStorageKey?: string;
  onApply?: () => void;
}

export function EyeContactControls({
  videoId,
  videoStorageKey,
  onApply,
}: EyeContactControlsProps) {
  const [eyeTrackingData, setEyeTrackingData] = useState<EyeTrackingData | null>(null);
  const [metrics, setMetrics] = useState<EyeContactMetrics | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetPosition, setTargetPosition] = useState<EyePosition>({ x: 0, y: 0, z: 1 });
  const [correctionStrength, setCorrectionStrength] = useState(1.0);
  const [smoothing, setSmoothing] = useState(0.5);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);

  useEffect(() => {
    loadEyeTrackingData();
  }, [videoId]);

  const loadEyeTrackingData = async () => {
    try {
      const response = await fetch(`/api/v1/eye-tracking/video/${videoId}?keyframesOnly=true`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const { data } = await response.json();
        setEyeTrackingData(data);
        setTargetPosition(data.targetPosition);
        setCorrectionStrength(data.correctionStrength);
        setSmoothing(data.smoothing);

        // Load metrics
        loadMetrics();
      }
    } catch (error) {
      console.error('Failed to load eye tracking data:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await fetch(`/api/v1/eye-tracking/video/${videoId}/metrics`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const { data } = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const handleStartTracking = async () => {
    if (!videoStorageKey) return;

    setIsProcessing(true);

    try {
      const response = await fetch(`/api/v1/eye-tracking/video/${videoId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          videoStorageKey,
          targetPosition,
          correctionStrength,
          smoothing,
          preserveBlinking: true,
          framerate: 30,
        }),
      });

      if (response.ok) {
        const { data } = await response.json();
        // Poll for completion
        pollTrackingStatus(data.eyeTrackingId);
      }
    } catch (error) {
      console.error('Failed to start eye tracking:', error);
      setIsProcessing(false);
    }
  };

  const pollTrackingStatus = async (eyeTrackingId: string) => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/v1/eye-tracking/video/${videoId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const { data } = await response.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          setIsProcessing(false);
          setEyeTrackingData(data);
          loadMetrics();
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setIsProcessing(false);
        }
      }
    }, 2000);
  };

  const handleUpdateConfig = async () => {
    if (!eyeTrackingData) return;

    try {
      await fetch(`/api/v1/eye-tracking/${eyeTrackingData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          targetPosition,
          correctionStrength,
          smoothing,
        }),
      });

      loadEyeTrackingData();
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  const handleApplyCorrection = async () => {
    if (!eyeTrackingData) return;

    try {
      await fetch(`/api/v1/eye-tracking/video/${videoId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          eyeTrackingId: eyeTrackingData.id,
          outputPath: `videos/${videoId}/corrected.mp4`,
        }),
      });

      onApply?.();
    } catch (error) {
      console.error('Failed to apply correction:', error);
    }
  };

  const handleLoadHeatmap = async () => {
    try {
      const response = await fetch(
        `/api/v1/eye-tracking/video/${videoId}/heatmap?width=1920&height=1080`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const { data } = await response.json();
        setHeatmapData(data);
        setShowHeatmap(true);
      }
    } catch (error) {
      console.error('Failed to load heatmap:', error);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Eye Contact Mapping</h3>
        </div>

        {eyeTrackingData && (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              eyeTrackingData.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : eyeTrackingData.status === 'processing'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {eyeTrackingData.status}
          </span>
        )}
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm text-gray-600">Eye Contact</div>
            <div className="text-2xl font-bold">{metrics.eyeContactPercentage.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Confidence</div>
            <div className="text-2xl font-bold">
              {(metrics.averageConfidence * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Blinks</div>
            <div className="text-2xl font-bold">{metrics.blinkCount}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Avg Deviation</div>
            <div className="text-2xl font-bold">{metrics.averageGazeDeviation.toFixed(2)}°</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-4">
        {/* Target Position */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Target className="h-4 w-4" />
            Target Position
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-600">X</label>
              <input
                type="number"
                value={targetPosition.x}
                onChange={(e) =>
                  setTargetPosition((prev) => ({ ...prev, x: parseFloat(e.target.value) }))
                }
                className="w-full px-2 py-1 border rounded"
                step="0.1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Y</label>
              <input
                type="number"
                value={targetPosition.y}
                onChange={(e) =>
                  setTargetPosition((prev) => ({ ...prev, y: parseFloat(e.target.value) }))
                }
                className="w-full px-2 py-1 border rounded"
                step="0.1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Z</label>
              <input
                type="number"
                value={targetPosition.z}
                onChange={(e) =>
                  setTargetPosition((prev) => ({ ...prev, z: parseFloat(e.target.value) }))
                }
                className="w-full px-2 py-1 border rounded"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Correction Strength */}
        <div>
          <label className="flex items-center justify-between text-sm font-medium mb-2">
            <span>Correction Strength</span>
            <span className="text-gray-600">{(correctionStrength * 100).toFixed(0)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={correctionStrength}
            onChange={(e) => setCorrectionStrength(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Smoothing */}
        <div>
          <label className="flex items-center justify-between text-sm font-medium mb-2">
            <span>Smoothing</span>
            <span className="text-gray-600">{(smoothing * 100).toFixed(0)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={smoothing}
            onChange={(e) => setSmoothing(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Processing Progress */}
      {isProcessing && eyeTrackingData && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Processing...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{
                width: `${(eyeTrackingData.processedFrames / eyeTrackingData.totalFrames) * 100}%`,
              }}
            />
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {eyeTrackingData.processedFrames} / {eyeTrackingData.totalFrames} frames
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {!eyeTrackingData && (
          <Button onClick={handleStartTracking} disabled={isProcessing}>
            <Play className="h-4 w-4 mr-2" />
            Start Eye Tracking
          </Button>
        )}

        {eyeTrackingData && (
          <>
            <Button onClick={handleUpdateConfig} variant="outline">
              <Sliders className="h-4 w-4 mr-2" />
              Update Configuration
            </Button>

            <Button onClick={handleApplyCorrection}>
              <Download className="h-4 w-4 mr-2" />
              Apply Eye Contact Correction
            </Button>

            <Button onClick={handleLoadHeatmap} variant="outline">
              View Gaze Heatmap
            </Button>
          </>
        )}
      </div>

      {/* Heatmap Visualization */}
      {showHeatmap && heatmapData.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Gaze Heatmap</h4>
          <div className="relative aspect-video bg-gray-900 rounded overflow-hidden">
            {/* Simplified heatmap visualization */}
            <canvas className="w-full h-full" />
          </div>
        </div>
      )}
    </div>
  );
}
