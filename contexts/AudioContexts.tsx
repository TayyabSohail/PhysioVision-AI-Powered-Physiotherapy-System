// /contexts/AudioContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface AudioContextType {
  audiobot: "on" | "off";
  language: "en" | "ur" | "";
  setAudiobot: (value: "on" | "off") => void;
  setLanguage: (value: "en" | "ur" | "") => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [audiobot, setAudiobotState] = useState<"on" | "off">("off");
  const [language, setLanguageState] = useState<"en" | "ur" | "">("");

  // On mount, load saved state
  useEffect(() => {
    const savedAudiobot = localStorage.getItem("audiobot") as
      | "on"
      | "off"
      | null;
    const savedLanguage = localStorage.getItem("language") as
      | "en"
      | "ur"
      | ""
      | null;
    if (savedAudiobot) setAudiobotState(savedAudiobot);
    if (savedLanguage) setLanguageState(savedLanguage);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("audiobot", audiobot);
  }, [audiobot]);

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const setAudiobot = (value: "on" | "off") => setAudiobotState(value);
  const setLanguage = (value: "en" | "ur" | "") => setLanguageState(value);

  return (
    <AudioContext.Provider
      value={{ audiobot, language, setAudiobot, setLanguage }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};
