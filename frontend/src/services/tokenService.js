// src/services/tokenService.js

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

/**
 * Fetch a signed ZegoCloud token from the Node.js backend.
 * @param {string} userId - Unique user identifier
 * @param {string} roomId - Room ID the user is joining
 * @returns {Promise<string>} - The signed token string
 */
export async function fetchToken(userId, roomId) {
  const url = `${BACKEND_URL}/api/token?userId=${encodeURIComponent(userId)}&roomId=${encodeURIComponent(roomId)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Token fetch failed (${res.status})`);
  }

  const data = await res.json();
  if (!data.token) throw new Error('Invalid token response from server');
  return data.token;
}
