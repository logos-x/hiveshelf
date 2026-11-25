import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    server: {
      deps: {
        inline: ["next-intl"],
      },
    },
    environment: "jsdom",
    globals: false,
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.spec.{ts,tsx}"],
  },
});
