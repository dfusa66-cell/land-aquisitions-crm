import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        field: "#f5f7f4",
        moss: "#47624f",
        clay: "#b4664d",
        gold: "#c2963f"
      }
    }
  },
  plugins: []
};

export default config;
