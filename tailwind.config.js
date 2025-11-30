/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    "./App.{js,ts,tsx}",
    "./components/**/*.{js,ts,tsx}",
    "./app/**/*.{js,ts,tsx}",
    "./global.css", // Include global.css
  ],
  theme: {
    extend: {
      fontFamily: {
        'outfit': ['Outfit_400Regular'],
        'outfit-bold': ['Outfit_700Bold'],
        'noto': ['Noto_Sans_400Regular'],
        'noto-bold': ['Noto_Sans_700Bold'],
        lora: ['Lora_400Regular'],
        'lora-bold': ['Lora_700Bold'],
      },
      spacing: {
        global: '16px'
      },
      colors: {
        highlight: '#0EA5E9',
        light: {
          primary: '#1E303E', // PrincipalBackground
          secondary: '#2f4f68ff', // CardBackground
          text: '#222222', // CardText
          success: '#49B3A0', // SuccessColor
          torch: '#CF902A', // TorchIcon
        },
        dark: {
          primary: '#0f172a', // Darker background for dark mode
          secondary: '#1E303E', // Reusing PrincipalBackground as card background for dark mode
          text: '#F3F4F6', // Light text
          success: '#34D399', // Slightly lighter success color
          torch: '#FBBF24', // Lighter torch icon
        },
      },
    },
  },
  plugins: [],
};