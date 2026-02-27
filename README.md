# Volta Game Counter

Volta Game Counter is a sleek, modern React Native application built with [Expo](https://expo.dev) designed to track tabletop or local multiplayer games, manage daily funds, and calculate overall revenue and income across days and months.

## 📱 Features

- **Dashboard Overview**: Get an immediate birds-eye view of your grand **Total Balance** across all recorded days and months.
- **Monthly Tracking**: A horizontally scrollable timeline summarizes recorded income on a month-by-month basis.
- **Interactive Calendar**: powered by `react-native-calendars`. Navigate through months, quickly see which days have activity, and tap any day to view or edit its details.
- **Daily Game Logging**: 
  - Manage a starting "Fund" for the day.
  - Log multiple games with Player 1 and Player 2 scores.
  - Easily edit or delete existing game records.
- **Automated Calculations**:
  - **Revenue**: Difference between Player 2's score and Player 1's score.
  - **Income**: Automatically calculated as `Revenue * 70` (configurable logic in the day view).
  - **Daily Total**: Combined sum of the daily `Fund` and calculated `Income`.
- **Data Persistence**: All game entries and funds are stored locally and reliably using `@react-native-async-storage/async-storage`.
- **Responsive & Modern UI**: Built with local styling, incorporating a clean, premium interface with Indigo, Emerald, and Rose color accents.

## 🛠 Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) / [Expo](https://expo.dev/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Local Storage**: `@react-native-async-storage/async-storage`
- **UI Components**: `react-native-calendars`, `react-native-safe-area-context`

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Expo development server:
   ```bash
   npm start
   ```
   *Alternatively, you can use `npx expo start`.*

### Running the App

In the terminal output, you'll see a QR code. You can run the app using one of the following methods:
- **Physical Device**: Download the [Expo Go](https://expo.dev/go) app on your iOS or Android device and scan the QR code.
- **iOS Simulator**: Press `i` in the terminal (Requires Xcode installed on Mac).
- **Android Emulator**: Press `a` in the terminal (Requires Android Studio installed).
- **Web**: Press `w` in the terminal to view a web rendering.

## 📁 Project Structure

This project uses Expo's file-based routing. Key directories and files include:

- **`app/`**: Contains the application routes and screens.
  - `index.tsx`: The main dashboard containing the total balance, monthly scroll view, and interactive calendar.
  - `day/[date].tsx`: The dynamic daily view where users log specific games, adjust funds, and view daily income calculations.
  - `_layout.tsx`: Root layout configuration for Expo Router.
- **`assets/`**: Contains static assets like images, icons, and splash screens.
- **`app.json`**: Expo configuration file containing app name, bundle identifiers, and plugin setups.

## 🎨 Modifying the App

To modify the game revenue calculation logic, look into `app/day/[date].tsx` and adjust the `income` multplier (currently set to `70`) or the arithmetic used to derive `revenue`.

To reset the project completely and delete all saved data, you can build a script to clear AsyncStorage, or use the in-app "Clear Month" functionality available directly on the main calendar view.
