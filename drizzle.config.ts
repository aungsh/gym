import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit doesn't auto-load .env.local (that's a Next.js thing)
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
