import { useState, useEffect, useCallback, useRef } from 'react';

export const useGameTimer = (initialElapsedTime = 0, initialIsRunning = false) => {
  const [isRunning, setIsRunning] = useState(initialIsRunning);
  const [elapsedTime, setElapsedTime] = useState(initialElapsedTime);
  const startTimeRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateTimer = useCallback(() => {
    if (startTimeRef.current > 0) {
      setElapsedTime(Date.now() - startTimeRef.current);
    }
  }, []);

  const start = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      startTimeRef.current = Date.now() - elapsedTime;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(updateTimer, 1000);
    }
  }, [isRunning, elapsedTime, updateTimer]);

  const pause = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isRunning]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setElapsedTime(0);
    startTimeRef.current = 0;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isRunning) {
        start();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, start]);

  return {
    isRunning,
    start,
    pause,
    reset,
    formattedTime: formatTime(elapsedTime),
  };
};
