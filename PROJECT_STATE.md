# Mokhsita Enterprises - Project State

> **CRITICAL DIRECTIVE:** This file is the single source of truth. Before any future architecture change, update this file first, detect possible breakpoints, and do not modify working features unless explicitly approved.

## Core Features Implemented
- User signup/login (Supabase Auth)
- Cart system (Local Storage with plans for authenticated sync)
- Product listing (Dynamic fetching from Supabase `products` table)
- Order placement (Writes to Supabase `orders`, `order_items`, and `leads`)
- Admin dashboard (Live fetching and management of orders)
- Forgot/Reset password flows
- Account dashboard (Customer profile management and order history reflection)

## Stabilized Architecture (Phase 2 Completed)
The platform utilizes a modular vanilla JavaScript architecture bound by a strict dependency load order. 

### Modules
- **`App.UI` (`modules/ui.js`)**: The singular source of truth for user-facing notifications. Replaces all legacy inline `alert()` or manual DOM-based toast manipulations. Methods include `showSuccess(msg)` and `showError(msg)`.
- **`App.Auth` (`modules/auth.js`)**: The singular source of truth for session management, login states, and route protection. Encapsulates all raw `supabase.auth` calls to prevent duplication. Methods include `getCurrentUser()`, `requireAuth(redirectUrl)`, `requireGuest(redirectUrl)`, and `logout(redirectUrl)`.

### Legacy Modules (Pending Phase 3)
- **`cart.js`**: Currently acts as a monolithic controller for:
  - LocalStorage cart state management (`addToCart`, `updateCartQty`, `removeFromCart`, `renderCart`).
  - Checkout logic (`checkoutToOrderFull`): Validates inputs, fetches current database prices to prevent manipulation, and executes Supabase `orders` and `order_items` inserts.
  - **Note:** Order placement logic intentionally remains in `cart.js` until `modules/orders.js` is established to avoid breaking the checkout flow.

## Database Schema
### Tables
- **users**: Managed internally by Supabase Auth (auth.users)
- **profiles**: `id` (references auth.users), `email`, `full_name`, `phone`, `address`, `created_at`, `role` (e.g., 'admin' or 'customer')
- **products**: `id`, `title`, `price`, `old_price`, `description`, `origin`, `category`, `image_url`, `stock`, `rating`, `reviews_count`
- **orders**: `id`, `user_id` (references auth.users), `total_amount`, `status` (pending, shipped, delivered), `shipping_address` (JSON), `payment_method`, `created_at`
- **order_items**: `id`, `order_id` (references orders.id), `product_id` (references products.id), `quantity`, `price_at_time`
- **leads**: `id`, `name`, `email`, `phone`, `interest`, `item`, `message`, `created_at`

### Relationships
- `auth.users.id` -> `profiles.id` (1:1)
- `auth.users.id` -> `orders.user_id` (1:N)
- `orders.id` -> `order_items.order_id` (1:N)
- `products.id` -> `order_items.product_id` (1:N)

## Security Config
- **RLS policies applied:** `profiles` (Users can read/update own; Admin reads all), `orders` (Users read own; Insert own; Admin reads/updates all), `products` (Public read; Admin insert/update/delete).
- **CORS config:** Default Supabase settings for the domain.
- **Supabase keys used:** `anon_key` exposed to client for secure RLS-governed queries.
- **Roles/permissions:** Implemented via a `role` column in the `profiles` table or Supabase Custom Claims.

## Architecture Decisions Record (ADR)
The following decisions have been intentionally deferred during the Phase 1 & 2 Modularization passes to prioritize stability over extraction:
1. **`modules/orders.js` Extraction Postponed**: `checkoutToOrderFull` logic remains within `cart.js`, and order fetching remains within `account.js` and `admin_orders.js`. Extracting this logic before standardizing `App.UI` and `App.Auth` risked severe checkout regressions.
2. **Authenticated Cart Sync Postponed**: The cart remains strictly LocalStorage-based. Syncing with a `cart_items` table was deferred to prevent blocking the checkout flow with complex merge conflicts between guest and logged-in states.
3. **Price Discrepancy Checks Postponed**: Verifying cart prices against the database during checkout is pending Phase 3. Modifying checkout logic while extracting it risked generating orphan orders.
4. **Schema Changes Frozen**: No changes to the database schema or RLS policies were made to ensure backward compatibility with existing data.

## Maintenance Checklist for Future Changes
Before pushing any updates or new features to the platform, verify against this checklist:

### 1. Script Load Order Requirements
All new and existing HTML pages MUST load scripts in this exact sequence to prevent `undefined` namespace errors:
1. `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`
2. `<script src="supabaseClient.js"></script>`
3. `<script src="modules/ui.js"></script>`
4. `<script src="modules/auth.js"></script>`
5. `<script src="main.js"></script>`
6. `<script src="cart.js"></script>` (if needed)
7. `<script src="page_specific.js"></script>`

### 2. Authentication Logic Rules
- **DO NOT** use `supabase.auth.getSession()` or `supabase.auth.getUser()` directly in page scripts.
- **DO USE** `App.Auth.getCurrentUser()` for checking session state.
- **DO USE** `App.Auth.requireAuth('login.html')` for protecting private routes (e.g., account, checkout).
- **DO USE** `App.Auth.requireGuest('index.html')` for preventing logged-in users from accessing login/signup routes.
- **DO USE** `App.Auth.logout('login.html')` for sign-out triggers.

### 3. UI and Error Handling Rules
- **DO NOT** use native `alert()` or manual DOM element injection for notifications.
- **DO NOT** silently swallow errors via `console.error(err)` without surfacing them to the user.
- **DO USE** `App.UI.showSuccess("Message")` and `App.UI.showError("Message")` for all user-facing notifications.

### 4. Checkout Logic Rules
- **DO NOT** modify `checkoutToOrderFull` without running full regression tests.
- **DO NOT** move `checkoutToOrderFull` out of `cart.js` until Phase 3 (`modules/orders.js`) is explicitly authorized.
- Ensure that the checkout flow degrades gracefully if Supabase fails (e.g., catching errors and displaying them via `App.UI`).

### 5. Deployment Regression Tests
Before deploying any changes, verify the following core flows remain unbroken:
- [ ] User can log in and log out successfully.
- [ ] Account dashboard correctly loads existing user orders.
- [ ] Guest users are redirected to login when trying to access `/account.html`.
- [ ] Users can add items to the cart and view them in `cart.html`.
- [ ] Checkout form successfully creates an order in Supabase and clears the cart on success.
- [ ] Admin dashboard correctly authenticates admins and fetches order lists.
