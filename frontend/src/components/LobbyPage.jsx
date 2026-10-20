import React, { useState } from 'react';
import { Video, ShieldCheck, Sparkles, ArrowRight, Dices, AlertCircle } from 'lucide-react';

export default function LobbyPage({ onProceedToPreview, isEngineConfigured, initialRoomId = '' }) {
  const [roomId, setRoomId] = useState(initialRoomId);
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (initialRoomId) {
      setRoomId(initialRoomId);
    }
  }, [initialRoomId]);

  const generateRandomRoom = () => {
    const part1 = Math.random().toString(36).substring(2, 5);
    const part2 = Math.random().toString(36).substring(2, 5);
    const generated = `${part1}-${part2}`;
    setRoomId(generated);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanRoomId = roomId.trim();
    const cleanUserName = userName.trim();

    if (!cleanRoomId) {
      setError('Please enter a Room ID to join');
      return;
    }
    if (cleanRoomId.length < 3) {
      setError('Room ID must be at least 3 characters');
      return;
    }
    if (!cleanUserName) {
      setError('Please enter your name');
      return;
    }

    setError('');
    onProceedToPreview({ roomId: cleanRoomId, userName: cleanUserName });
  };

  return (
    <div className="h-full w-full gradient-bg flex flex-col justify-between overflow-y-auto p-4 sm:p-6 md:p-8">
      {/* Top Navbar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
              ZegoMeet
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                1-on-1 WebRTC
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Peer-to-Peer Encrypted</span>
        </div>
      </header>

      {/* Main Join Card */}
      <main className="w-full max-w-md mx-auto my-auto animate-fade-in-up py-6">
        <div className="glass-card p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-300 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Direct 1-to-1 Video Connection</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Join a Room</h2>
            <p className="text-sm text-slate-400 mt-1">
              Enter the Room ID shared with you, or create a new ID and share it with your peer.
            </p>
          </div>

          {!isEngineConfigured && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300">ZegoCloud AppID Notice</p>
                <p className="text-amber-200/80 mt-0.5">
                  Remember to update <code className="bg-black/30 px-1 py-0.5 rounded text-amber-200">.env</code> with your ZegoCloud <span className="font-mono">APP_ID</span> and <span className="font-mono">SERVER_SECRET</span> from console.zegocloud.com.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Room ID
                </label>
                <button
                  type="button"
                  onClick={generateRandomRoom}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Generate ID</span>
                </button>
              </div>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="e.g. meet-xyz-789"
                className="input-field font-mono"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Your Display Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Alex Rivers"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full mt-2"
            >
              <span>Continue to Preview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <p className="text-xs text-slate-500">
              Only 2 participants can connect to a room at a time.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto py-2 text-center text-xs text-slate-600">
        Built with React, WebRTC & ZegoCloud Express SDK
      </footer>
    </div>
  );
}
