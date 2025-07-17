# Chip Maestro Poker Manager

This is a Next.js application for managing poker game buy-ins, payouts, and player statistics.

## Getting Started

To run the application in a development environment, follow these steps:

1.  **Install Dependencies:**
    Open a terminal in the project directory and run:
    ```bash
    npm install
    ```

2.  **Run the Development Server:**
    After the installation is complete, start the development server:
    ```bash
    npm run dev
    ```

3.  Open your browser and navigate to [http://localhost:9002](http://localhost:9002) to see the application.

## How to Deploy Your Application

To deploy this Next.js application to your own web server, you will need a server environment with **Node.js** installed. Here is a step-by-step guide to get your application ready for production and run it.

### Step 1: Build the Application

First, you need to create an optimized production build of your application. This compiles your code, optimizes assets, and gets everything ready to be served.

In your project's root directory, run the following command:

```bash
npm run build
```

This command will create a `.next` folder in your project directory. This folder contains the complete, optimized production-ready version of your application.

### Step 2: Deploy to Your Server

Now, you need to get your project files onto your server.

1.  **Copy Files to Server:**
    Copy the following files and directories from your local machine to your server:
    *   The entire `.next` folder (this is your built application).
    *   The `public` folder (for any static assets like images).
    *   The `package.json` and `package-lock.json` (or `yarn.lock`) files.

2.  **Install Production Dependencies:**
    On your server, navigate to the directory where you copied the files and run the following command. This will install only the dependencies needed to run the application in production, which is more efficient than installing all development dependencies.
    ```bash
    npm install --production
    ```

### Step 3: Start the Production Server

Once the dependencies are installed on your server, you can start the application.

Run the following command:

```bash
npm run start
```

This will start the Next.js production server, which is optimized for performance. By default, it will run on port 3000. You should see a message in your terminal like `> Ready on http://localhost:3000`.

### Step 4: Keep It Running (Process Management)

If you close your terminal connection to the server, the application will stop. To keep it running permanently, you should use a process manager like `pm2`.

1.  **Install pm2 globally on your server:**
    ```bash
    npm install pm2 -g
    ```

2.  **Start your application with pm2:**
    Instead of `npm run start`, use this command:
    ```bash
    pm2 start npm --name "chip-maestro" -- start
    ```

`pm2` will now manage your application, automatically restarting it if it crashes and ensuring it stays online.

You can manage your app with commands like `pm2 list`, `pm2 stop chip-maestro`, and `pm2 restart chip-maestro`.

### Step 5: (Optional) Configure a Reverse Proxy

Finally, you probably want your application to be accessible via a standard domain name (e.g., `www.your-app.com`) on port 80/443, rather than `your-server-ip:3000`. To do this, you can use a web server like **Nginx** or **Apache** as a reverse proxy.

The web server will listen for incoming traffic and forward it to your Next.js application running on port 3000. This is a standard practice for deploying Node.js applications.

---

By following these steps, you will have a robust, production-ready deployment of your Chip Maestro application running on your web server.
