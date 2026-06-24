# Pulse Check — User Journey (Optimized)

*Your daily pulse on the world.*

---

## 1. Product Summary

Pulse Check is a news aggregator. Users browse top headlines by **region** (World / US / Local) and **topic** (sub-category), search across all articles, and—when registered—save articles and searches for later. Clicking an article opens the original source site in a new tab.

---

## 2. User Types

| Type | Browse | Set Local Region | Save Articles | Save Searches |
|------|:------:|:----------------:|:-------------:|:-------------:|
| **Guest** (logged out) | ✅ Full | ✅ (persists on device only) | ❌ | ❌ |
| **Registered** (logged in) | ✅ Full | ✅ (persists to profile, syncs across devices) | ✅ | ✅ |

- A guest's local region persists locally (browser storage) across visits.
- On login, if the device has a local region but the profile does not, prompt once: *"Save this region to your account?"* This prevents a guest's region silently disappearing or being overwritten.

---

## 3. Global UI Elements

These appear on every browse/results page and are described once here instead of repeating per screen.

**Header (top bar)**
- **Menu icon** (top-left): opens the sidebar (see §7).
- **Date**: today's date, e.g. *Monday, June 22, 2026*.
- **Location label**: shows the set local region (e.g. *Hacienda Heights, CA*) with an edit (✎) icon; shows **"Set Location ✎"** when none is set. Clicking either opens the **Set Local Region** popup (§5).
- **Donate** button: opens a **Stripe-powered donation flow** (Stripe API). *(Newly specified.)*
- **User icon** (top-right): opens Login/Register popup (guest) or the account dropdown (logged in) — see §8.

**Logo block**: Pulse Check wordmark + tagline.

**Region tabs**: **World**, **US**, **Local**. The active region is underlined.

**Sub-category row**: **All**, Business, Crime, Entertainment, Health, Politics, Sports, Tech, Weather. The active sub-category is underlined. **All** clears sub-category filtering.

**Search box** (top-right of nav): see §6.

> **Consistency note:** the **same header + nav must render on every browse/results screen** (Home, Search, Saved Articles, Saved Searches, No-Results). The original wireframe omits some controls on some screens (see Changelog).

---

## 4. Home / Browse

- All users land on the **Home page**: default region **World**, sub-category **All**, under a **"Latest Headlines"** heading.
- Articles render in **numbered, paginated pages of 9 (3 × 3)**, ordered by **publish date, newest first**.

**Article card** contains: article image, **category**, **title**, **publish date**, **source**, and a body **snippet**.
- **Save flag** (bookmark) sits at the top-right of the card.
  - Logged in → toggles save/unsave.
  - **Guest → clicking the flag opens the Login/Register popup** with a short prompt (*"Log in to save articles"*). *(Previously undefined for guests.)*
- Clicking anywhere else on the card opens the **source website in a new tab** (keeps the user's place in Pulse Check).

**Filtering**
- Changing region or sub-category reloads results for that combination and resets to page 1.
- Filtering and search are mutually exclusive: starting a search clears active region/sub-category context (§6); clicking a region or sub-category **exits search** and returns to browse.

---

## 5. Regions & Local Setup

- **World / US**: filter headlines to that region.
- **Local**: filters to the user's set region.
  - If no local region is set, selecting **Local** opens the **Set Local Region** popup.
  - The popup can also be opened any time via the header location label.

**Set Local Region popup**
- A **single input field** labeled *"Set your local region — enter a city, state, or ZIP code,"* with a **Submit** button.
- **Type-ahead suggestions:** as the user types, matching locations appear in a dropdown drawn from the known-locations list. Selecting a suggestion fills the field and enables Submit. Because users pick from real suggestions, spelling validates automatically.
- Accepts **full names and abbreviations** (e.g. "California" or "CA") and ZIP codes (resolved to a city/state for display).
- Submit stays **disabled until a valid location is selected**, preventing half-typed or invalid entries.
- On submit, the header label updates and Local results load.
- **Error state:** no matches shows inline *"We couldn't find that location — check spelling or try a ZIP code."*

---

## 6. Search

- Keywords search **all articles** whose **title or description** contain the terms, **ignoring** the current region/sub-category selection.
- The results screen shows **"Searching: {criteria}"** with a **Save flag to its left** (logged-in users save the search here; guests get the login prompt).
- **Date Range filter:** a **From – To** date control narrows results to articles published within the range. Empty = no date limit.
- **Sort control:** default **publish date, descending**; clicking the active sort again toggles to **ascending** — consistent with Saved Articles and Saved Searches. Works alongside the date-range filter.
- Results use the same **3 × 3 paginated** card layout.
- Submitting a search from any screen routes to this results screen.

---

## 7. Menu (Sidebar)

Opened from the top-left menu icon. Contents depend on user type.

- **Guest:** About Us
- **Registered:** About Us · Saved Articles · Saved Searches · **(Logout pinned to the bottom)**

Selecting an item navigates and closes the sidebar. Tapping the scrim/overlay or the menu icon again closes it.

---

## 8. Account

### 8a. Login / Register popup (from user icon, guest)
A single popup toggling between **Login** (default) and **Register**.

**Login**
- Fields: Email, Password (with show/hide eye toggle).
- **Password Reset** link and **Submit** button.
- Invalid credentials → inline error (no field-clearing).

**Register**
- Fields: First Name, Email, Password, Confirm Password (eye toggles on both password fields).
- **"I agree to terms and privacy policy" checkbox** — required to enable Submit. *(Present in wireframe, previously undocumented; link the terms/privacy text.)*
- Inline validation: email format, password rules, password match.

After login or successful verification, the user **returns to the page they were on**.

### 8b. Password Reset
The full flow is three screens:
1. **Request** — From the Login tab, **Password Reset** swaps the popup to a single **Email** field + **Reset Password** button.
2. **Confirmation** — On submit, show *"Check your email — if an account exists for {email}, we've sent a link to reset your password,"* with the spam-folder note, a **Resend email** link (short cooldown), and a **Back to login** link. Neutral wording avoids revealing whether an email is registered.
3. **Set new password** — The emailed link opens a page with **New Password** + **Confirm New Password** (eye toggles), validating match and password rules. On success, confirm and route the user to login (or auto-login back to where they were).
   - **Link expiry:** reset links are valid for **30 minutes**. An expired (or already-used) link opens an error state: *"This password reset link has expired. Please request a new one,"* with a button back to the **Password Reset request** screen.

### 8c. Email Verification
- After registering, show **"Thank you for signing up"** with inbox instructions (and spam-folder note).
- **Add a "Resend verification email" link** (with a short cooldown) and a **"Back to site"** link, so users aren't stranded. *(Previously a dead-end screen.)*
- Clicking the emailed link verifies the account and returns the user to where they left off.

### 8d. Account dropdown (from user icon, logged in)
- **Update Profile**, **Logout**.

### 8e. Update Profile / Change Password popup
Toggles between **Profile** (default) and **Password**.

- **Profile:** First Name, Email — **pre-filled with current values** so it reads as an edit, not a blank form. *(Wireframe showed empty fields — changed.)* Email change should trigger re-verification.
- **Password:** Old Password, New Password, Confirm New Password (eye toggles). Validate old password server-side; enforce match + rules on the new one.
- Submit shows a brief success confirmation.

### 8f. Logout
- From the account dropdown (or sidebar). Returns the user to the public Home page; device-stored local region persists.

---

## 9. Registered User Features

### 9a. Saved Articles
- Same **numbered, 3 × 3 paginated** card layout as Home.
- **Unsave** by tapping the save flag — the card **disappears immediately**.
- **Sort** control: defaults to **publish date, descending**; clicking the active sort again toggles to ascending; users can also sort by **date saved**. The control shows the active direction ("Descending") rather than a generic "Sort" label.
- **Empty state:** *"No saved articles to display."*

### 9b. Saved Searches
- List of cards showing **Save Date** and **Criteria**, each with a **Search** button (to re-run) and a **save flag** (to unsave).
- **Run:** clicking the **Search** button re-runs that search **live** with fresh results, routing to the Search results screen (§6). The dedicated button keeps "run" and "unsave" clearly separate actions.
- **Unsave** (save flag) removes the card immediately.
- **Sort:** by **date saved, desc** (default); clicking the active sort again toggles to asc.
- **Empty state:** *"No saved searches to display."*

---

## 10. System States

- **No results** (any browse/search/filter combo): *"There are no articles matching this search criteria. Please try widening your search."* Keep the full header/nav so users can adjust filters in place. *(Original copy was missing its closing quote.)*
- **Error page:** branded message + **Home** button. *(Present in wireframe; now documented.)*
- Consider a distinct empty state for **Local with no nearby coverage** vs. a failed search, since the fix differs (broaden region vs. widen terms).

---

## 11. Changelog & Rationale

**Inconsistencies fixed (doc ↔ wireframe)**
1. **Search refinement** — search results now include both a **From – To date range** filter and a **descending/ascending sort** toggle, consistent with the saved views.
2. **Saved-articles / saved-searches sort** — wireframe showed a generic "Sort" button; now updated to display the active direction (descending), with toggle-to-ascending behavior.
3. **Profile fields empty** — an "update" form should pre-fill current values. Changed to pre-filled.
4. **Header parity** — some browse screens dropped controls (Donate, location label). Standardized one global header across all browse/results screens (§3).
5. **No-results copy** — original sentence was missing its closing quotation mark. Fixed.

**Gaps now documented**
6. **Donate** button — present everywhere, never specified. Now defined as a Stripe-powered donation flow.
7. **Terms & privacy checkbox** on Register — present in wireframe, undocumented; now required-to-submit.
8. **Password-reset confirmation** — added a neutral confirmation state ("if an account exists…") to avoid account enumeration.
9. **Email-verification dead-end** — added Resend + Back-to-site so the page isn't a cul-de-sac.
10. **Guest taps Save flag** — behavior was undefined; now opens login prompt.
11. **Password show/hide** eye toggles — present in wireframe, now noted in fields.
12. **Error page** — documented.

**UX improvements**
13. **Set Local Region** — now a **single type-ahead field** ("city, state, or ZIP") with suggestions and a not-found error state, replacing the three ambiguous boxes that made users guess which to fill.
14. **Saved search run vs. unsave** — each card now has a dedicated **Search** button to re-run, separate from the save flag, removing any ambiguity with the unsave action.
15. **Guest→login region merge** — handle the case where a guest who set a region later logs in, instead of silently dropping or overwriting it.
16. **Search ↔ filter exclusivity** — defined what happens when a user clicks a region/sub-category while in search (exits search), which the original left ambiguous.

---

## 12. Decisions Locked

- **Donate**: opens a Stripe-powered donation flow (Stripe API). *(Confirm: Stripe Checkout redirect vs. embedded element.)*
- **Article links**: open the source article in a **new tab**, so users keep their place in Pulse Check.
- **Pagination**: **numbered pages** across all paginated views (Home, Search, Saved Articles, Saved Searches).
- **Saved Articles default sort**: **publish date, descending** (date-saved remains an alternate sort option).

## 13. Open Questions (deferred)

- **Responsive behavior** *(deferred — revisit later)*: define tablet/mobile column counts and how the dense header (date + location + Donate + search) reflows on narrow screens.