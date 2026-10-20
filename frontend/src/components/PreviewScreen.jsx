import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ArrowLeft,
  Settings2,
  Camera,
  Volume2,
  Sparkles,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import ParticipantAvatar from './ParticipantAvatar';
import { useMediaDevices } from '../hooks/useMediaDevices';

export default function PreviewScreen({
  roomId,
  userName,
  zg,
  onJoinCall,
  onBack,
}) {
  const { cameras, microphones } = useMediaDevices();
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [localStream, setLocalStream] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize selected devices from list
  useEffect(() => {
    if (cameras.length > 0 && !selectedCamera) {
      setSelectedCamera(cameras[0].deviceId);
    }
  }, [cameras, selectedCamera]);

  useEffect(() => {
    if (microphones.length > 0 && !selectedMic) {
      setSelectedMic(microphones[0].deviceId);
    }
  }, [microphones, selectedMic]);

  // Start local media stream for pre-join preview
  useEffect(() => {
    let active = true;

    async function initPreviewStream() {
      try {
        // Stop any existing preview tracks first
        if (streamRef.current) {
          if (zg && streamRef.current.__isZegoStream) {
            try {
              zg.destroyStream(streamRef.current);
            } catch (e) {
              console.warn('Destroy zego stream error', e);
            }
          } else {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
          streamRef.current = null;
        }

        let stream = null;

        // Try ZegoExpressEngine createStream if engine instance is available
        if (zg && typeof zg.createStream === 'function') {
          try {
            const config = {
              camera: {
                video: true,
                audio: true,
              },
            };
            if (selectedCamera) config.camera.videoInput = selectedCamera;
            if (selectedMic) config.camera.audioInput = selectedMic;

            stream = await zg.createStream(config);
            stream.__isZegoStream = true;
          } catch (zgErr) {
            console.warn('zg.createStream failed, falling back to navigator.mediaDevices:', zgErr);
          }
        }

        // Fallback to native getUserMedia for preview if zg is unavailable or fails
        if (!stream) {
          const constraints = {
            video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
            audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          stream.__isZegoStream = false;
        }

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // Apply current mic and camera toggles
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = isMicOn;

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) videoTrack.enabled = isCameraOn;

        streamRef.current = stream;
        setLocalStream(stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setErrorMsg('');
      } catch (err) {
        console.error('Failed to get media devices for preview:', err);
        setErrorMsg('Could not access camera/microphone. Please allow browser permissions.');
      }
    }

    initPreviewStream();

    return () => {
      active = false;
    };
  }, [selectedCamera, selectedMic, zg]);

  // Handle toggling microphone
  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
      }
    }
    setIsMicOn((prev) => !prev);
  };

  // Handle toggling camera
  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCameraOn;
      }
    }
    setIsCameraOn((prev) => !prev);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async () => {
    setIsJoining(true);
    setErrorMsg('');
    try {
      await onJoinCall({
        localStream: streamRef.current,
        isMicOn,
        isCameraOn,
      });
    } catch (err) {
      console.error('Join error in preview:', err);
      setErrorMsg(err.message || 'Failed to join the room');
      setIsJoining(false);
    }
  };

  return (
    <div className="h-full w-full gradient-bg flex flex-col justify-between overflow-y-auto p-4 sm:p-6 md:p-8">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2">
        <button
          onClick={onBack}
          className="btn-ghost flex items-center gap-2 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lobby</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Pre-join Check</span>
        </div>
      </header>

      {/* Main Preview Container */}
      <main className="w-full max-w-5xl mx-auto my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
        {/* Left: Video Preview Window (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full aspect-video rounded-2xl bg-slate-950 border border-white/10 relative overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isCameraOn ? 'opacity-100 scale-x-[-1]' : 'opacity-0'
              }`}
            />

            {/* Camera Off Avatar Overlay */}
            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm z-10">
                <ParticipantAvatar name={userName} size="lg" subtitle="Camera is off" />
              </div>
            )}

            {/* Error Overlay */}
            {errorMsg && (
              <div className="absolute top-4 left-4 right-4 z-20 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-xs text-red-200 flex items-center gap-2 backdrop-blur-md">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* In-preview Floating Control Pills */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
              <button
                type="button"
                onClick={toggleMic}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                  isMicOn
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
              >
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={toggleCamera}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                  isCameraOn
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Bottom-left user name pill */}
            <div className="absolute bottom-4 left-4 z-10 px-3 py-1 rounded-md bg-black/50 backdrop-blur-sm text-xs text-white/90 border border-white/5 font-medium">
              {userName} (You)
            </div>
          </div>

          {/* Device Selection Dropdowns */}
          <div className="w-full mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-400" />
                <span>Camera Device</span>
              </label>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="select-field text-xs"
              >
                {cameras.length === 0 ? (
                  <option value="">Default Camera</option>
                ) : (
                  cameras.map((c, i) => (
                    <option key={c.deviceId || i} value={c.deviceId}>
                      {c.label || `Camera ${i + 1}`}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Microphone Device</span>
              </label>
              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                className="select-field text-xs"
              >
                {microphones.length === 0 ? (
                  <option value="">Default Microphone</option>
                ) : (
                  microphones.map((m, i) => (
                    <option key={m.deviceId || i} value={m.deviceId}>
                      {m.label || `Microphone ${i + 1}`}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Right: Ready to Join Card (5 cols on lg) */}
        <div className="lg:col-span-5">
          <div className="glass-card p-6 sm:p-8 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Camera & Mic Ready</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Ready to join?</h2>
              <p className="text-sm text-slate-400 mt-1">
                Check your audio and video before entering the room.
              </p>
            </div>

            {/* Room Info Box */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Target Room</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-indigo-300">
                    {roomId}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-white/10 rounded transition text-slate-400 hover:text-white"
                    title="Copy Room ID"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                <span className="text-slate-400">Joining as</span>
                <span className="font-semibold text-slate-200">{userName}</span>
              </div>
            </div>

            {/* Join Action Button */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="btn-primary w-full py-3.5 text-base shadow-indigo-500/30"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting to Room...</span>
                  </>
                ) : (
                  <span>Join Now</span>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-500">
                You will be connected to the other user as soon as they enter room{' '}
                <span className="font-mono text-slate-400">{roomId}</span>.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto py-2 text-center text-xs text-slate-600">
        Google Meet style preview screen • Instant media track toggle
      </footer>
    </div>
  );
}
