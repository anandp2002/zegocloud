import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Copy,
  Check,
  PhoneOff,
  Sparkles,
  Wifi,
  Clock,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import ControlBar from './ControlBar';
import ParticipantAvatar from './ParticipantAvatar';

export default function CallRoom({
  roomId,
  userName,
  userId,
  zg,
  token,
  initialStream,
  initialMicOn = true,
  initialCameraOn = true,
  onLeaveCall,
}) {
  const [isMicOn, setIsMicOn] = useState(initialMicOn);
  const [isCameraOn, setIsCameraOn] = useState(initialCameraOn);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [participantCount, setParticipantCount] = useState(1);
  const [callDuration, setCallDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const localStreamRef = useRef(initialStream);
  const screenStreamRef = useRef(null);
  const publishStreamIdRef = useRef(`stream_${roomId}_${userId}`);
  const remoteStreamIdRef = useRef(null);

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  // Play local stream in PiP
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [initialStream]);

  // Dedicated effect: Bind remoteStream to remoteVideoRef whenever it updates
  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    if (!videoEl) return;

    if (remoteStream) {
      console.log('Attaching remoteStream to remote video element:', remoteStream);
      videoEl.srcObject = remoteStream;

      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Remote stream playback started successfully (video & audio).');
            setAutoplayBlocked(false);
          })
          .catch((err) => {
            console.warn('Remote video playback was prevented by browser autoplay policy:', err);
            setAutoplayBlocked(true);
          });
      }
    } else {
      videoEl.srcObject = null;
    }
  }, [remoteStream]);

  // Main WebRTC Room Lifecycle: Listeners Registered BEFORE loginRoom!
  useEffect(() => {
    if (!zg) {
      console.warn('ZegoExpressEngine not available, running in offline test mode');
      setConnectionStatus('connected');
      return;
    }

    let isMounted = true;

    // 1. Listen for remote streams added or removed
    const handleRoomStreamUpdate = async (roomID, updateType, streamList) => {
      console.log('roomStreamUpdate event received:', updateType, streamList);
      if (!isMounted) return;

      if (updateType === 'ADD' && streamList && streamList.length > 0) {
        for (const s of streamList) {
          // Ignore our own published stream
          if (s.user && s.user.userID === userId) continue;

          console.log('New remote stream detected:', s.streamID, 'from user:', s.user);
          remoteStreamIdRef.current = s.streamID;

          try {
            const rStream = await zg.startPlayingStream(s.streamID);
            if (!isMounted) return;

            console.log('startPlayingStream resolved with MediaStream:', rStream);
            setRemoteStream(rStream);
            setRemoteUser({
              userID: s.user?.userID || 'peer',
              userName: s.user?.userName || 'Peer',
            });
            setParticipantCount(2);
          } catch (err) {
            console.error('Failed to start playing remote stream:', err);
            setErrorMsg('Failed to play incoming video stream');
          }
        }
      } else if (updateType === 'DELETE' && streamList && streamList.length > 0) {
        for (const s of streamList) {
          if (remoteStreamIdRef.current === s.streamID) {
            console.log('Remote stream stopped:', s.streamID);
            try {
              zg.stopPlayingStream(s.streamID);
            } catch (e) {
              console.warn('stopPlayingStream error:', e);
            }
            if (isMounted) {
              remoteStreamIdRef.current = null;
              setRemoteStream(null);
              setRemoteUser(null);
              setParticipantCount(1);
            }
          }
        }
      }
    };

    // 2. Listen for users entering or leaving the room
    const handleRoomUserUpdate = (roomID, updateType, userList) => {
      console.log('roomUserUpdate:', updateType, userList);
      if (!isMounted) return;

      if (updateType === 'ADD' && userList && userList.length > 0) {
        const peer = userList.find((u) => u.userID !== userId);
        if (peer) {
          setRemoteUser((prev) => prev || peer);
          setParticipantCount(2);
        }
      } else if (updateType === 'DELETE' && userList && userList.length > 0) {
        const peerLeft = userList.some((u) => u.userID !== userId);
        if (peerLeft) {
          setRemoteUser(null);
          setRemoteStream(null);
          setParticipantCount(1);
        }
      }
    };

    // 3. Listen for room connection state changes
    const handleRoomStateUpdate = (roomID, state, errorCode) => {
      console.log('roomStateUpdate:', state, 'errorCode:', errorCode);
      if (!isMounted) return;

      if (state === 'CONNECTED') {
        setConnectionStatus('connected');
      } else if (state === 'CONNECTING') {
        setConnectionStatus('connecting');
      } else if (state === 'DISCONNECTED') {
        setConnectionStatus('disconnected');
        if (errorCode !== 0) {
          setErrorMsg(`Room disconnected (Code: ${errorCode})`);
        }
      }
    };

    // Register event listeners FIRST
    zg.on('roomStreamUpdate', handleRoomStreamUpdate);
    zg.on('roomUserUpdate', handleRoomUserUpdate);
    zg.on('roomStateUpdate', handleRoomStateUpdate);
    zg.on('publisherStateUpdate', (result) => console.log('publisherStateUpdate:', result));
    zg.on('playerStateUpdate', (result) => console.log('playerStateUpdate:', result));

    // Join room and publish stream
    async function joinAndPublish() {
      try {
        console.log(`Logging into ZegoCloud room "${roomId}" as user "${userId}"...`);
        const loginRes = await zg.loginRoom(
          roomId,
          token,
          { userID: userId, userName: userName },
          { userUpdate: true }
        );
        console.log('loginRoom resolved successfully:', loginRes);

        // Ensure we have a valid local stream to publish
        let streamToPublish = localStreamRef.current;
        if (!streamToPublish || streamToPublish.getTracks().length === 0 || !streamToPublish.active) {
          console.log('Creating fresh local stream via zg.createStream...');
          streamToPublish = await zg.createStream({
            camera: {
              video: initialCameraOn,
              audio: initialMicOn,
            },
          });
          localStreamRef.current = streamToPublish;
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = streamToPublish;
          localVideoRef.current.play().catch((e) => console.warn('Local play warning:', e));
        }

        // Apply audio & video enabled states
        const audioTrack = streamToPublish.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = initialMicOn;
        const videoTrack = streamToPublish.getVideoTracks()[0];
        if (videoTrack) videoTrack.enabled = initialCameraOn;

        // Start publishing stream
        const streamID = publishStreamIdRef.current;
        console.log('Starting stream publishing:', streamID);
        await zg.startPublishingStream(streamID, streamToPublish);
        console.log('Local stream published successfully:', streamID);
      } catch (err) {
        console.error('Error during room join/publishing:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Failed to connect to room');
        }
      }
    }

    joinAndPublish();

    return () => {
      isMounted = false;
      zg.off('roomStreamUpdate', handleRoomStreamUpdate);
      zg.off('roomUserUpdate', handleRoomUserUpdate);
      zg.off('roomStateUpdate', handleRoomStateUpdate);

      try {
        zg.stopPublishingStream(publishStreamIdRef.current);
      } catch (e) {
        console.warn('stopPublishingStream error:', e);
      }

      if (remoteStreamIdRef.current) {
        try {
          zg.stopPlayingStream(remoteStreamIdRef.current);
        } catch (e) {
          console.warn('stopPlayingStream error:', e);
        }
      }

      try {
        zg.logoutRoom(roomId);
      } catch (e) {
        console.warn('logoutRoom error:', e);
      }
    };
  }, [zg, roomId, userId, userName, token]);

  // Handle Mute/Unmute Mic
  const handleToggleMic = () => {
    const stream = isScreenSharing ? screenStreamRef.current : localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
      }
    }
    setIsMicOn((prev) => !prev);
  };

  // Handle Turn On/Off Camera
  const handleToggleCamera = () => {
    const stream = isScreenSharing ? screenStreamRef.current : localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCameraOn;
      }
    }
    setIsCameraOn((prev) => !prev);
  };

  // Handle Screen Share Toggle
  const handleToggleScreenShare = async () => {
    if (!zg) return;

    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }

      try {
        await zg.startPublishingStream(publishStreamIdRef.current, localStreamRef.current);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      } catch (err) {
        console.error('Failed to restore camera stream:', err);
      }

      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await zg.createStream({
          screen: {
            video: true,
            audio: false,
          },
        });

        screenStreamRef.current = screenStream;

        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            handleToggleScreenShare();
          };
        }

        await zg.startPublishingStream(publishStreamIdRef.current, screenStream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Screen share canceled or failed:', err);
      }
    }
  };

  // Handle End Call / Leave
  const handleEndCall = async () => {
    try {
      if (zg) {
        try {
          zg.stopPublishingStream(publishStreamIdRef.current);
        } catch (e) {
          console.warn('stopPublishingStream error', e);
        }
        if (remoteStreamIdRef.current) {
          try {
            zg.stopPlayingStream(remoteStreamIdRef.current);
          } catch (e) {
            console.warn('stopPlayingStream error', e);
          }
        }
        await zg.logoutRoom(roomId);
      }
    } catch (err) {
      console.warn('Error during room logout:', err);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    onLeaveCall();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Manual trigger if browser blocked audio autoplay
  const handleUnblockAudio = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.play().then(() => {
        setAutoplayBlocked(false);
      }).catch((e) => console.warn('Unblock failed:', e));
    }
  };

  return (
    <div className="h-full w-full bg-[#080c14] flex flex-col justify-between overflow-hidden relative">
      {/* Top Floating Call Header */}
      <header className="call-header select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white">
            <span
              className={`status-dot ${
                connectionStatus === 'connected' ? 'connected' : 'connecting'
              }`}
            />
            <span className="font-semibold">{roomId}</span>
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

        {/* Center: Timer */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-xs text-slate-200">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span className="call-timer font-mono">{formatTime(callDuration)}</span>
        </div>

        {/* Right: Participant Count */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-xs text-slate-300">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>{participantCount} / 2</span>
        </div>
      </header>

      {/* Main Video Area */}
      <main className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center p-3 sm:p-4">
        {/* Remote Video Container */}
        <div className="w-full h-full rounded-2xl bg-slate-950 border border-white/5 relative overflow-hidden flex items-center justify-center shadow-inner">
          {/* Remote Video: ALWAYS present in DOM so ref is NEVER null */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              remoteStream ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Autoplay unblock button if browser restricted audio */}
          {autoplayBlocked && remoteStream && (
            <button
              onClick={handleUnblockAudio}
              className="absolute top-20 z-30 px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2 hover:bg-indigo-700 animate-bounce cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Click to enable peer audio & video</span>
            </button>
          )}

          {/* Waiting for Peer Overlay (shown when remoteStream is null) */}
          {!remoteStream && (
            <div className="waiting-overlay p-6 text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2 animate-pulse-ring">
                <Users className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Waiting for the other person to join...
              </h3>
              <p className="text-sm text-slate-400 max-w-md">
                Share this Room ID with your peer. When they enter the room, the video call will connect automatically.
              </p>

              <div className="mt-2 flex items-center gap-2 p-2 px-4 rounded-xl bg-white/5 border border-white/10">
                <span className="font-mono text-base font-semibold text-indigo-300">
                  {roomId}
                </span>
                <button
                  onClick={handleCopy}
                  className="btn-ghost py-1 px-2.5 text-xs flex items-center gap-1.5 ml-2 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Remote user name badge */}
          {remoteStream && remoteUser && (
            <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-md bg-black/60 backdrop-blur-md text-xs text-white/90 border border-white/10 font-medium flex items-center gap-2">
              <span className="status-dot connected" />
              <span>{remoteUser.userName || 'Peer'}</span>
            </div>
          )}
        </div>

        {/* Local Video PiP (Picture in Picture - Floating Corner) */}
        <div className="pip-container">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover bg-slate-900 transition-opacity ${
              isCameraOn || isScreenSharing ? 'opacity-100 scale-x-[-1]' : 'opacity-0'
            }`}
          />

          {/* Local Camera Off Overlay */}
          {!isCameraOn && !isScreenSharing && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
              <ParticipantAvatar name={userName} size="sm" />
            </div>
          )}

          {/* Local Name Badge */}
          <div className="absolute bottom-1.5 left-2 z-20 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] text-white/90 font-medium">
            {userName} (You)
          </div>
        </div>
      </main>

      {/* Error banner if any */}
      {errorMsg && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-xs text-red-200 flex items-center gap-2 backdrop-blur-md shadow-lg">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <ControlBar
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        isScreenSharing={isScreenSharing}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onEndCall={handleEndCall}
        roomId={roomId}
        participantCount={participantCount}
      />
    </div>
  );
}
