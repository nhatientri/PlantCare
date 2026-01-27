# PlantCare Frontend

The modern web interface for the PlantCare smart watering system.

## 🌿 Overview

This frontend application provides a real-time dashboard to monitor and control your PlantCare devices. Built with **React 19** and styled with a fresh "Planty" theme using **Tailwind CSS**, it offers a premium user experience for plant management.

## ✨ Features

- **Real-time Dashboard**: Live updates for Soil Moisture, Temperature, Humidity, and Weather Forecast.
- **Smart Control**: 
    - **Water Now**: Manual watering with dynamic state feedback (Watering, Soaking, Error).
    - **Threshold**: Adjustable moisture threshold with auto-save.
- **Interactive Charts**: 
    - Historical data visualization (1 Day, 7 Days, 1 Month).
    - Multi-sensor support with individual color-coded lines.
    - Reference threshold line.
- **Device Management**: 
    - "Plant Details" with sensor calibration (Air/Water values).
    - Color customization for each plant/sensor.
    - System Error resolution workflow.
- **Navigation**: Sidebar navigation for Dashboard, Analytics, Logs, and Settings (placeholder views included).

## 🛠 Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Communication**: Socket.IO Client (Real-time updates), Fetch API (History)

## 📂 Project Structure

```bash
src/
├── components/
│   ├── common/         # Reusable UI components (Card, Modal, etc.)
│   ├── dashboard/      # Dashboard-specific components (Chart, Stats, SensorRow)
│   ├── layout/         # App layout (Sidebar, Header, RightPanel)
│   └── views/          # Page views (Analytics, Logs, Settings)
├── constants.js        # Global constants (Colors, API URL)
├── index.css           # Tailwind & Global Styles
├── App.jsx             # Main Application Logic
└── main.jsx            # Entry Point
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Backend server running on `http://localhost:3000`

### Installation

1. Navigate to the frontend directory:
   ```sh
   cd frontend
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Start the development server:
   ```sh
   npm run dev
   ```

4. Open your browser at `http://localhost:5173`

## 🎨 Theme Customization

The theme is defined in `tailwind.config.js` and uses a curated palette:
- **Background**: Soft Mint (`#eff5f1`)
- **Cards**: White with soft shadows
- **Accents**: Deep Green (`#0f3932`) and Terracotta (`#e68e50`)

## 📝 Configuration

- **API URL**: Configured in `src/constants.js` (default: `http://localhost:3000`)
- **Sensor Colors**: 11 Presets available (`src/constants.js`)
