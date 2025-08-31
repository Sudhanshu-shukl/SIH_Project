# **App Name**: RailFlow

## Core Features:

- Network Layout Visualization: Display the railway network with stations as distinct nodes and tracks as SVG polylines based on a hardcoded JSON configuration.
- Train Representation & Animation: Represent trains as animated circles moving along predefined SVG paths. Train colors indicate status: green for moving, red for stopped. The position data updates are triggered directly by database updates, without any tool.
- Real-Time Data Hover Popups: Display train metadata (ID, speed, ETA, platform) in a tooltip on hover using React and custom components.
- Firestore Data Integration: Connect the React frontend to Firebase Firestore to stream live train metadata and states.
- Dynamic Path Adjustment: When a train is delayed (status changed to stopped), use an AI-powered schedule optimization tool to adjust the paths and timing of other trains dynamically.
- Train Status Color Coding: Visually represent the real-time status of trains (moving or stopped) using green and red color codes. Updates are triggered automatically via firebase updates, without any tool.
- Train Details Sidebar: On clicking a train, display a sidebar with detailed journey information pulled from Firebase.

## Style Guidelines:

- Primary color: Saturated blue (#4285F4) for a modern and trustworthy feel, evoking technology and reliability.
- Background color: Light gray (#F5F5FA), creating a clean and non-distracting backdrop.
- Accent color: Analogous violet (#7B61FF), creating a visually engaging UI.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines and 'Inter' (sans-serif) for body text, ensuring readability and a modern aesthetic.
- Use simplified, geometric icons for stations and other key elements to maintain a clean, informative interface.
- Implement a clear, structured layout to showcase the rail network map prominently, with a side panel for train details and controls.
- Employ smooth, subtle animations for train movements and status transitions to enhance user experience and provide real-time feedback.