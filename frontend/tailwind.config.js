/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f7f9ff",
        surface: "#f7f9ff",
        "surface-container": "#ebeef4",
        "surface-container-low": "#f1f4fa",
        "surface-container-lowest": "#ffffff",
        "surface-bright": "#f7f9ff",
        primary: "#00478d",
        "primary-container": "#005eb8",
        "on-surface": "#181c20",
        "on-surface-variant": "#424752",
        "outline-variant": "#c2c6d4",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        "tertiary-container": "#9f4300",
        "on-tertiary-fixed": "#341100",
        "secondary-container": "#75f999",
        "on-secondary-container": "#007236",
        tertiary: "#793100"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Manrope", "sans-serif"],
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"]
      },
      boxShadow: {
        "ambient": "0 8px 32px rgba(24, 28, 32, 0.06)",
      }
    },
  },
  plugins: [],
}
