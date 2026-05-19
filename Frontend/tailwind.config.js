export default {
  darkMode: 'class',
  content: ["./index.html", "./app.jsx", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Manrope", "sans-serif"]
      },
      animation: {
        fadeUp: "fadeUp .75s ease forwards",
        riseSoft: "riseSoft .55s ease forwards",
        floatSlow: "floatSlow 7s ease-in-out infinite",
        glowPulse: "glowPulse 2.8s ease-in-out infinite",
        driftX: "driftX 12s ease-in-out infinite",
        zoomSlow: "zoomSlow 16s ease-in-out infinite"
      }
    }
  },
  plugins: []
};