# Security Specification - Miner AI

## 1. Data Invariants
- A **User** profile must belong to the authenticated user and cannot be created or modified for others.
- A **Chat Message** must belong to the authenticated user and cannot be read by others.
- A **Creation** can be public (read-only for all signed-in users) or private (only owner).
- **customApiKey** must only be readable and writable by the account owner.
- Identity fields (userId, email) are immutable once set.
- All timestamps must be server-generated.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing (User Create)**: Create user with `userId` of another user.
2. **Identity Spoofing (Creation)**: Create creation with `userId` of another user.
3. **Ghost Field (User Update)**: Update user profile and inject `isAdmin: true`.
4. **ID Poisoning**: Attempt to set document ID as a 1MB string of junk characters.
5. **PII Leak**: Attempt to list all users to scrape emails.
6. **State Shortcut**: Attempt to update a creation content to a 10MB string.
7. **Orphaned Write**: Create a child document referencing a non-existent parent ID.
8. **Email Spoofing**: Attempt to write as owner with `email_verified: false`.
9. **History Scraping**: Attempt to list another user's chat messages.
10. **Shadow Admin**: Attempt to write to `admins` collection.
11. **Action Bypass**: Update a user's `email` (immutable field).
12. **Timestamp Trickery**: Set `createdAt` to a date in the past.

## 3. Test Runner (Draft Logic)
Verified via `firestore.rules.test.ts` (Mock representation):
- Expect Permission Denied for all above payloads.
- Expect Success for legitimate owner reads/writes.
- Expect Success for public creation reads by other signed-in users.
