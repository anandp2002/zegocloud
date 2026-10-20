import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Copy,
  Check,
  Users,
} from 'lucide-react';

export default function ControlBar({
  isMicOn,
  isCameraOn,
  isScreenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onEndCall,
  roomId,
  participantCount = 1,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyRoom = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="control-bar px-6 py-4 flex items-center justify-between z-30 select-none">
      {/* Left: Room Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
          <span className="text-slate-400">Room:</span>
          <span className="font-mono font-semibold text-indigo-300">{roomId}</span>
          <button
            onClick={handleCopyRoom}
            className="p-1 hover:bg-white/10 rounded transition text-slate-400 hover:text-white"
            title="Copy Room ID"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>{participantCount} / 2</span>
        </div>
      </div>

      {/* Center: Main Media Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mic Toggle */}
        <div className="tooltip-wrap">
          <button
            onClick={onToggleMic}
            className={`icon-btn ${isMicOn ? 'icon-btn-neutral' : 'icon-btn-muted'}`}
            aria-label={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <span className="tooltip">{isMicOn ? 'Mute Mic' : 'Unmute Mic'}</span>
        </div>

        {/* Camera Toggle */}
        <div className="tooltip-wrap">
          <button
            onClick={onToggleCamera}
            className={`icon-btn ${isCameraOn ? 'icon-btn-neutral' : 'icon-btn-muted'}`}
            aria-label={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
          >
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          <span className="tooltip">{isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}</span>
        </div>

        {/* Screen Share */}
        <div className="tooltip-wrap">
          <button
            onClick={onToggleScreenShare}
            className={`icon-btn ${isScreenSharing ? 'icon-btn-active' : 'icon-btn-neutral'}`}
            aria-label={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <Monitor className="w-5 h-5" />
          </button>
          <span className="tooltip">{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
        </div>

        {/* End Call Button */}
        <div className="tooltip-wrap">
          <button
            onClick={onEndCall}
            className="icon-btn icon-btn-danger"
            aria-label="Leave Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
          <span className="tooltip">Leave Call</span>
        </div>
      </div>

      {/* Right placeholder for symmetry / call type info */}
      <div className="hidden md:flex items-center justify-end">
        <span className="text-xs font-medium text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
          1-to-1 WebRTC
        </span>
      </div>
    </footer>
  );
}
