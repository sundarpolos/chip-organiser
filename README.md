
# Smart Club Organiser: The Ultimate Poker Game Manager

Welcome to **Smart Club Organiser**, your all-in-one solution for managing poker nights with ease and precision. Say goodbye to messy spreadsheets and complicated payout calculations. This interactive application handles everything from player buy-ins to final settlements, all in real-time.

Built with Next.js, Firebase, and Tailwind CSS, Smart Club Organiser offers a seamless and modern experience for both game administrators and players.

## Key Features

- **Dynamic Player Management**: Easily add or remove players during a live game. A clean, tab-based interface allows for quick switching between player details.
- **Secure Buy-in Workflow**: Players can request buy-ins directly from their interface. Admins receive instant pop-up notifications and can approve requests by sending a secure, one-time password (OTP) via WhatsApp.
- **Real-Time Calculations**: All buy-ins, chip counts, and profit/loss values are calculated and updated in real-time for all participants, powered by Firebase Firestore.
- **Automated Settlement**: At the end of the game, Smart Club Organiser automatically calculates the most efficient money transfers needed to settle all debts, minimizing the number of transactions between players.
- **Live Game Timer**: Keep track of the session duration with a persistent game timer.
- **AI-Powered Anomaly Detection**: A cutting-edge tool for admins to analyze a player's buy-in patterns against their history, helping to detect unusual or potentially suspicious activity.
- **Comprehensive Reporting**: Generate and export detailed PDF reports of the final standings, including profit/loss charts and chip distribution, perfect for record-keeping.
- **Effortless Game Import**: Got a game log from another app? Paste it into the import tool, and our AI will parse it to create a complete game history, including players, buy-ins, and results.
- **Role-Based Access**: A clear distinction between Admins and Players ensures that game management is secure and straightforward. Admins have full control, while players have a simplified interface focused on their own game.

---

## Built with Firebase Studio

This entire application was developed in collaboration with **Firebase Studio**, an AI-powered coding partner. Here’s how it helped bring Smart Club Organiser to life:

- **Conversational Development**: Instead of writing every line of code from scratch, features were built by describing them in plain English. Firebase Studio translated those ideas into clean, production-ready Next.js and React code.
- **Rapid Prototyping**: Complex features like the WhatsApp OTP verification flow, real-time Firestore synchronization, and AI-driven anomaly detection were implemented in a fraction of the time it would take traditionally.
- **Iterative Refinement**: We could instantly adjust the UI, change component behavior, and fix bugs through simple conversation, making the development process fluid and highly efficient.
- **Modern Tech Stack**: Firebase Studio expertly utilized a modern tech stack, incorporating ShadCN for UI components, Tailwind CSS for styling, and Genkit for integrating generative AI features, ensuring the app is both beautiful and powerful.

Smart Club Organiser is a testament to how conversational AI is changing the way we build software, making it possible for anyone to turn a great idea into a fully functional application.

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
