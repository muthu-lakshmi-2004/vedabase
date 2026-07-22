import { createContext, useContext, useState, ReactNode } from "react";

export interface DisplaySettings {
  mantra: boolean;
  synonyms: boolean;
  translation: boolean;
  purport: boolean;
}

interface DisplaySettingsContextValue {
  settings: DisplaySettings;
  toggle: (key: keyof DisplaySettings) => void;
}

const defaultSettings: DisplaySettings = {
  mantra: true,
  synonyms: true,
  translation: true,
  purport: true,
};

const DisplaySettingsContext = createContext<DisplaySettingsContextValue | null>(null);

export function DisplaySettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DisplaySettings>(defaultSettings);

  const toggle = (key: keyof DisplaySettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <DisplaySettingsContext.Provider value={{ settings, toggle }}>
      {children}
    </DisplaySettingsContext.Provider>
  );
}

export function useDisplaySettings() {
  const ctx = useContext(DisplaySettingsContext);
  if (!ctx) throw new Error("useDisplaySettings must be used within DisplaySettingsProvider");
  return ctx;
}