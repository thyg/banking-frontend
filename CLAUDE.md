# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RT-ComOps is a French ERP (Enterprise Resource Planning) system for business operations management. The project consists of:
- **Frontend** (`/RT-ComOps`) - Next.js application
- **Backend** (`/backend`) - Spring Boot reactive API (Treasury module)
- **Infrastructure** (`/erp-infrastructure`) - Docker Compose for databases

## Frontend Commands (RT-ComOps/)

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run lint         # Lint codebase
npm run json-server  # Mock API server (port 3001)
```

## Backend Commands (backend/)

```bash
./mvnw spring-boot:run     # Start backend (http://localhost:8080)
./mvnw clean package       # Build JAR
./mvnw test                # Run tests
```

Requires PostgreSQL running on port 5432 with database `treasury_db`.

## Frontend Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **UI Components:** Shadcn/UI (new-york style)
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod
- **Data Fetching:** SWR + native fetch

## Backend Tech Stack

- **Framework:** Spring Boot 3.2 (WebFlux - reactive)
- **Language:** Java 17
- **Database:** PostgreSQL with R2DBC (reactive)
- **Migrations:** Liquibase
- **Mapping:** MapStruct + Lombok
- **API Docs:** SpringDoc OpenAPI (Swagger at `/api/swagger-ui.html`)

## Frontend Architecture

### Directory Structure

- `/app` - Next.js App Router pages
  - `/(dashboard)/` - Route group for authenticated ERP pages
- `/components` - React components by feature
  - `/ui/` - Shadcn/UI base components
  - `/layout/` - Header, Sidebar, navigation
  - `/banking/`, `/customers/`, `/products/`, etc. - Feature components
- `/lib` - API layer and utilities
  - `api.ts` - Centralized backend API functions
  - `/api/` - Module-specific API helpers
- `/hooks` - Zustand stores and React hooks
- `/types` - TypeScript interfaces by domain
- `/config` - Navigation configuration

### Module System

ERP modules defined in `/config/navigation.ts`:
- **Ventes** (Sales) - Customers, invoices, orders
- **Stock** - Products, suppliers, warehouse
- **Trésorerie** (Treasury) - Bank accounts, transactions, reconciliation
- **Personnel** - Employees
- **Paramètres** (Settings) - Company, users, fiscal years

### Path Aliases

Use `@/` prefix: `@/components`, `@/lib`, `@/hooks`, `@/types`, `@/config`

## Backend Architecture

### Package Structure (`com.rtcomops.treasury`)

- `/controller` - REST endpoints (reactive `Mono`/`Flux` returns)
- `/service` - Business logic
- `/repository` - R2DBC reactive repositories
- `/entity` - Database entities with `@Table` annotations
- `/dto/request` - Input DTOs with validation
- `/dto/response` - Output DTOs
- `/mapper` - MapStruct entity-DTO mappers
- `/config` - CORS, R2DBC, Liquibase, OpenAPI config
- `/exception` - Custom exceptions and handlers

### Entity Pattern

Entities implement `Persistable<UUID>` with manual `isNew` tracking for R2DBC:
```java
@Table(schema = "treasury", name = "bank_accounts")
public class BankAccount implements Persistable<UUID> {
    @Transient
    private boolean isNew = true;
}
```

### API Endpoints

All endpoints under `/api/` prefix:
- `/api/banks` - Bank management
- `/api/bank-accounts` - Account management
- `/api/transactions` - Transaction operations
- `/api/reconciliation` - Bank reconciliation
- `/api/checks` - Check management

## Infrastructure

PostgreSQL via Docker (see erp-infrastructure or run locally):
```bash
# Database: treasury_db
# User: treasury_user
# Port: 5432
```

## Language Notes

- UI text and some code comments are in French
- This is a French ERP application
