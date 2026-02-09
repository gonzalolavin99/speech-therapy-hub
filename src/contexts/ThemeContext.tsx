import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Paleta Lux Navia
// Nordic Blue: #67869A - Primary
// Misty Blue: #C6D1D9 - Secondary  
// Light Grey: #F1F1F1 - Background
// Pale Blush: #F4EBE9 - Accent
// Oak Wood: #E7E0D8 - Muted

export type ColorTheme = "nordic" | "misty" | "blush" | "oak" | "ocean";

interface ThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themeColors: Record<ColorTheme, { name: string; preview: string }> = {
  nordic: { name: "Nordic Blue", preview: "#67869A" },
  misty: { name: "Misty Blue", preview: "#C6D1D9" },
  blush: { name: "Pale Blush", preview: "#F4EBE9" },
  oak: { name: "Oak Wood", preview: "#E7E0D8" },
  ocean: { name: "Ocean Deep", preview: "#4A6B7C" },
};

const themeVariables: Record<ColorTheme, Record<string, string>> = {
  nordic: {
    // Nordic Blue #67869A como primario
    "--primary": "204 22% 50%",
    "--ring": "204 22% 50%",
    "--sidebar-primary": "204 22% 50%",
    "--sidebar-ring": "204 22% 50%",
    "--sidebar-background": "204 18% 96%",
    "--sidebar-accent": "204 18% 90%",
    "--secondary": "204 18% 81%",
    "--muted": "32 24% 88%",
    "--accent": "11 28% 93%",
  },
  misty: {
    // Misty Blue #C6D1D9 como primario (más suave)
    "--primary": "204 18% 63%",
    "--ring": "204 18% 63%",
    "--sidebar-primary": "204 18% 58%",
    "--sidebar-ring": "204 18% 58%",
    "--sidebar-background": "204 15% 96%",
    "--sidebar-accent": "204 15% 90%",
    "--secondary": "204 22% 75%",
    "--muted": "32 20% 90%",
    "--accent": "11 25% 94%",
  },
  blush: {
    // Pale Blush #F4EBE9 inspirado
    "--primary": "11 35% 65%",
    "--ring": "11 35% 65%",
    "--sidebar-primary": "11 35% 60%",
    "--sidebar-ring": "11 35% 60%",
    "--sidebar-background": "11 28% 96%",
    "--sidebar-accent": "11 25% 92%",
    "--secondary": "11 20% 85%",
    "--muted": "32 20% 88%",
    "--accent": "204 18% 90%",
  },
  oak: {
    // Oak Wood #E7E0D8 inspirado (cálido)
    "--primary": "32 30% 55%",
    "--ring": "32 30% 55%",
    "--sidebar-primary": "32 30% 50%",
    "--sidebar-ring": "32 30% 50%",
    "--sidebar-background": "32 24% 96%",
    "--sidebar-accent": "32 20% 90%",
    "--secondary": "32 18% 82%",
    "--muted": "32 15% 88%",
    "--accent": "11 20% 92%",
  },
  ocean: {
    // Versión más oscura de Nordic Blue
    "--primary": "204 25% 40%",
    "--ring": "204 25% 40%",
    "--sidebar-primary": "204 25% 35%",
    "--sidebar-ring": "204 25% 35%",
    "--sidebar-background": "204 20% 95%",
    "--sidebar-accent": "204 18% 88%",
    "--secondary": "204 18% 75%",
    "--muted": "32 20% 88%",
    "--accent": "11 25% 92%",
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem("color-theme") as ColorTheme;
    // Si el tema guardado no es válido, usar nordic como default
    const validThemes: ColorTheme[] = ["nordic", "misty", "blush", "oak", "ocean"];
    return validThemes.includes(saved) ? saved : "nordic";
  });

  useEffect(() => {
    localStorage.setItem("color-theme", colorTheme);
    const root = document.documentElement;
    const variables = themeVariables[colorTheme];
    
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [colorTheme]);

  return (
    <ThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
