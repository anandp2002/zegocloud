// src/hooks/useZegoEngine.js
import { useState, useEffect } from 'react';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';

let engineInstance = null;
let currentAppId = null;

export function getEngineInstance(appId) {
  const targetId = appId || Number(import.meta.env.VITE_ZEGO_APP_ID);
  if (!targetId || isNaN(targetId) || targetId <= 0) {
    return null;
  }

  if (!engineInstance || currentAppId !== targetId) {
    if (engineInstance) {
      try {
        engineInstance.destroyEngine();
      } catch (e) {
        console.warn('Error destroying prior engine:', e);
      }
    }
    const serverUrl = `wss://webliveroom${targetId}-api.zego.im/ws`;
    engineInstance = new ZegoExpressEngine(targetId, serverUrl);
    currentAppId = targetId;
  }

  return engineInstance;
}

export function useZegoEngine() {
  const [engine, setEngine] = useState(() => getEngineInstance());
  const envAppId = Number(import.meta.env.VITE_ZEGO_APP_ID);
  const isConfigured = Boolean(envAppId && !isNaN(envAppId) && envAppId > 0);

  useEffect(() => {
    const inst = getEngineInstance();
    setEngine(inst);

    const handleUnload = () => {
      if (engineInstance) {
        try {
          engineInstance.destroyEngine();
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
        engineInstance = null;
        currentAppId = null;
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return {
    engine,
    appID: currentAppId || envAppId,
    isConfigured,
    getEngine: getEngineInstance,
  };
}
