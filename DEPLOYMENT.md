# Deploying InfiNote

## 1. Prerequisites

- **GitHub Account**: To host the code.
- **Vercel Account**: To deploy the frontend.
- **Supabase Project**: Which you already have.

## 2. Push Code to GitHub

1. Create a **New Repository** on GitHub (e.g., `infinote`).
2. Run these commands in your `app` folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit, ready for deployment"
   git branch -M main
   # Replace <your-repo-url> with the one from GitHub
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

## 3. Deployment to Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Use "Continue with GitHub" and select your `infinote` repository.
3. **Configure Settings**:
   - **Framework Preset**: Vite (should be auto-detected).
   - **Root Directory**: `app` (if your package.json is inside an app folder, otherwise leave as `./`).
4. **Environment Variables**:
   Copy these from your local `.env` file and paste them into Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**.

## 4. Supabase Configuration (Critical!)

For multiplayer to work, you must ensure:

1. **Realtime enabled**: Go to **Database > Replication** in Supabase and ensure the `supabase_realtime` publication includes `boards`, `notes`, `connections`, and `drawings`.
   - _We already ran the SQL for this locally, but verify it in the dashboard._
2. **Site URL**: go to **Authentication > URL Configuration** in Supabase.
   - Add your Vercel URL (e.g., `https://infinote.vercel.app`) to "Site URL" and "Redirect URLs".

## 5. Done! `🚀`

You can now share your Vercel link with anyone.
_Note: Since we haven't built "Public Sharing" yet, they will need to sign up for their own account and will see their own boards._
