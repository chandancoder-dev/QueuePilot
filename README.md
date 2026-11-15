# QueuePilot — Queue Management System

> Developed for the **Rugas Full Stack Queue Management Application Assessment**.

QueuePilot is a full-stack queue management application for service managers. Managers can create and manage queues, add people and generate tokens, organize waiting lists, call tokens for service, and review queue activity and performance.

## Features

### Manager Authentication

- Manager registration and login with email and password.
- Password hashing with `bcryptjs`.
- JWT authentication for protected API endpoints and manager screens.
- Session restoration after a browser refresh.

### Queue Management

- Create queues with custom names.
- View queues owned by the signed-in manager.
- Rename, pause, and resume queues.
- Assign each queue a human-readable identifier, such as `QP-101`.

### Token Management

- Add people to a queue and generate sequential token numbers.
- View waiting, serving, completed, and cancelled tokens.
- Reorder waiting tokens.
- Call the next waiting token for service.
- Complete a serving token or cancel a waiting token.

### Analytics Dashboard

- Queue and token summary statistics.
- Average waiting and service durations when available.
- Seven-day queue activity trends.
- Per-queue performance statistics.
- Recent queue activity.

## Technology Stack

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite |
| Styling | Tailwind CSS v4 |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcryptjs |
| API requests | Axios |
| Charts | Recharts |
| Icons | Lucide React |
| Version control | Git, GitHub |

## Project Structure

```text
QueuePilot/
├── .gitignore
├── README.md
├── backend/
│   ├── config/
│   │   ├── cors.js
│   │   └── db.js
│   ├── controllers/
│   │   ├── analyticsController.js
│   │   ├── authController.js
│   │   ├── queueController.js
│   │   └── tokenController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── authRateLimit.js
│   ├── models/
│   │   ├── Manager.js
│   │   ├── Queue.js
│   │   └── Token.js
│   ├── routes/
│   │   ├── analyticsRoutes.js
│   │   ├── authRoutes.js
│   │   ├── queueRoutes.js
│   │   └── tokenRoutes.js
│   ├── utils/
│   │   ├── jwtSecret.js
│   │   └── tokenMetrics.js
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
└── frontend/
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   ├── data/
    │   ├── pages/
    │   ├── services/
    │   ├── utils/
    │   ├── App.jsx
    │   ├── App.css
    │   ├── index.css
    │   └── main.jsx
    ├── .env.example
    ├── .gitignore
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── README.md
    └── vite.config.js
```

Local `.env` files and installed dependencies are not included in the repository.

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB Community Server or a MongoDB Atlas database
- Git

### 1. Clone the repository

```bash
git clone https://github.com/chandancoder-dev/QueuePilot.git
cd QueuePilot
```

### 2. Configure and run the backend

From the project root:

```bash
cd backend
npm install
```

Create a local `.env` file from the example:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux, use `cp .env.example .env`.

Configure the backend environment:

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/queuepilot
JWT_SECRET=<a private random value of at least 32 bytes>
FRONTEND_URL=http://localhost:5173
```

`MONGODB_URI` and `JWT_SECRET` are required. The JWT secret must be at least 32 bytes; generate a strong private value and never commit `.env`. `PORT` defaults to `5000`. The local frontend origin is allowed in development. `CORS_ORIGINS` may also be used for a comma-separated list of exact frontend origins.

Start the backend:

```bash
npm run dev
```

The API is available at `http://localhost:5000`. Its health endpoint is `GET /api/health`.

### 3. Configure and run the frontend

Open another terminal at the project root:

```bash
cd frontend
npm install
```

Create a local `.env` file from the example:

```powershell
Copy-Item .env.example .env
```

Set the API origin:

```dotenv
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

### Production environment

For production, set `NODE_ENV=production`, `MONGODB_URI`, and a strong `JWT_SECRET` in the backend environment. Configure `FRONTEND_URL` or `CORS_ORIGINS` with the exact deployed frontend origin (for example, your Vercel application URL). Set the frontend's `VITE_API_URL` to the deployed backend API origin. Do not put secrets in frontend variables.

The authentication rate limiter uses in-memory storage. Multi-instance deployments should use a shared rate-limit store; deployments behind a reverse proxy should configure Express proxy trust for their hosting topology.

## API Endpoints

Send a valid JWT as `Authorization: Bearer <token>` for protected endpoints. Registration and login are public; `/api/auth/me`, queue, token, and analytics endpoints require authentication. Queue and token endpoints are scoped to the authenticated manager.

For token routes, `:queueId` is the queue's MongoDB ID. The separate human-readable queue identifier is for display.

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a manager |
| `POST` | `/api/auth/login` | Manager login |
| `GET` | `/api/auth/me` | Get the signed-in manager's details |

### Queue Management

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/queues` | Get the signed-in manager's queues |
| `POST` | `/api/queues` | Create a queue |
| `GET` | `/api/queues/:id` | Get queue details |
| `PATCH` | `/api/queues/:id` | Update a queue name or status |

### Token Management

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/queues/:queueId/tokens` | Add a person and generate a token |
| `GET` | `/api/queues/:queueId/tokens` | Get tokens in a queue |
| `PATCH` | `/api/queues/:queueId/tokens/reorder` | Reorder waiting tokens |
| `POST` | `/api/queues/:queueId/tokens/call-next` | Call the next waiting token |
| `PATCH` | `/api/queues/:queueId/tokens/:tokenId/complete` | Complete a token |
| `PATCH` | `/api/queues/:queueId/tokens/:tokenId/cancel` | Cancel a token |
| `GET` | `/api/queues/:queueId/summary` | Get queue summary statistics |

### Analytics

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/analytics/dashboard` | Dashboard statistics |
| `GET` | `/api/analytics/queue-trends` | Seven-day queue activity trends |
| `GET` | `/api/analytics/queue-performance` | Per-queue performance |
| `GET` | `/api/analytics/recent-activity` | Recent queue activity |

## Token Workflow

1. The manager adds a person to a queue.
2. QueuePilot generates the next sequential token number.
3. The token is added to the waiting list.
4. The manager may reorder waiting tokens.
5. **Call Next** assigns the first waiting token for service.
6. The manager marks the serving token as completed. Waiting tokens may be cancelled.

Token statuses are **Waiting**, **Serving**, **Completed**, and **Cancelled**.

## Security

- Passwords are hashed with `bcryptjs`.
- JWT authentication protects manager-specific operations.
- Queue and token operations are restricted to their owning manager.
- Sensitive configuration is read from environment variables; local `.env` files are ignored by Git.
- Login and registration endpoints are rate-limited (10 login attempts per 15 minutes and 5 registrations per hour per client IP).
- CORS uses an environment-configured origin allowlist. Production requires `FRONTEND_URL` or `CORS_ORIGINS`; local development allows `http://localhost:5173`.

## Author

**Chandan K R**

- GitHub: [chandancoder-dev](https://github.com/chandancoder-dev)
- Repository: [chandancoder-dev/QueuePilot](https://github.com/chandancoder-dev/QueuePilot)

Developed as part of the **Rugas Full Stack Queue Management Application Assessment**.
