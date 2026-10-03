import { useState, useEffect, useCallback, useRef } from 'react';
import { webrtcService, CallState } from '../services/webrtcService';

export function useWebRTC(userId: string) {
  const [callState, setCallState] = useState<CallState>({
    isActive: false,
    isMuted: false,
    isVideoEnabled: false,
    incomingCall: null,
    activeCall: null,
    stream: null,
    remoteStream: null,
    status: 'idle'
  });

  const isCallSupported = webrtcService.isSupported();
  const ringtoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callDurationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up all call timers and streams
  const cleanupCall = useCallback(() => {
    if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);
    if (callDurationIntervalRef.current) clearInterval(callDurationIntervalRef.current);
    
    setCallState(prev => {
      if (prev.stream) {
        prev.stream.getTracks().forEach(track => track.stop());
      }
      return {
        isActive: false,
        isMuted: false,
        isVideoEnabled: false,
        incomingCall: null,
        activeCall: null,
        stream: null,
        remoteStream: null,
        status: 'idle'
      };
    });
  }, []);

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    return webrtcService.requestPermissions('video');
  }, []);

  const startCall = useCallback(async (targetUserId: string, callType: 'voice' | 'video') => {
    cleanupCall();
    
    setCallState(prev => ({
      ...prev,
      isActive: true,
      status: 'ringing',
      isVideoEnabled: callType === 'video',
      activeCall: { userId: targetUserId, type: callType }
    }));

    // Retrieve user media stream and connect directly
    const mediaStream = await webrtcService.getMediaStream(callType);
    if (mediaStream) {
      setCallState(prev => ({ 
        ...prev, 
        stream: mediaStream,
        status: 'connected'
      }));
    } else {
      cleanupCall();
    }
  }, [cleanupCall]);

  const endCall = useCallback(async () => {
    cleanupCall();
  }, [cleanupCall]);

  const answerCall = useCallback(async () => {
    if (!callState.incomingCall) return;
    
    const callType = callState.incomingCall.type;
    const mediaStream = await webrtcService.getMediaStream(callType);

    setCallState(prev => ({
      ...prev,
      isActive: true,
      status: 'connected',
      isVideoEnabled: callType === 'video',
      incomingCall: null,
      activeCall: { userId: prev.incomingCall?.from || 'unknown', type: callType },
      stream: mediaStream
    }));
  }, [callState.incomingCall]);

  const rejectCall = useCallback(async () => {
    cleanupCall();
  }, [cleanupCall]);

  const toggleMute = useCallback(() => {
    setCallState(prev => {
      const nextMuted = !prev.isMuted;
      if (prev.stream) {
        prev.stream.getAudioTracks().forEach(track => {
          track.enabled = !nextMuted;
        });
      }
      return { ...prev, isMuted: nextMuted };
    });
  }, []);

  const toggleVideo = useCallback(() => {
    setCallState(prev => {
      const nextVideo = !prev.isVideoEnabled;
      if (prev.stream) {
        prev.stream.getVideoTracks().forEach(track => {
          track.enabled = nextVideo;
        });
      }
      return { ...prev, isVideoEnabled: nextVideo };
    });
  }, []);

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  return {
    callState,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    answerCall,
    rejectCall,
    isCallSupported,
    checkPermissions
  };
}
