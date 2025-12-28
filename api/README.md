# Strollcast API

Cloudflare Worker serving the episodes API backed by D1 database.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create D1 database

```bash
npm run db:create
```

Copy the database ID from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 3. Run migrations

```bash
# Local development
npm run db:migrate:local

# Production
npm run db:migrate
```

### 4. Development

```bash
npm run dev
```

### 5. Deploy

```bash
npm run deploy
```

## API Endpoints

### GET /episodes

List all published episodes.

```json
{
  "version": "2.0",
  "updated": "2024-12-27T00:00:00.000Z",
  "episodes": [
    {
      "id": "punica-2023",
      "title": "Punica: Multi-Tenant LoRA Serving",
      "authors": "Chen et al.",
      "year": 2023,
      "duration": "14 min",
      "durationSeconds": 840,
      "description": "...",
      "audioUrl": "https://strollcast.com/chen-2023-punica/chen-2023-punica.m4a",
      "transcriptUrl": "https://strollcast.com/api/punica-2023.vtt",
      "paperUrl": "https://arxiv.org/abs/2310.18547"
    }
  ]
}
```

### GET /episodes/:id

Get a single episode by ID.

## Database Schema

See `migrations/0001_create_episodes.sql` for the full schema.
