# Coffee walks: Assignment 4

Existing Coffee Club, same Supabase and Vercel project. `/explore` is gated behind the existing Google login and completed names; the original coffee catalogue remains at `/`.

## Product choices

Sam wants an easy, affordable reason to leave the dorms. One coffee and mostly free public stops make a short outing approachable. A time budget and three moods give useful variation without requiring a long prompt. A small verified Village catalogue prevents invented businesses. Official links and walking directions help turn generated text into an outing.

Fresh community walks and visible votes give visitors a reason to return and help surface appealing ideas. Votes describe interest in an itinerary, not a review of the real business. The improvement over an isolated caption generator is that generation has constraints, a practical next action, and community feedback attached to it. Expansion to more neighborhoods should follow usage and PM feedback, rather than add unverified places.

## Setup

Apply `supabase/migrations/202610080002_coffee_walks.sql` once to the existing project. The migration preserves existing rows, seeds five sourced places, enables RLS on all public application tables, and preserves avatar storage policies. No service-role key is used by the app.

Configure server-only `GEMINI_API_KEY` on the existing Vercel project. Optional `GEMINI_MODEL` defaults to `gemini-3.8-flash`, as listed in Google's structured-output documentation at implementation time. Change this variable if your key has access to a different compatible model. Redeploy after an environment change. Never use a NEXT_PUBLIC variable for a model key. REST requests use Google's generateContent API and JSON schema; code validates the returned itinerary before saving.

Reserve at most five generation attempts per rolling 24 hours using a database lock. Failed model calls count toward the quota. Save results and full prompts atomically. Shared generated text is readable by authenticated users; prompts and quota records are private to their creator. Users can insert only their own votes, once per route. Raw other users' votes are private; an authenticated aggregate function returns counts only. Client roles cannot directly create or edit generation records, or write to the place/coffee catalogues.

This is text generation; relational JSON stores the itinerary, not binary media. Profile images remain in the private Supabase Storage bucket.

## Validation

Run `node --test tests/routes.test.mjs`, `npm run lint`, and `npm run build`. Verify signed-out `/explore` redirects to login, generated routes persist on refresh, the creator can inspect their prompt, and votes survive refresh and cannot be duplicated. Check another user's profile/prompt/vote cannot be read or altered. Keep Vercel deployment protection off and allow the deployed origin's exact `/auth/callback` in Supabase.

## PM feedback

Feedback group has not been completed in this implementation. Record the PM's actual observations here and implement the agreed changes before submission; do not substitute invented feedback.

Sources: [Partners](https://www.partnerscoffee.com/pages/retail-locations), [Birch](https://www.birchcoffee.com/pages/visit), [NYC Parks](https://www.nycgovparks.org/parks/washington-square-park), [NYPL](https://www.nypl.org/locations/jefferson-market), [Jefferson Market Garden](https://www.jeffersonmarketgarden.org/), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [generateContent](https://ai.google.dev/api/generate-content).
