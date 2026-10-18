# Security Specification & Test Matrix

## 1. Data Invariants
1. **Visitor Telemetry Isolation**: Visitors may write/upsert their telemetry without overwriting unrelated records. Only authenticated administrators (or verified master credentials) can enumerate and read visitor records.
2. **One-Time Contact Message**: Each client identifier (IP or device fingerprint) can create exactly one message document. Messages cannot be modified or deleted by visitors once created.
3. **Lock Guarantee**: Submission locks prevent duplicate writes across browser clears and IP shifts.
4. **Boundary & Schema Integrity**: Every string field must enforce strict boundary limits (`size() <= MAX`). No unexpected attributes are allowed.
5. **PII Protection**: Visitor and message PII (IP, email, location details) are protected from public query scraping.

## 2. The Dirty Dozen Payloads
1. **Payload 1 (Ghost Field in Message)**: `{"name": "Ali", "email": "ali@mail.com", "message": "Hi", "ip": "1.1.1.1", "fingerprint": "abc", "createdAt": "...", "isAdmin": true}` -> REJECTED (Unallowed property).
2. **Payload 2 (Exceeding Message Size)**: Message text exceeding 2000 characters -> REJECTED (Boundary violation).
3. **Payload 3 (Blank Name/Email)**: Message with empty `name` or invalid structure -> REJECTED.
4. **Payload 4 (Client Modifying Message After Creation)**: Client attempting `update` on `/messages/{id}` -> REJECTED (Immutable).
5. **Payload 5 (Client Deleting Message)**: Non-admin trying `delete` on `/messages/{id}` -> REJECTED.
6. **Payload 6 (Oversized Document ID)**: Attempting to insert a document with a 2000-character ID string -> REJECTED (`isValidId` check).
7. **Payload 7 (Scraping Public Messages)**: Unauthenticated visitor running `list` on `/messages` -> REJECTED.
8. **Payload 8 (Scraping Public Visitors)**: Unauthenticated visitor running `list` on `/visitors` -> REJECTED.
9. **Payload 9 (Oversized IP String)**: Injecting a 500-byte IP string -> REJECTED (`size() <= 64`).
10. **Payload 10 (Falsifying Submission Lock ID)**: Creating a lock record pointing to a non-existent format -> REJECTED.
11. **Payload 11 (Overwriting another user's Lock)**: Attempting to rewrite an existing lock ID -> REJECTED.
12. **Payload 12 (Client Updating Read Status without Admin)**: Attempting to change `status` from `'unread'` to `'archived'` without admin credentials -> REJECTED.
