
# Chip Maestro: The Premier SaaS Platform for Poker Club Management

Welcome to **Chip Maestro**, the ultimate all-in-one SaaS solution for managing poker clubs of any size. Say goodbye to messy spreadsheets and complicated payout calculations. This interactive application handles everything from player buy-ins to final settlements, all in real-time, with robust support for multiple, independent clubs.

Built with Next.js, Firebase, and Tailwind CSS, Chip Maestro offers a seamless and modern experience for club owners, admins, and players.

## SaaS Architecture & Key Features

Chip Maestro is designed from the ground up as a multi-tenant SaaS platform, ensuring that each club's data is secure and completely isolated.

- **Multi-Tenancy "Club" Model**: Each club operates as a separate, secure tenant. All players, games, venues, and settings are scoped to a specific `clubId`, guaranteeing data privacy.
- **Club-Specific Roles & Permissions**:
  - **Club Owner**: Manages the club's subscription, settings, and has the highest level of control.
  - **Club Admin**: Appointed by the Owner to manage daily operations like games and players.
  - **Club Banker**: A trusted member who can handle in-game financial transactions like buy-ins and cash-outs.
  - **Club Member**: A standard player with access to games and their personal history.
- **Subscription Tiers**: A flexible model (e.g., Free, Pro) to cater to different club sizes and needs. Pro tiers unlock advanced features, unlimited history, and customization options.

## Core Functionality

- **Seamless Onboarding**: New users can sign up and instantly create their own club, becoming the Club Owner.
- **Dynamic Player Management**: Easily add, remove, or manage roles for players within your club. A clean, tab-based interface allows for quick switching between player details during a live game.
- **Secure Buy-in Workflow**: Players can request buy-ins directly from their interface. Admins and Bankers receive instant pop-up notifications and can approve requests securely.
- **Real-Time Calculations**: All buy-ins, chip counts, and profit/loss values are calculated and updated in real-time for all participants, powered by Firebase Firestore.
- **Automated Settlement**: At the end of the game, Chip Maestro automatically calculates the most efficient money transfers needed to settle all debts, minimizing the number of transactions between players.
- **AI-Powered Anomaly Detection**: A cutting-edge tool for admins to analyze a player's buy-in patterns against their history, helping to detect unusual or potentially suspicious activity.
- **Comprehensive Reporting**: Generate and export detailed PDF reports of final standings, including profit/loss charts and chip distribution, perfect for record-keeping.
- **Effortless Game Import**: Got a game log from another app? Paste it into the import tool, and our AI will parse it to create a complete game history, including players, buy-ins, and results.

---

## Built with Firebase Studio

This entire application was developed in collaboration with **Firebase Studio**, an AI-powered coding partner. Here’s how it helped bring Chip Maestro to life:

- **Conversational Development**: Instead of writing every line of code from scratch, features were built by describing them in plain English. Firebase Studio translated those ideas into clean, production-ready Next.js and React code.
- **Rapid Prototyping**: Complex features like the secure buy-in workflows, real-time Firestore synchronization, and AI-driven anomaly detection were implemented in a fraction of the time it would take traditionally.
- **Iterative Refinement**: We could instantly adjust the UI, change component behavior, and fix bugs through simple conversation, making the development process fluid and highly efficient.
- **Modern Tech Stack**: Firebase Studio expertly utilized a modern tech stack, incorporating ShadCN for UI components, Tailwind CSS for styling, and Genkit for integrating generative AI features, ensuring the app is both beautiful and powerful.

Chip Maestro is a testament to how conversational AI is changing the way we build software, making it possible for anyone to turn a great idea into a fully functional application.

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

3.  Open your browser and navigate to [http://localhost:9002](http://localhost:9002) to see the application.
