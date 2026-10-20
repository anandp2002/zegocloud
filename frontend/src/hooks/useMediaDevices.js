import { useState, useEffect } from 'react';

export function useMediaDevices() {
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function getDevices() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!mounted) return;

        const videoDevices = devices.filter((device) => device.kind === 'videoinput');
        const audioDevices = devices.filter((device) => device.kind === 'audioinput');

        setCameras(videoDevices);
        setMicrophones(audioDevices);

        const hasLabels = devices.some((d) => d.label && d.label.length > 0);
        setHasPermission(hasLabels);
      } catch (err) {
        console.error('Error enumerating devices:', err);
      }
    }

    getDevices();

    const handleDeviceChange = () => {
      getDevices();
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      mounted = false;
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  return { cameras, microphones, hasPermission };
}
