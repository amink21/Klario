# Swapping storage to Supabase

The app uses a single data layer in `lib/storage.ts`. All reads/writes go through async functions (`getLifeItems`, `setLifeItems`, `addTransaction`, etc.). To move to Supabase:

1. **Install**  
   `npx expo install @supabase/supabase-js`

2. **Create tables** (Supabase SQL)  
   - `life_items`: columns matching `LifeItem` (id, title, category, amount_cents, cadence, next_due_iso, remind_days_before, status, notes, notification_id, user_id if you add auth).  
   - `transactions`: match `Transaction`.  
   - `subscriptions`: match `Subscription`.  
   - `settings`: one row per user or key-value (e.g. `user_id`, `morning_brief`, `due_item_reminders`, `default_remind_days_before`).

3. **Replace implementation in `lib/storage.ts`**  
   - Initialize a Supabase client (e.g. from env or constants).  
   - Implement each export so it uses the client instead of AsyncStorage:  
     - `getLifeItems()` → `supabase.from('life_items').select('*')` (and map snake_case to camelCase if needed).  
   - For writes:  
     - `setLifeItems(items)` → delete existing + insert or upsert by `id`.  
     - Same idea for `transactions`, `subscriptions`, `settings`.  
   - Keep the same function signatures and return types so the rest of the app (Zustand store, screens) does not need changes.

4. **Optional: auth**  
   Add Supabase Auth; then scope all queries with `.eq('user_id', user.id)` and set `user_id` on insert/update.

5. **Seeding**  
   Replace the “first launch” AsyncStorage seed with a one-time Supabase insert (or skip and rely on empty state).

No changes are required in `lib/store.ts`, components, or screens beyond ensuring the Supabase client is available where `storage.ts` runs.
