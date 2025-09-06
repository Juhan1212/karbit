# GEMINI Analysis of the Karbit Project

## Project Overview

This project, named "karbit," is a full-stack web application for cryptocurrency trading. It appears to be a sophisticated platform that allows users to connect to multiple cryptocurrency exchanges, manage their portfolios, and automate their trading strategies.

The application is built with a modern tech stack:

*   **Frontend:** React with TypeScript, styled with Tailwind CSS. It uses Vite for a fast development experience and server-side rendering with the help of React Router.
*   **Backend:** Node.js with Express.js, also written in TypeScript. It handles API requests, user authentication, and communication with the database.
*   **Database:** PostgreSQL with Drizzle ORM for database access and schema management.
*   **Deployment:** The project is set up for Docker-based deployment.

The database schema reveals a rich set of features, including:

*   User and session management with different subscription plans.
*   Integration with multiple cryptocurrency exchanges (e.g., Binance, Bybit, OKX) via API keys.
*   A system for creating and managing automated trading strategies.
*   Tracking of trading positions and history.
*   Payment processing for subscription plans.

## Building and Running

Here are the key commands for building, running, and testing the project, as inferred from `package.json` and `README.md`:

*   **Install dependencies:**
    ```bash
    npm install
    ```

*   **Run database migrations:**
    ```bash
    npm run db:migrate
    ```

*   **Seed the database:**
    ```bash
    npm run db:seed
    ```

*   **Start the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

*   **Build for production:**
    ```bash
    npm run build
    ```

*   **Start the production server:**
    ```bash
    npm run start
    ```

*   **Run type checking:**
    ```bash
    npm run typecheck
    ```

## Development Conventions

*   **Tech Stack:** The project consistently uses TypeScript for both frontend and backend code.
*   **Styling:** Tailwind CSS is the designated styling solution.
*   **Routing:** Routing is managed by React Router, with routes defined in `app/routes.ts`.
*   **Database:** Drizzle ORM is used for all database interactions, with the schema defined in `database/schema.ts`.
*   **API:** The backend exposes a RESTful API for the frontend to consume. API route handlers are located in `app/routes/api.*.tsx`.
*   **State Management:** Zustand is used for client-side state management, as indicated by the presence of `zustand` in `package.json` and the `app/stores` directory.
*   **Code Style:** While no linter configuration is immediately apparent, the code seems to follow modern JavaScript/TypeScript conventions.
