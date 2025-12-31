# Tumbsky

A Tumblr-style Bluesky client with custom CSS styling for your posts.

## What is Tumbsky?

Tumbsky allows you to display your Bluesky posts on a personalized page with custom CSS styling,
similar to how Tumblr blogs work. Each user gets their own customizable page where they can style
their posts however they want.

### Features (MVP)

- 🔐 **OAuth Login** with your Bluesky account
- 📝 **Display your posts** in a clean, customizable format
- 🎨 **Custom CSS** - Style your posts however you want
- 🔗 **Personal URL** - Share your styled page (e.g., `tumbsky.app/@yourhandle`)
- ⚡ **Live updates** - New posts appear automatically

### What Tumbsky is NOT (for now)

- ❌ Not a full Bluesky client (no posting, liking, or replying)
- ❌ No timeline with mixed posts from multiple users
- ❌ No direct messages or notifications

Posts are created on bsky.app and displayed beautifully on Tumbsky.

## Tech Stack

- **Frontend**: SvelteKit + TypeScript
- **Backend**: SvelteKit (SSR)
- **Database**: libSQL/SQLite with Drizzle ORM
- **ATProto**: @atcute/\* libraries
- **Real-time**: Tap (ATProto Firehose)

Based on the [atcute-statusphere-example](https://github.com/mary-ext/atcute-statusphere-example).

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for Tap)

### Installation

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Set up environment variables:

   ```sh
   pnpm env:setup
   ```

   This creates a `.env` file with:
   - `COOKIE_SECRET` - Random secret for signing cookies
   - `OAUTH_PRIVATE_KEY_JWK` - ES256 keypair for OAuth

3. Configure additional environment variables in `.env`:

   ```sh
   # Database
   DATABASE_URL=file:local.db

   # OAuth - requires public URL for development
   OAUTH_PUBLIC_URL=https://your-tunnel-url.example.com

   # Tap (optional, for real-time updates)
   TAP_URL=http://localhost:2480
   TAP_ADMIN_PASSWORD=
   ```

4. Set up a tunnel for local development:

   OAuth requires a publicly accessible URL. Use [ngrok](https://ngrok.com/) or
   [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/):

   ```sh
   # Example with cloudflared
   cloudflared tunnel --url http://localhost:5173
   ```

   Add the tunnel URL to `.env` as `OAUTH_PUBLIC_URL`.

5. Run database migrations:

   ```sh
   pnpm db:migrate
   ```

6. (Optional) Start Tap for real-time updates:

   ```sh
   docker run -p 2480:2480 \
     -v ./data:/data \
     -e TAP_DATABASE_URL=sqlite:///data/tap.db \
     -e TAP_SIGNAL_COLLECTION=app.bsky.feed.post \
     -e TAP_COLLECTION_FILTERS=app.bsky.feed.post,app.bsky.actor.profile \
     ghcr.io/bluesky-social/indigo/tap:latest
   ```

7. Start the dev server:

   ```sh
   pnpm dev
   ```

   Visit the tunnel URL to access Tumbsky.

## Development

### Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm check` - Type checking
- `pnpm format` - Format code with Prettier
- `pnpm lint` - Check code formatting

### Database

- `pnpm db:push` - Push schema changes
- `pnpm db:generate` - Generate migrations
- `pnpm db:migrate` - Run migrations
- `pnpm db:studio` - Open Drizzle Studio

## Project Structure

```
tumbsky/
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte components
│   │   ├── server/        # Server-side code
│   │   │   ├── auth/      # Authentication
│   │   │   ├── db/        # Database
│   │   │   ├── oauth/     # OAuth client
│   │   │   └── tap/       # Firehose integration
│   │   └── utils/         # Utilities
│   └── routes/            # SvelteKit routes
├── drizzle/               # Database migrations
├── static/                # Static assets
└── .env                   # Environment variables
```

## Contributing

See [PLAN.md](PLAN.md) for the project roadmap and open questions.

## License

TBD

## Acknowledgments

- Built with [atcute](https://github.com/mary-ext/atcute) by Mary
- Based on [Statusphere example](https://github.com/bluesky-social/statusphere-example-app) by
  Bluesky
- Inspired by Tumblr's customizable blogs
