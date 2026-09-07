import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        field: "#f3f6f2",
        moss: "#3f6b4e",
        grove: "#1f6b45",
        clay: "#b4664d",
        gold: "#c2963f"
      }
    }
  },
  plugins: []
};

export default config;
