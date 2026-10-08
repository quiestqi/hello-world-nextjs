# Coffee Club assignment setup

Use the existing GitHub repository, Vercel project, and Supabase project.

## Database

Run `supabase/migrations/202610080001_profiles.sql` in the existing Supabase SQL editor. It creates nullable names, inserts profiles after auth.users insertion, backfills existing users without overwriting names, and creates a private avatars bucket. Existing unrelated policies are preserved; review them if this project already has broad profile or storage access policies.

## OAuth

Create your own Google OAuth client with type Web application. Add the production website origin to Authorized JavaScript origins. Google Authorized redirect URIs must contain the Supabase callback shown in Supabase Authentication > Sign In / Providers > Google (`https://PROJECT_REF.supabase.co/auth/v1/callback`). Save the client ID and secret in that Supabase Google provider.

Supabase Authentication > URL Configuration: set Site URL to the production origin and allow the exact application URL `https://hello-world-nextjs-peach.vercel.app/auth/callback`, plus each deployment URL followed by `/auth/callback`. The app sends no extra query parameters in redirectTo. Supabase adds the authorization code during the return flow.

## Vercel

Keep NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY on the existing project, matching the existing Supabase project. Disable deployment protection for the assignment deployment. Use the deployment-specific URL from Deployment Details, not the production or git-main alias, for submission.

## Verification

In a signed-out browser, the coffee list is visible and /members and /profile redirect to /login. Google login sends a new member to /profile with a request for first and last name. Save names, open /members, change names, upload a JPG/PNG/WebP under 5 MB, reload the profile, then sign out and confirm /members is gated again. Image bytes are in Storage; profiles.avatar_url contains only the object path.

Local checks: npm ci, npm run lint, npm run build. Build checks do not establish that live OAuth or the database is configured.
