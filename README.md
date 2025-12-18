
# Chip Maestro: The Premier SaaS Platform for Poker Club Management

**Chip Maestro** is an all-in-one SaaS solution designed to streamline poker club operations. It provides real-time tracking of every chip, secure WhatsApp-based OTP verification for transactions, and powerful AI-driven insights to ensure fair play.

---

## Core Features Walkthrough

### 1. Multi-Club Architecture
- **Super Admin Control**: A Super Admin can create, manage, and oversee multiple distinct poker clubs from a single interface.
- **Isolated Environments**: Each club has its own set of players, venues, and game histories, ensuring data privacy and organization.
- **Club-Specific Settings**: Configure unique settings for each club, including WhatsApp API credentials and game rules like deck change intervals.

### 2. Robust User Roles & Permissions
- **Super Admin**: Has global oversight and can manage all clubs and users.
- **Club Admin**: Manages a specific club, including its players, games, and settings.
- **Banker**: A trusted player role with permissions to manage buy-ins and chip counts during a game.
- **Player**: Can join games, request buy-ins, and view their own game history.

### 3. Advance Seat Booking & Waiting Lists
- **Schedule Games**: Admins can schedule games for future dates, setting the start time and total number of available seats.
- **Player Booking**: Players see a list of all upcoming games on their dashboard and can book a seat with a single click.
- **WhatsApp OTP Confirmation**: To prevent fake bookings, players confirm their seat by entering a 4-digit OTP sent directly to their WhatsApp.
- **Automated Waiting List**: If a game is full, players can join a waiting list. When a confirmed player cancels, the first person on the waiting list is automatically promoted and notified via WhatsApp that their seat is confirmed.

### 4. Real-Time Game Management
- **Live Dashboard**: The central hub for active games. Admins and Bankers can see player buy-ins, chip counts, and profit/loss in real-time.
- **Secure Buy-in Workflow**: Players can request buy-ins directly from their dashboard. Admins receive instant notifications to approve requests.
- **OTP Verification**: For enhanced security, an optional WhatsApp-based OTP system ensures that every buy-in is verified by the player before it's confirmed.
- **Save Progress**: Admins can save snapshots of the game's state at any point, creating a timeline of player performance.

### 5. Powerful AI-Driven Tools
- **Anomaly Detection**: Leverage AI to analyze a player's buy-in patterns in the current game against their historical data. The system flags unusual activity with an "anomaly score" and provides a detailed explanation.
- **AI-Powered Game Import**: Seamlessly import game logs from other applications. Paste the raw text, and the AI will parse it into a structured game history, automatically creating new player profiles as needed.

### 6. Comprehensive Reporting & Analytics
- **Game Reports**: At the end of each game, generate a detailed report that includes:
  - Player summaries (P/L, total buy-ins).
  - Final chip distribution charts.
  - Automated settlement calculations showing the most efficient money transfers between players.
- **Historical Analysis**: The reports page provides powerful filtering options by date range, players, and venues, allowing for in-depth analysis of performance over time.
- **Visual Dashboards**: View historical data through various charts, including bar, line, pie, and scatter plots for deeper insights.

### 7. Administrative Tools
- **Player & Venue Merging**: Clean up your data by merging duplicate player profiles or venue entries. The system automatically updates all historical game records to reflect the changes.
- **Group Messaging**: Admins can send broadcast messages to all club members via WhatsApp directly from the dashboard.

---

## Built with Firebase Studio

This entire application was developed in collaboration with **Firebase Studio**, an AI-powered coding partner. Here’s how it helped bring Chip Maestro to life:

- **Conversational Development**: Instead of writing every line of code from scratch, features were built by describing them in plain English. Firebase Studio translated those ideas into clean, production-ready Next.js and React code.
- **Rapid Prototyping**: Complex features like the secure buy-in workflows, real-time Firestore synchronization, and AI-driven anomaly detection were implemented in a fraction of the time it would take traditionally.
- **Iterative Refinement**: We could instantly adjust the UI, change component behavior, and fix bugs through simple conversation, making the development process fluid and highly efficient.
- **Modern Tech Stack**: Firebase Studio expertly utilized a modern tech stack, incorporating ShadCN for UI components, Tailwind CSS for styling, and Genkit for integrating generative AI features, ensuring the app is both beautiful and powerful.

---

## Getting Started

To run the application in a development environment, follow these steps:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run the Development Server:**
    ```bash
    npm run dev
    ```

3.  Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to see the application.
