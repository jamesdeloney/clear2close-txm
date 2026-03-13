# Clear2Close Transaction Management

Real estate transaction workflow automation for listing agents. Automates task management, email sequences, and stage progression from pre-listing through closing.

## Setup

1. **Clone the repo**

   ```bash
   git clone <your-repo-url>
   cd clear2close-txm
   ```

2. **Install dependencies**

   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Fill in `DATABASE_URL` with your Railway PostgreSQL connection string.

4. **Run database migration**

   ```bash
   npm run migrate
   ```

   This creates all tables and inserts seed data (workflow stages, default tasks, email templates).

5. **Start development**

   ```bash
   npm run dev
   ```

   - Express API: http://localhost:4000
   - React client: http://localhost:5173

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/transactions` | List all active transactions |
| POST | `/api/transactions` | Create transaction (auto-triggers pre-listing workflow) |
| GET | `/api/transactions/:id` | Full transaction detail with tasks and emails |
| PATCH | `/api/transactions/:id` | Update transaction fields |
| PATCH | `/api/transactions/:id/stage` | Advance to next stage |
| GET | `/api/tasks/:transactionId` | Tasks for a transaction |
| PATCH | `/api/tasks/:id` | Update task status |
| GET | `/api/emails/:transactionId` | Email queue for a transaction |
| POST | `/api/emails/:id/send` | Send a queued email |
| GET | `/api/emails` | List email templates |
| GET | `/api/documents` | List documents |
| POST | `/api/documents` | Create/update document |

## Architecture

- **Workflow Engine** — When a transaction advances stages, the engine automatically clones default tasks and queues stage-specific emails with correct scheduling.
- **Email Queue** — Emails are scheduled based on offset days from the stage start. A cron job processes the queue every 5 minutes.
- **Stage History** — Every stage transition is logged for audit.

## Next Steps

- Wire Gmail MCP for real email delivery
- Connect Google Drive for document attachments
- Add DocuSign integration for listing agreements
