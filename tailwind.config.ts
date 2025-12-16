import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    // C'est ici que Tailwind cherche tes classes.
    // Si tes fichiers sont dans 'app', il DOIT y avoir cette ligne :
    "./app/**/*.{js,ts,jsx,tsx,mdx}", 
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;