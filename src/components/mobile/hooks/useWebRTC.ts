import { useState, useRef, useEffect, useCallback } from 'react';
import { playSynthAudio } from '../../../utils/audio';
import { CallState } from '../types';

interface UseWebRTCOptions {
  onCallEnd?: (duration: number) => void;
  onCallStart?: () => void;
}

export const useWebRTC = ({ onCallEnd, onCallStart }: UseWebRTCOptions = {}) => {
  const [activeCall, setActiveCall] = useState<CallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Démarrer un appel
  const startCall = useCallback(async (type: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { facingMode: 'user' } : false
      });

      setLocalStream(stream);
      setActiveCall({
        type,
        status: 'ringing',
        duration: 0
      });
      setCallDuration(0);
      setIsMuted(false);
      setIsCameraOff(false);
      setIsSpeakerOn(false);
      
      playSynthAudio('voice_start');
      onCallStart?.();

      // Simuler la connexion après 2 secondes
      setTimeout(() => {
        setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
      }, 2000);

      return stream;
    } catch (err) {
      console.error("Erreur d'accès à la caméra/micro:", err);
      throw new Error("Accès au microphone ou à la caméra refusé");
    }
  }, [onCallStart]);

  // Terminer un appel
  const endCall = useCallback(() => {
    if (!activeCall) return;

    playSynthAudio('hangup');
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    const duration = callDuration;
    setActiveCall(null);
    onCallEnd?.(duration);
  }, [activeCall, localStream, callDuration, onCallEnd]);

  // Timer pour la durée de l'appel
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (activeCall && activeCall.status === 'connected') {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCall?.status]);

  // Gestion du mute
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  // Gestion de la caméra
  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isCameraOff;
      });
    }
  }, [isCameraOff, localStream]);

  return {
    activeCall,
    localStream,
    localVideoRef,
    isMuted,
    setIsMuted,
    isCameraOff,
    setIsCameraOff,
    isSpeakerOn,
    setIsSpeakerOn,
    callDuration,
    startCall,
    endCall,
  };
};
