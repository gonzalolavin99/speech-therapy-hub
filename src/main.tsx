import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

registerSW({ immediate: true });

// Versiones anteriores cacheaban respuestas de la API (datos clínicos) en el
// service worker; se borra esa caché en los navegadores que la tengan.
if ("caches" in window) {
  caches.delete("supabase-api").catch(() => {});
}
