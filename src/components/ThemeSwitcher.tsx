import { Palette, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, themeColors, ColorTheme, DarkMode } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { colorTheme, setColorTheme, darkMode, setDarkMode } = useTheme();

  const darkModeOptions: { value: DarkMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Oscuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Dark mode options */}
        <div className="px-2 py-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Modo</p>
          <div className="flex gap-1">
            {darkModeOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setDarkMode(opt.value)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    darkMode === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <DropdownMenuSeparator />
        {/* Color theme options */}
        <div className="px-2 py-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Color</p>
        </div>
        {(Object.keys(themeColors) as ColorTheme[]).map((theme) => (
          <DropdownMenuItem
            key={theme}
            onClick={() => setColorTheme(theme)}
            className={cn(
              "flex items-center gap-3 cursor-pointer",
              colorTheme === theme && "bg-accent"
            )}
          >
            <div
              className="h-5 w-5 rounded-full border-2 border-border"
              style={{ backgroundColor: themeColors[theme].preview }}
            />
            <span>{themeColors[theme].name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
