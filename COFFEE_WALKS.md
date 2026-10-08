# Coffee walks: Assignment 4

Existing Coffee Club, same Supabase and Vercel project. `/explore` is gated behind the existing Google login and completed names; the original coffee catalogue remains at `/`.

## Product choices

Sam wants an easy, affordable reason to leave the dorms. One coffee and mostly free public stops make a short outing approachable. A time budget and three moods give useful variation without requiring a long prompt. A sourced catalogue of 25 places across West Village, SoHo/Nolita and Columbia/Upper West Side prevents invented businesses. Official links and walking directions help turn generated text into an outing.

Fresh community walks and visible votes give visitors a reason to return and help surface appealing ideas. Votes describe interest in an itinerary, not a review of the real business. The improvement over an isolated caption generator is that generation has constraints, a practical next action, and community feedback attached to it. Users choose an area to keep itineraries walkable. At generation time the server chooses a different coffee start from the creator's previous walk in that area and prefers an unvisited non-coffee highlight. These constraints are passed to Gemini and validated on the result; a renamed duplicate set of stops is rejected. Every generated prompt records the selected area, source catalogue and variation constraints. Expansion adds vetted places, not model-invented venues.

Each route includes an interactive Leaflet street map with numbered stops, safe text popups and a dotted visit-order line. It uses curated OSM coordinates (including the park's arch), not AI-invented locations. Dotted segments are an overview, not computed walking directions; the Google Maps link supplies actual street navigation. OSM tiles load only when the map is visible, use normal browser caching and retain attribution. No Mapbox or Google Maps API key is required. Coordinates and OSM object sources are recorded in `lib/place-coordinates.ts`; positions identify venues/buildings and are not guaranteed accessible entrances. A titled rating panel explains how each up/down vote is saved.

## Setup

Apply `supabase/migrations/202610080002_coffee_walks.sql` once to the existing project. The migration preserves existing rows, seeds the original five sourced places, enables RLS on all public application tables, and preserves avatar storage policies. No service-role key is used by the app.

Apply `supabase/migrations/202610080003_expand_places.sql` next to expand to 25 places and add sourced coordinates plus neighborhood labels. No RLS policies or write grants are relaxed.

Configure server-only `GEMINI_API_KEY` on the existing Vercel project. The default model is `gemini-flash-lite-latest`, verified with the configured key. If it returns unavailable/not-found, the server discovers text Flash models supported by the key and tries at most two alternatives, preferring lightweight models. The actual model used is saved with the generation. Optional `GEMINI_MODEL` pins a specific compatible model and disables this fallback. Redeploy after an environment change. Never use a NEXT_PUBLIC variable for a model key. REST requests use Google's generateContent API and JSON schema; code validates the returned itinerary before saving.

Reserve at most five generation attempts per rolling 24 hours using a database lock. Failed model calls count toward the quota. Save results and full prompts atomically. Shared generated text is readable by authenticated users; prompts and quota records are private to their creator. Users can insert only their own votes, once per route. Raw other users' votes are private; an authenticated aggregate function returns counts only. Client roles cannot directly create or edit generation records, or write to the place/coffee catalogues.

This is text generation; relational JSON stores the itinerary, not binary media. Profile images remain in the private Supabase Storage bucket.

## Validation

Run `node --test tests/routes.test.mjs`, `npm run lint`, and `npm run build`. Verify signed-out `/explore` redirects to login, generated routes persist on refresh, the creator can inspect their prompt, and votes survive refresh and cannot be duplicated. Check another user's profile/prompt/vote cannot be read or altered. Keep Vercel deployment protection off and allow the deployed origin's exact `/auth/callback` in Supabase.

Live verification before this expansion confirmed Gemini generation, stored full prompts, vote persistence and Google callback behavior. The map/area changes additionally passed TypeScript, lint, a production build and eight validator tests.

## PM feedback

Feedback group has not been completed in this implementation. Record the PM's actual observations here and implement the agreed changes before submission; do not substitute invented feedback.

Sources: [Partners](https://www.partnerscoffee.com/pages/retail-locations), [Birch](https://www.birchcoffee.com/pages/visit), [NYC Parks](https://www.nycgovparks.org/parks/washington-square-park), [NYPL](https://www.nypl.org/locations/jefferson-market), [Jefferson Market Garden](https://www.jeffersonmarketgarden.org/), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [generateContent](https://ai.google.dev/api/generate-content).
