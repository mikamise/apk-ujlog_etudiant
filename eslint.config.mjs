import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  {
    extends: [...next],
  },
  {
    // Règles du React Compiler (eslint-plugin-react-hooks v7) : signalées en
    // avertissement pour ne pas bloquer le build sur des patterns courants
    // (lecture de localStorage / Notification dans useEffect, dataset du <html>).
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);
