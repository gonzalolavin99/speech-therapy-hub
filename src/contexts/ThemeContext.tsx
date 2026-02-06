import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ColorTheme = "teal" | "sky" | "rose" | "lavender" | "mint";

interface ThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themeColors: Record<ColorTheme, { name: string; preview: string }> = {
  teal: { name: "Verde Agua", preview: "hsl(174, 62%, 40%)" },
  sky: { name: "Celeste Pastel", preview: "hsl(199, 89%, 65%)" },
  rose: { name: "Rosa Suave", preview: "hsl(350, 80%, 72%)" },
  lavender: { name: "Lavanda", preview: "hsl(270, 60%, 70%)" },
  mint: { name: "Menta", preview: "hsl(158, 64%, 52%)" },
};

const themeVariables: Record<ColorTheme, Record<string, string>> = {
  teal: {
    "--primary": "174 62% 40%",
    "--ring": "174 62% 40%",
    "--sidebar-primary": "174 62% 40%",
    "--sidebar-ring": "174 62% 40%",
    "--sidebar-background": "174 40% 97%",
    "--sidebar-accent": "174 30% 92%",
  },
  sky: {
    "--primary": "199 89% 65%",
    "--ring": "199 89% 65%",
    "--sidebar-primary": "199 89% 55%",
    "--sidebar-ring": "199 89% 55%",
    "--sidebar-background": "199 50% 97%",
    "--sidebar-accent": "199 40% 92%",
  },
  rose: {
    "--primary": "350 80% 65%",
    "--ring": "350 80% 65%",
    "--sidebar-primary": "350 80% 60%",
    "--sidebar-ring": "350 80% 60%",
    "--sidebar-background": "350 50% 97%",
    "--sidebar-accent": "350 40% 93%",
  },
  lavender: {
    "--primary": "270 60% 65%",
    "--ring": "270 60% 65%",
    "--sidebar-primary": "270 60% 58%",
    "--sidebar-ring": "270 60% 58%",
    "--sidebar-background": "270 40% 97%",
    "--sidebar-accent": "270 35% 92%",
  },
  mint: {
    "--primary": "158 64% 45%",
    "--ring": "158 64% 45%",
    "--sidebar-primary": "158 64% 40%",
    "--sidebar-ring": "158 64% 40%",
    "--sidebar-background": "158 40% 97%",
    "--sidebar-accent": "158 35% 92%",
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem("color-theme") as ColorTheme;
    return saved || "teal";
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
