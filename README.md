# NextRole.ai — AI Job Finder

An AI-powered job finder that pulls real job listings, compares them with your profile and resume, and shows a **match score**, **matching / missing skills**, and **reasons why a role fits you**.

This is a learning project covering full-stack development (React, Node.js, SQL Server) and applied AI (LLMs, structured outputs, embeddings) end to end.

![NextRole.ai UI](image.png)

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
  - [Phase 1 — Node API + SQL Server with mock data](#phase-1--node-api--sql-server-with-mock-data)
  - [Phase 2 — Real jobs from an external API](#phase-2--real-jobs-from-an-external-api)
  - [Phase 3 — Profile section](#phase-3--profile-section)
  - [Phase 4 — AI layer](#phase-4--ai-layer)
  - [Phase 5 — Polish](#phase-5--polish)
- [Free Job Data APIs](#free-job-data-apis)
- [How the AI Match Works](#how-the-ai-match-works)
- [UI ↔ Data Mapping](#ui--data-mapping)
- [Database Schema](#database-schema)
- [Production Deployment](#production-deployment)
- [Getting Started](#getting-started)
- [Learning Tips](#learning-tips)

---

## Architecture

```
React (UI)  ──►  Node.js + Express (main API)  ──►  SQL Server
                        │
                        ▼
                Python + FastAPI (AI service)  ──►  Ollama (local) / OpenAI
```

| Layer                 | Responsibility                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **React**             | UI only. Talks **only** to the Node API.                                                                          |
| **Node.js + Express** | Owns users, profiles, jobs, saved jobs, and all SQL Server access. Fetches jobs from external APIs on a schedule. |
| **SQL Server**        | Stores jobs, profiles, and cached AI match results.                                                               |
| **Python + FastAPI**  | Stateless AI service: receives `{ profile, job }`, returns the analysis. Never touches the database directly.     |
| **Ollama / OpenAI**   | The LLM. Ollama runs locally for free; OpenAI is used for comparison.                                             |

> **One codebase for both LLMs:** Ollama exposes an OpenAI-compatible endpoint at `http://localhost:11434/v1`.
> Write the AI code once with the `openai` Python SDK and switch providers by changing only `base_url` and the model name.

```python
from openai import OpenAI

# Local (free) — Ollama
client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
MODEL = "llama3.1:8b"   # or "qwen2.5:7b"

# Cloud — OpenAI
# client = OpenAI()      # reads OPENAI_API_KEY from .env
# MODEL = "gpt-4o-mini"
```

---

## Tech Stack

| Area             | Tools                                                   |
| ---------------- | ------------------------------------------------------- |
| Frontend         | React 19, Vite, Tailwind CSS, CSS Modules               |
| Backend API      | Node.js, Express, `mssql`, `node-cron`                  |
| Database         | SQL Server                                              |
| AI service       | Python ≥ 3.10, FastAPI, Pydantic, `openai` SDK, `pypdf` |
| LLMs             | Ollama (`llama3.1:8b` / `qwen2.5:7b`), OpenAI           |
| Package managers | npm (JS), uv (Python)                                   |

---

## Project Structure

A **monorepo**: one repository, one folder per service. Each service is self-contained — its own dependencies, its own `.env`, and (later) its own `Dockerfile`. The root only holds what ties the services together.

```
job-finder/
├── frontend/          # React (Vite)
├── jobs_api/          # Node.js + Express + SQL Server
├── ai-service/        # Python + FastAPI
├── database/          # SQL schema / migrations
├── docker-compose.yml # starts all services together (later)
├── .gitignore
└── README.md
```

### Restructure checklist (current repo → target layout)

- [ ] **Remove root `package.json` / `node_modules`** — `tailwindcss`, `@tailwindcss/vite`, and `lucide-react` belong to the frontend:
  ```bash
  cd frontend && npm install tailwindcss @tailwindcss/vite
  ```
  The frontend currently works only because Node resolves packages from parent folders; a fresh clone or production build would fail.
- [ ] **Move Python files into `ai-service/`** — `main.py`, `utils/` (incl. the Remotive prototype), `pyproject.toml`, `uv.lock`
- [ ] **Add a root `.gitignore`** — `node_modules/`, `.env`, `__pycache__/`, `.venv/`, `dist/`
- [x] **Create `jobs_api/`** with a basic Express setup

---

## Roadmap

Build in phases — **each phase should run on its own before starting the next.**

### Phase 1 — Node API + SQL Server with mock data

- [ ] Set up Express server and SQL Server connection
- [ ] Create tables: `users`, `profiles`, `jobs`, `saved_jobs`, `job_matches`
- [ ] Move the mock jobs from `JobListings.jsx` into SQL Server (seed script)
- [ ] Routes:
  - `GET /api/jobs` — list with filter query params (location, type, level, skills)
  - `GET /api/jobs/:id` — single job
  - `POST /api/saved` / `DELETE /api/saved/:jobId` — save / unsave
  - `GET /api/profile` / `PUT /api/profile`
- [ ] Fetch from React; wire filters, sorting, and selected job to real data

**You learn:** REST API design, SQL, connecting frontend ↔ backend.

### Phase 2 — Real jobs from an external API

- [ ] Pick a source:
  - **Remotive** — free, remote jobs (already prototyped in `utils/jobs_api.py`)
  - **Adzuna** — free tier, many countries
  - **JSearch** (RapidAPI) — aggregates many boards
  - **Greenhouse / Lever** public job-board APIs — many companies use them
- [ ] Fetch on a schedule with `node-cron`, store in SQL Server, de-duplicate by `(source, external_id)`
- [ ] Never call the external API on every page load — serve from SQL Server

> ⚠️ Don't scrape LinkedIn or Indeed — it violates their terms and will get blocked.

**You learn:** third-party APIs, scheduled jobs, data cleaning and de-duplication.

### Phase 3 — Profile section

- [ ] Profile page: text area for skills and career goals
- [ ] Resume upload (PDF)
- [ ] Node stores the file → sends it to Python → Python extracts text with `pypdf`
- [ ] Save the extracted text and a `profile_version` in SQL Server

### Phase 4 — AI layer

The core learning part. See [How the AI Match Works](#how-the-ai-match-works).

- [ ] FastAPI endpoint `POST /analyze` taking `{ profile, job }`
- [ ] Extraction step with structured JSON output + Pydantic validation
- [ ] Deterministic scoring in code
- [ ] (Optional) embedding similarity
- [ ] LLM-written explanation
- [ ] Cache results in `job_matches`
- [ ] Compare Ollama vs OpenAI on the same test cases

**You learn:** prompt design, structured outputs, embeddings, why LLMs shouldn't do the math, and caching.

### Phase 5 — Polish

- [ ] Authentication (JWT)
- [ ] Loading states and error handling in the UI
- [ ] Run AI analysis as a background task so the UI never blocks
- [ ] Optional: Docker Compose to start everything with one command

---

## Free Job Data APIs

Legal, free sources of real job listings for [Phase 2](#phase-2--real-jobs-from-an-external-api).
Every example below is a plain HTTP `GET` request. Paste it into a browser or run it with `curl` to see the raw JSON before writing any code.

> **Key terms**
>
> - **Endpoint:** the URL you call to get data.
> - **Query params:** the `?key=value&key2=value2` part of a URL. They filter or page the results.
> - **API key:** a secret string that identifies you to the provider. Keep it in `.env`, never in the frontend or in git.
> - **Rate limit:** the maximum number of requests you may send per minute, day, or month. If you go over it, you get errors or get blocked.
> - **Pagination:** results come back in "pages" (e.g. 20 jobs each). You ask for the next page with `page`, `offset`, or `skip`.

### At a glance

| API                                     | Key needed?          | Coverage                         | Best for                                         |
| --------------------------------------- | -------------------- | -------------------------------- | ------------------------------------------------ |
| [Remotive](#remotive)                   | No                   | Remote jobs, worldwide           | Easiest start (already prototyped)               |
| [Arbeitnow](#arbeitnow)                 | No                   | Europe (mostly Germany), remote  | No-signup testing, visa-sponsorship filter       |
| [Himalayas](#himalayas)                 | No                   | Remote jobs, worldwide           | Remote jobs with salary and seniority data       |
| [The Muse](#the-muse)                   | Optional (free)      | US-heavy, all job types          | Built-in `category` and `level` filters          |
| [Greenhouse](#greenhouse-job-board-api) | No                   | One company per call             | Clean, reliable data from specific companies     |
| [Lever](#lever-postings-api)            | No                   | One company per call             | Same idea as Greenhouse                          |
| [Adzuna](#adzuna)                       | Yes (free signup)    | ~20 countries incl. US, UK, India | Keyword + location search, salaries              |
| [JSearch](#jsearch-rapidapi)            | Yes (RapidAPI, free) | Aggregates Google for Jobs       | Widest coverage, smallest free quota             |

> ⚠️ **Rules that apply to all of them**
>
> 1. **Fetch on a schedule, not on page load.** Call the API from Node with `node-cron` (e.g. every 6 hours), save the jobs to SQL Server, and serve the UI from the database. Calling the API on every page load burns your rate limit, is slow, and breaks the app if the API goes down.
> 2. **Keep `url` / `apply_url`** so users can apply on the original site, and **show the source** ("via Remotive"). Most free APIs require attribution.
> 3. **Store `source` + the provider's job id** (`external_id`) so you can skip duplicates on the next fetch.
> 4. Limits and terms change. **Re-read each provider's docs before you build on it.**

---

### Remotive

Remote jobs. No key needed. This is the API that `utils/jobs_api.py` already uses.

- **Docs:** https://remotive.com/api-documentation (also on GitHub: `remotive-com/remote-jobs-api`)
- **Endpoint:** `GET https://remotive.com/api/remote-jobs`
- **Params:** `search` (keyword), `category` (e.g. `software-dev`, `data`, `devops`), `company_name`, `limit`
- **Categories list:** `GET https://remotive.com/api/remote-jobs/categories`

```bash
curl "https://remotive.com/api/remote-jobs?search=python&limit=5"
```

**Response:** `{ "job-count": N, "jobs": [ ... ] }`. Each job has `id`, `url`, `title`, `company_name`, `category`, `job_type`, `publication_date`, `candidate_required_location`, `salary`, `tags`, `description` (HTML).

**Terms:** Listings arrive with a delay of about 24 hours. Remotive asks you to call the API only a few times a day, to link back to the job on Remotive, and to credit Remotive as the source. Calling it too often can get you blocked.

---

### Arbeitnow

European (mostly German) and remote jobs. No key needed.

- **Docs:** https://www.arbeitnow.com/blog/job-board-api
- **Endpoint:** `GET https://www.arbeitnow.com/api/job-board-api`
- **Params:** `page` (pagination), `visa_sponsorship=true|false`

```bash
curl "https://www.arbeitnow.com/api/job-board-api?page=1"
```

**Response:** `{ "data": [ ... ], "links": { ... }, "meta": { ... } }`. Each job has `slug` (use it as the id), `company_name`, `title`, `description` (HTML), `remote` (true/false), `url`, `tags`, `job_types`, `location`, `created_at` (Unix timestamp).

---

### Himalayas

Remote jobs. No key needed.

- **Docs:** https://himalayas.app/api
- **Endpoint:** `GET https://himalayas.app/jobs/api`
- **Params:** `limit` (max 20 per request), `offset` (skip N jobs, for pagination)

```bash
curl "https://himalayas.app/jobs/api?limit=20&offset=0"
```

**Response:** `{ "jobs": [ ... ], "totalCount": N, ... }`. Jobs include title, company name, description, location restrictions, seniority, employment type, salary range (when given), and an application link.

**Terms:** Credit Himalayas and link back to the original listing.

---

### The Muse

US-heavy jobs of all kinds, with good built-in filters. The key is free and optional.

- **Docs:** https://www.themuse.com/developers/api/v2
- **Endpoint:** `GET https://www.themuse.com/api/public/jobs`
- **Params:**
  - `page` (**required**, 20 results per page)
  - `category` (e.g. `Software Engineering`, `Data Science`)
  - `level` (`Entry Level`, `Mid Level`, `Senior Level`, `management`, `Internship`)
  - `location` (e.g. `New York, NY`, `Flexible / Remote`)
  - `company`
  - `api_key`
- **Rate limit:** 500 requests/hour without a key, 3,600/hour with a free registered key. Every response includes `X-RateLimit-Remaining` headers. Going over the limit returns `403`.

```bash
curl "https://www.themuse.com/api/public/jobs?page=1&category=Software%20Engineering&level=Entry%20Level"
```

> `%20` is how a space is written inside a URL ("URL encoding"). You can repeat a param to pass several values: `&level=Entry%20Level&level=Mid%20Level`.

**Response:** `{ "page", "page_count", "results": [ ... ] }`. Each job has `id`, `name` (the title), `company.name`, `locations[].name`, `levels[].name`, `categories[].name`, `publication_date`, `contents` (HTML), `refs.landing_page` (the link).

---

### Greenhouse Job Board API

Thousands of companies (Airbnb, Stripe, Discord, …) host their careers page on Greenhouse, and each one has a **public** job feed. Reading it needs no key. You fetch **one company at a time**, using its "board token".

- **Docs:** https://developers.greenhouse.io/job-board.html
- **List jobs:** `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true`
- **One job:** `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs/{job_id}`
- **Finding the board token:** open the company's careers page. If its URL looks like `boards.greenhouse.io/airbnb` or `job-boards.greenhouse.io/airbnb`, the token is `airbnb`.

```bash
curl "https://boards-api.greenhouse.io/v1/boards/airbnb/jobs?content=true"
```

**Response:** `{ "jobs": [ ... ], "meta": { "total": N } }`. Each job has `id`, `title`, `location.name`, `absolute_url`, `updated_at`, and, with `content=true`, `content` (HTML description), `departments`, `offices`.

**Tip:** keep a list of board tokens for companies you care about in a config file or a DB table, and loop over it in the scheduled fetch.

---

### Lever Postings API

Same idea as Greenhouse, for companies whose careers page runs on Lever. No key needed to read postings.

- **Docs:** https://github.com/lever/postings-api
- **Endpoint:** `GET https://api.lever.co/v0/postings/{company}?mode=json` (EU-hosted companies use `api.eu.lever.co`)
- **Params:**
  - `mode=json` (always send it)
  - `skip`, `limit` (pagination)
  - filters: `location`, `commitment` (e.g. `Full-time`), `team`, `department`, `level` (case-sensitive)
- **Finding the company name:** careers URL `jobs.lever.co/leverdemo` → company is `leverdemo`.

```bash
curl "https://api.lever.co/v0/postings/leverdemo?mode=json&limit=5"
```

**Response:** a JSON **array** of postings. Each has `id`, `text` (the title), `categories` (`location`, `commitment`, `team`, `department`), `workplaceType`, `descriptionPlain`, `lists` (requirements bullets), `hostedUrl`, `applyUrl`, `createdAt`, and sometimes `salaryRange`.

---

### Adzuna

A big aggregator covering about 20 countries (`us`, `gb`, `in`, `ca`, `au`, `de`, `fr`, …), with salary data. Needs a free key.

- **Docs:** https://developer.adzuna.com/overview · interactive docs: https://developer.adzuna.com/activedocs
- **Sign up:** https://developer.adzuna.com/signup gives you an `app_id` and an `app_key`.
- **Endpoint:** `GET https://api.adzuna.com/v1/api/jobs/{country}/search/{page}`
- **Params:**
  - `app_id`, `app_key` (**required**)
  - `what` (keywords), `where` (location), `results_per_page`
  - `sort_by` (`date`, `salary`, `relevance`), `max_days_old`
  - `full_time=1`, `permanent=1`, `salary_min`
- **Free-tier limits:** small daily and monthly caps. The current numbers are on your Adzuna dashboard, so check them before you set the cron schedule.

```bash
curl "https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=YOUR_ID&app_key=YOUR_KEY&what=react%20developer&where=bangalore&results_per_page=20" -H "Accept: application/json"
```

> Send `Accept: application/json`, otherwise Adzuna may reply in a different format.

**Response:** `{ "count": N, "results": [ ... ] }`. Each job has `id`, `title`, `company.display_name`, `location.display_name`, `description` (a short snippet), `redirect_url`, `created`, `contract_time`, `salary_min`, `salary_max`, `category.label`.

Store the keys in `jobs_api/.env`, e.g. `ADZUNA_APP_ID=...` and `ADZUNA_APP_KEY=...`.

---

### JSearch (RapidAPI)

Pulls listings from Google for Jobs, which in turn collects LinkedIn, Indeed, Glassdoor, and more. That makes it the widest coverage, and the right way to get those boards' jobs **without scraping them**. Needs a free RapidAPI account. The free plan has a small monthly quota.

- **Docs / sign up:** https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch (subscribe to the free "Basic" plan to get your key)
- **Endpoint:** `GET https://jsearch.p.rapidapi.com/search`
- **Params:** `query` (e.g. `node developer in Pune`), `page`, `num_pages`, `date_posted` (`all`, `today`, `3days`, `week`, `month`), `remote_jobs_only`, `employment_types`
- **Headers (required):** `X-RapidAPI-Key: <your key>` and `X-RapidAPI-Host: jsearch.p.rapidapi.com`
- **Other endpoints:** `/job-details?job_id=...`, `/estimated-salary`

```bash
curl "https://jsearch.p.rapidapi.com/search?query=react%20developer%20in%20india&page=1&num_pages=1" \
  -H "X-RapidAPI-Key: YOUR_KEY" \
  -H "X-RapidAPI-Host: jsearch.p.rapidapi.com"
```

**Response:** `{ "status", "data": [ ... ] }`. Each job has `job_id`, `job_title`, `employer_name`, `job_city`, `job_country`, `job_is_remote`, `job_employment_type`, `job_description`, `job_apply_link`, `job_posted_at_datetime_utc`, `job_publisher` (e.g. "LinkedIn").

**Watch the quota.** With only a few hundred free calls a month, one cron run per day is plenty.

---

### Mapping API fields to our job shape

Every API names its fields differently. The Node fetcher should convert ("normalize") each one into the shape the frontend already uses (`src/data/jobs.js`), plus a few extra fields for the database.

| Our field      | Remotive                      | Greenhouse      | Lever                     | Adzuna                  | JSearch                      |
| -------------- | ----------------------------- | --------------- | ------------------------- | ----------------------- | ---------------------------- |
| `external_id`  | `id`                          | `id`            | `id`                      | `id`                    | `job_id`                     |
| `title`        | `title`                       | `title`         | `text`                    | `title`                 | `job_title`                  |
| `company`      | `company_name`                | _board token_   | _company name_            | `company.display_name`  | `employer_name`              |
| `location`     | `candidate_required_location` | `location.name` | `categories.location`     | `location.display_name` | `job_city` + `job_country`   |
| `type`         | `job_type`                    | —               | `categories.commitment`   | `contract_time`         | `job_employment_type`        |
| `description`  | `description`                 | `content`       | `descriptionPlain`        | `description`           | `job_description`            |
| `url`          | `url`                         | `absolute_url`  | `hostedUrl`               | `redirect_url`          | `job_apply_link`             |
| `posted`       | `publication_date`            | `updated_at`    | `createdAt` (ms)          | `created`               | `job_posted_at_datetime_utc` |
| `skills`       | `tags`                        | —               | —                         | —                       | —                            |

- `level` and most `skills` are **not** provided by these APIs. They will come from the Phase 4 AI extraction step, which reads the description and pulls them out.
- `match` is computed by our own code (Phase 4). It never comes from the job API.
- Descriptions are often **HTML**. Strip the tags (or sanitize them) before you show them or send them to the LLM.

**Suggested order:** start with **Remotive** (no key, already prototyped). Add **Greenhouse/Lever** for a handful of companies you like. Then add **Adzuna** or **JSearch** when you want broad, location-based search.

---

## How the AI Match Works

> **Don't ask the LLM to "give a score from 0–100".** It will invent a different number every time.
> Split the work so the LLM does what it is good at (understanding text) and your code does the math.

```
Resume ──► 1. EXTRACT (LLM) ──► { skills, years, roles }   ─┐
                                                            ├──► 2. SCORE (code) ──► 3. EXPLAIN (LLM) ──► UI
Job    ──► 1. EXTRACT (LLM) ──► { required, nice_to_have } ─┘
```

1. **Extract — LLM**
   Turn the resume and each job description into structured JSON (skills, years of experience, roles).
   Use JSON mode / structured outputs and validate with **Pydantic**. Job extractions are cached once per job.

2. **Score — your code**
   - `matchingSkills` = profile skills ∩ job skills
   - `missingSkills` = job skills − profile skills
   - `match` = weighted overlap (required skills weigh more than nice-to-have)
   - _Later:_ add **embedding similarity** between resume and job text and blend it into the score

3. **Explain — LLM**
   Given the facts from step 2, the LLM writes the short summary and the "Why this is a great match" reasons. It explains — it does not decide.

**Caching:** store results in `job_matches` keyed by `(profile_version, job_id)`. The UI just reads them; the LLM is only called again when the profile or the job changes.

---

## UI ↔ Data Mapping

| UI element                                  | Source                |
| ------------------------------------------- | --------------------- |
| `match` (e.g. 92%)                          | Step 2 scoring (code) |
| `matchingSkills` / `missingSkills`          | Step 2 set comparison |
| Match summary ("Great match! …")            | Step 3 LLM            |
| `reasons` ("Why this is a great match")     | Step 3 LLM            |
| title, company, location, type, posted date | Job API → SQL Server  |

---

## Database Schema

The full schema lives in [`database/schema.sql`](database/schema.sql) (SQL Server / T-SQL).

| Table         | Purpose                                                                    |
| ------------- | -------------------------------------------------------------------------- |
| `users`       | Accounts                                                                   |
| `profiles`    | Resume text, skills (JSON), goals, `profile_version`                       |
| `jobs`        | Fetched jobs; unique on `(source, external_id)`; cached `extracted_skills` |
| `saved_jobs`  | Jobs a user bookmarked                                                     |
| `job_matches` | Cached AI results keyed by `(profile_id, profile_version, job_id)`         |

> SQL Server has no JSON column type — JSON is stored in `NVARCHAR(MAX)` with an `ISJSON` check and read with `JSON_VALUE` / `OPENJSON`.

---

## Production Deployment

```
Browser ──► frontend  (static files: Vercel / Netlify / nginx)
               │
               ▼
            jobs_api (Node)  ──► SQL Server (managed, e.g. Azure SQL)
               │
               ▼
            ai-service (Python)  ── private, not exposed publicly
```

| Service        | How it runs in production                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| **frontend**   | `npm run build` → static files, host anywhere. Read the API URL from `VITE_API_URL`, never hard-code it.      |
| **jobs_api**   | The **only public backend**. Handles auth (JWT), CORS, rate limiting, and validation.                         |
| **ai-service** | Reachable **only from the API**, never from the browser — keeps the OpenAI key and LLM costs safe from abuse. |
| **SQL Server** | Managed database with automated backups.                                                                      |

- **Each service deploys independently** — e.g. redeploy the AI service without touching the frontend. This is the main benefit of the folder-per-service layout.
- **No monorepo tooling needed** (npm workspaces, Turborepo) at this size — plain folders are enough.

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.10+ and [uv](https://docs.astral.sh/uv/)
- SQL Server (Express is fine) + SQL Server Management Studio (SSMS)
- [Ollama](https://ollama.com/) (for local LLMs)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Python (current prototype)

```bash
uv sync
uv run main.py        # fetches sample jobs from Remotive
```

> After the restructure, run these from inside `ai-service/`.

### Ollama

```bash
ollama pull llama3.1:8b
ollama serve          # serves http://localhost:11434
```

### Environment variables

Each service has its own `.env`:

```env
# frontend/.env
VITE_API_URL=http://localhost:4000

# jobs_api/.env
PORT=4000
CORS_ORIGIN=http://localhost:5173
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=job_finder
DB_USER=job_finder_app
DB_PASSWORD=...
DB_TRUST_CERT=true
AI_SERVICE_URL=http://localhost:8000
JWT_SECRET=...

# ai-service/.env
OPENAI_API_KEY=sk-...
OLLAMA_BASE_URL=http://localhost:11434/v1
```

> Keep `.env` in `.gitignore` — never commit API keys.

_Backend and AI service setup steps will be added as Phases 1 and 4 are built._

---

## Learning Tips

- **Commit at the end of every phase.** Don't start Phase 4 until Phases 1–3 work.
- **Keep prompts in files** under `ai-service/prompts/` so they're easy to tweak and compare.
- **Build a small test set** of resume ↔ job pairs and compare how Ollama and OpenAI score them — that comparison teaches a lot about model quality and consistency.
- **Log every LLM call** (prompt, model, response, time taken) while learning; it makes debugging prompts much easier.
