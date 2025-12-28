import { useState, useEffect } from "react";

export const useDictation = () => {
  const [isDictating, setIsDictating] = useState(false);

  // We listen to the backend to confirm if we are strictly in dictation mode
  // But for now, we just toggle the intent.

  const toggleDictation = () => {
    const newState = !isDictating;
    setIsDictating(newState);

    // @ts-ignore
    if (window.electron?.ipcRenderer) {
      // @ts-ignore
      window.electron.ipcRenderer.send("widget-toggle-voice", {
        mode: newState ? "DICTATION" : "OFF",
      });
    }
  };

  const setDictationState = (active: boolean) => {
    setIsDictating(active);
  };

  return { isDictating, toggleDictation, setDictationState };
};
