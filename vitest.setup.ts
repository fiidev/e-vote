import { config as loadDotenv } from "dotenv";

// Load .env di worker context (vitest tidak load otomatis).
// Dibutuhkan oleh test yang meng-import lib/env (email/excel).
loadDotenv({ quiet: true });
