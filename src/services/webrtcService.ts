export interface CallState {
  isActive: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  incomingCall: { from: string; name: string; type: 'voice' | 'video' } | null;
  activeCall: { userId: string; type: 'voice' | 'video' } | null;
  stream: MediaStream | null;
  remoteStream: MediaStream | null;
  status: 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended';
}

export const webrtcService = {
  isSupported: (): boolean => {
    return typeof window !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  },

  requestPermissions: async (type: 'voice' | 'video'): Promise<boolean> => {
    if (!webrtcService.isSupported()) return false;
    try {
      const constraints = {
        audio: true,
        video: type === 'video'
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      // Stop tracks immediately as we are only checking permissions
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (e) {
      // Quietly handle permission failures in environments without camera/mic devices
      return false;
    }
  },

  getMediaStream: async (type: 'voice' | 'video'): Promise<MediaStream | null> => {
    if (!webrtcService.isSupported()) return null;
    try {
      const constraints = {
        audio: true,
        video: type === 'video' ? { facingMode: 'user' } : false
      };
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      console.error('Failed to get media stream:', e);
      return null;
    }
  }
};
