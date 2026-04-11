# ⚔️ GrindSquad

**Competitive LeetCode grinding — with your squad.**

GrindSquad is a full-stack squad management and competitive coding platform where teams share problems, track streaks, challenge each other to 1v1 code duels, and compete on leaderboards.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, CSS Modules |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL via Supabase, Prisma ORM |
| Auth | Clerk |
| Realtime | Socket.IO |
| Hosting (API) | Render |
| Hosting (Client) | Vercel |

---

## ✨ Features

- **Squad System** — Create or join squads with invite codes; owner can delete squad
- **Mission Feed** — Share LeetCode / GFG / Codeforces problems to your squad feed
- **Solve Tracking** — Mark problems as solved, earn points and maintain streaks
- **1v1 Duel Arena** — Challenge squadmates to timed head-to-head coding battles
- **Leaderboard** — Weekly and all-time squad + global rankings
- **Member Management** — Owners/Admins can search any user by username and add/remove them
- **Explore** — Browse the full problem library or search operatives by username
- **Notifications** — Real-time activity feed

---

## 🗂️ Project Structure

```
Grind_Squad/
├── client/          # Next.js frontend
│   ├── src/
│   │   ├── app/     # Route pages (App Router)
│   │   ├── components/
│   │   └── lib/     # API client, types, utilities
│   └── .env.example
├── server/          # Express backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── services/
│   ├── prisma/
│   │   └── schema.prisma
│   └── .env.example
└── .gitignore
```

---

## ⚙️ Local Development

### Prerequisites
- Node.js ≥ 20
- PostgreSQL database (or Supabase project)
- Clerk account

### 1. Clone the repo

```bash
git clone https://github.com/Swayam7Garg/Grind_Squad.git
cd Grind_Squad
```

### 2. Setup Server

```bash
cd server
cp .env.example .env
# Fill in .env with your DATABASE_URL and CLERK_SECRET_KEY
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
# Server runs at http://localhost:4000
```

### 3. Setup Client

```bash
cd client
cp .env.example .env.local
# Fill in .env.local with your Clerk keys and NEXT_PUBLIC_API_URL
npm install
npm run dev
# Client runs at http://localhost:3000
```

---

## 🌐 Deployment

### Server → Render

1. Create a Web Service on [Render](https://render.com)
2. Set **Build Command**: `npm install && npx prisma generate && npm run build`
3. Set **Start Command**: `npm start`
4. Add all environment variables from `server/.env.example`

### Client → Vercel

1. Import the `client/` directory into [Vercel](https://vercel.com)
2. Set the **Root Directory** to `client`
3. Add all environment variables from `client/.env.example`
4. Set `NEXT_PUBLIC_API_URL` to your Render backend URL

---

## 📜 API Overview

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/squads` | Create a squad |
| `GET` | `/api/squads/:id` | Get squad details |
| `DELETE` | `/api/squads/:id` | Delete squad (OWNER only) |
| `POST` | `/api/squads/:id/members` | Add member (OWNER/ADMIN) |
| `DELETE` | `/api/squads/:id/members/:uid` | Remove member (OWNER/ADMIN) |
| `GET` | `/api/users/search?q=` | Search users by username |
| `GET` | `/api/problems` | List / search problems |
| `POST` | `/api/duels` | Create a 1v1 duel |
| `GET` | `/api/leaderboard/global` | Global leaderboard |

---

## 🔐 Environment Variables

Copy `.env.example` files and **never commit** real `.env` files.

See [`server/.env.example`](server/.env.example) and [`client/.env.example`](client/.env.example) for required variables.

---

## 🛠️ Scripts

### Server
| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled production server |
| `npm run prisma:migrate` | Run DB migrations |
| `npm run prisma:studio` | Open Prisma Studio |

### Client
| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm start` | Start production server |

---

## 🤝 Contributing

1. Fork the repo
2. Create your branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feat/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT © [Swayam Garg](https://github.com/Swayam7Garg)
