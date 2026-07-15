# Task List: RBAC Rules Adjustments

- [x] Extend AuthContext.tsx `isAdmin` validation to cover `'moderator'` and `'super-admin'` roles
- [x] Extend `UserRole` type in `types/index.ts` to include `'moderator'` and `'super-admin'` to ensure TypeScript compiles without comparison overlap errors
- [x] Adjust `firestore.rules` security definitions:
  - [x] Allow read/write to users, products, orders, settings, coupons, clicks, and withdrawals for moderators, admins, and super-admins
  - [x] Create permissions configuration rules for the `tickets` collection
- [x] Build & Verify
  - [x] Run `npm run build`
