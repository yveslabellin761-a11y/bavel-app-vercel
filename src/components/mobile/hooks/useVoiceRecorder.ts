import { useState, useRef, useCallback, useEffect } from 'react';
import { playSynthAudio } from '../../../utils/audio';

interface UseVoiceRecorderOptions {
  maxDuration?: number;
  onComplete?: (duration: number, waveformData: number[]) => void;
  onCancel?: () => void;
}

export const useVoiceRecorder = ({
  maxDuration = 60,
  onComplete,
  onCancel,
}: UseVoiceRecorderOptions = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const secondsRef = useRef(0);
  const waveformRef = useRef<number[]>([]);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    secondsRef.current = recordingSeconds;
  }, [recordingSeconds]);

  useEffect(() => {
    waveformRef.current = waveformData;
  }, [waveformData]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;

    setIsRecording(false);
    isRecordingRef.current = false;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    playSynthAudio('voice_stop');

    const currentSecs = secondsRef.current;
    const currentWaveform = waveformRef.current;

    if (currentSecs > 0) {
      onComplete?.(currentSecs, currentWaveform);
    } else {
      onCancel?.();
    }
  }, [onComplete, onCancel]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    isRecordingRef.current = true;
    setRecordingSeconds(0);
    secondsRef.current = 0;
    const initialWave = Array.from({ length: 26 }, () => Math.floor(Math.random() * 16) + 4);
    setWaveformData(initialWave);
    waveformRef.current = initialWave;

    playSynthAudio('voice_start');

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => {
        const next = prev + 1;
        secondsRef.current = next;
        if (next >= maxDuration) {
          stopRecording();
          return maxDuration;
        }
        return next;
      });

      setWaveformData(() => {
        const newWaveform = Array.from({ length: 26 }, () => Math.floor(Math.random() * 16) + 4);
        waveformRef.current = newWaveform;
        return newWaveform;
      });
    }, 1000);
  }, [maxDuration, stopRecording]);

  const cancelRecording = useCallback(() => {
    setIsRecording(false);
    isRecordingRef.current = false;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingSeconds(0);
    secondsRef.current = 0;
    setWaveformData([]);
    waveformRef.current = [];
    playSynthAudio('voice_stop');
    onCancel?.();
  }, [onCancel]);

  return {
    isRecording,
    recordingSeconds,
    waveformData,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};
