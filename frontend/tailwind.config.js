/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'plant-bg': '#E6EBE6', // Slightly darker, more sage-grey background
        'plant-card': '#FFFFFF',
        'plant-dark': '#132A13', // Deep Forest Green (richer)
        'plant-accent': '#EC9F05', // Warmer Amber/Orange
        'plant-highlight': '#DCE6DC', // Hover state
        'plant-green': '#4F772D', // Muted natural green
        'plant-text-secondary': '#7D8C7D', // Sage-grey text
      }
    },
  },
  plugins: [],
}
