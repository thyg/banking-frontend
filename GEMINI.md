# GEMINI.md: Project Analysis for RT-ComOps

## Project Overview

This is a comprehensive ERP (Enterprise Resource Planning) web application with a decoupled frontend and backend.

-   **Frontend (`RT-ComOps/`):** A modern web application built with Next.js 14 (App Router), TypeScript, and Tailwind CSS. It features a rich user interface with Shadcn/UI components and manages client-side state with Zustand.
-   **Backend (`backend/`):** A reactive API built with Java 17, Spring Boot 3, and Spring WebFlux. It uses a PostgreSQL database with reactive access via R2DBC and manages database schema with Liquibase.

The two parts are designed to work together, with the Next.js frontend making API calls to the Spring Boot backend. For development, the frontend can also be connected to a mock API powered by `json-server`.

## Frontend (`RT-ComOps/`)

### Building and Running

#### Prerequisites

-   Node.js (version 20.x or later)
-   npm

#### Installation

To install project dependencies, run the following command in the `RT-ComOps/` directory:

```bash
npm install
```

#### Running the Application

There are two main processes to run for a complete development environment: the Next.js frontend and the mock API server.

1.  **Start the Frontend:**
    This command starts the Next.js development server on `http://localhost:3000`.

    ```bash
    npm run dev
    ```

2.  **Start the Mock API Server (Optional):**
    This command starts the `json-server` on `http://localhost:3001`, serving data from `db.json`. This is useful for developing the frontend without a live backend.

    ```bash
    npm run json-server
    ```

#### Other Key Commands

-   **Build for Production:**
    ```bash
    npm run build
    ```
-   **Run Production Server:**
    ```bash
    npm run start
    ```
-   **Lint the Code:**
    ```bash
    npm run lint
    ```

## Backend (`backend/`)

### Building and Running

#### Prerequisites

-   Java 17
-   Maven

#### Running the Application

To run the backend server, execute the following Maven command in the `backend/` directory. By default, it will start on `http://localhost:8080`.

```bash
./mvnw spring-boot:run
```

Or if you don't have the Maven wrapper:

```bash
mvn spring-boot:run
```

### Database

The backend is configured to connect to a PostgreSQL database. Ensure you have a running PostgreSQL instance and configure the connection details in `backend/src/main/resources/application.yml`. Database migrations are handled automatically by Liquibase on startup.

## Project Linkage

The frontend and backend are linked via API calls. The frontend's API request functions are centralized in `RT-ComOps/lib/api.ts`. By default, it expects the backend to be available at `http://localhost:8080`.

For a full development setup, you should have:
1.  The Spring Boot backend running (`mvn spring-boot:run` in `backend/`).
2.  The Next.js frontend running (`npm run dev` in `RT-ComOps/`).
3.  A PostgreSQL database running and configured for the backend.