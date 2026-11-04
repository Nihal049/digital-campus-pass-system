# Digital Campus Pass System & RAG AI Campus Assistant
**Enterprise Campus Access Management & Policy Intelligence Platform**  
*Batch-17 Project Specification & Implementation*  
*Lead Developer*: P. Nihal (24A81A0549)  
*Team Members*: R. Eswar (25A81A0254), G. Hema Chandra (26A81A0416), S. Charan (25A81A0452), Ch. Ganesh (26A81A6176)

---

## 1. Project Overview

The **Digital Campus Pass System** is a full-stack, enterprise-grade access control and gate movement platform engineered for modern university campuses. It replaces paper-based gate passes with cryptographically signed, dynamic QR code passes, automates multi-stage faculty and administrator approval workflows, tracks gate entry and exit movements in real-time, manages campus visitors, and integrates an isolated **Retrieval-Augmented Generation (RAG) AI Campus Assistant** for policy-grounded inquiry resolution.

### Core Capabilities:
1. **Digital Pass Management**: Configurable pass types (Student Out Pass, Visitor Pass, Faculty/Staff Duty Pass, Event Pass, Emergency Pass) with full lifecycle state machines (`DRAFT` $\rightarrow$ `PENDING` $\rightarrow$ `APPROVED`/`REJECTED` $\rightarrow$ `ACTIVE` $\rightarrow$ `COMPLETED`/`REVOKED`/`CANCELLED`).
2. **Cryptographic Anti-Tamper QR Verification**: HMAC-SHA256 signature verification preventing pass forgery, screenshot reuse, expired access, and unauthorized entry.
3. **Camera-Based & Handheld QR Scanner**: Mobile-optimized camera scanner with rear-camera preference, scanning animations, manual token fallback, and instant validation status.
4. **Campus Gate & Movement Tracking**: Real-time logging of entries and exits across designated gates (Main Gate, North Gate, Hostel Gate, Library Gate).
5. **Real-Time "Currently Inside Campus" Monitor**: Live headcount tracker automatically displaying personnel currently on campus grounds upon gate entry and removing them upon exit.
6. **Visitor Management**: Pre-registration, faculty host clearance, temporary digital visitor pass generation, and gate check-in/out tracking.
7. **Role-Based Access Control (RBAC)**: Enforced authorization for Super Admin, Security Officers, Faculty Mentors, Students, and Visitors.
8. **In-App Notifications & Email Service**: Notification bell with unread counter and extensible email dispatch abstraction.
9. **RAG-Powered AI Campus Assistant**: Vectorized knowledge base in PostgreSQL with native cosine similarity search, grounded contextual responses, exact citations, prompt-injection defenses, and hybrid transactional database routing.
10. **Immutable Audit Trail**: Chronological, searchable log of all authentication events, pass decisions, gate movements, and document indexing.

---

## 2. Technology Stack

* **Frontend**: React 19, JavaScript (ES2024), Tailwind CSS v4, React Router v7, Lucide Icons, `html5-qrcode` (camera QR scanning).
* **Backend**: Node.js v24, Express.js REST API, JWT authentication, `bcryptjs` password hashing, `qrcode` generation, `@google/genai` SDK, `pdf-parse`, `multer`.
* **Database**: **PostgreSQL 18** (Production Source of Truth) with connection pooling (`pg.Pool`), parameterized queries, transactions, foreign keys, unique constraints, and indexes. Zero SQLite runtime dependencies.
* **Vector Store**: PostgreSQL tables (`rag_documents`, `rag_document_chunks`, `rag_ingestion_logs`) with native PostgreSQL vector similarity functions and pgvector schema compatibility.
* **API Documentation**: OpenAPI 3.0 / Swagger specification at `/api/docs`.

---

## 3. Database Architecture & Schema

The application runs exclusively on **PostgreSQL**:

```
PostgreSQL Database (digital_campus_pass)
├── Transactional Tables (Source of Truth)
│   ├── departments
│   ├── campus_gates
│   ├── pass_types
│   ├── users
│   ├── digital_passes
│   ├── qr_tokens
│   ├── gate_scans
│   ├── currently_inside
│   ├── visitors
│   ├── notifications
│   ├── audit_logs
│   └── system_settings
└── RAG & Vector Tables (Logically & Physically Separated)
    ├── rag_documents
    ├── rag_document_chunks (with double precision[] embeddings)
    └── rag_ingestion_logs
```

### Migrations:
- `backend/migrations/001_initial_schema.sql`: Full normalized relational schema with foreign keys, checks, and performance indexes.
- `backend/migrations/002_pgvector_rag.sql`: Vector knowledge schema, document chunk tables, ingestion logs, and PostgreSQL native `cosine_similarity(a, b)` function.

---

## 4. Environment Configuration

Configuration is managed via `backend/.env`. A template is provided at `backend/.env.example`.

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/digital_campus_pass
JWT_SECRET=super-secure-campus-jwt-token-secret-batch17-2026
JWT_EXPIRES_IN=24h
QR_SECRET=qr-crypto-signature-key-batch17-2026
FRONTEND_URL=http://localhost:3000

# AI Configuration (Optional: Add Google Gemini API Key for live LLM generation)
AI_PROVIDER=google-gemini
LLM_MODEL=gemini-2.5-flash
EMBEDDING_MODEL=text-embedding-004
GEMINI_API_KEY=
AI_API_KEY=
```

> [!NOTE]
> If a local PostgreSQL instance is not already running on port 5432, the backend automatically boots an internal PostgreSQL 18 server instance on port 5432 with persistent storage in `backend/.pgdata`, ensuring zero-setup execution.

---

## 5. Security & Access Control

1. **Backend Authorization**: Authenticated user roles are cryptographically encoded in signed JWTs and validated on every backend request via `requireRoles()`. Client-side state cannot forge or escalate privileges.
2. **Dev Persona Switcher**: The development quick-switcher explicitly performs authentic `/api/auth/login` requests with valid passwords, obtaining genuine signed tokens.
3. **Movement Consistency Enforcement**:
   - **Exit before Entry is strictly blocked**: Gate security cannot record an EXIT movement for a user who is not currently inside campus.
   - **Consecutive Entry is strictly blocked**: Gate security cannot record an ENTRY movement for a user who is already inside campus without a prior recorded exit.
4. **RAG Prompt Injection & Untrusted Data Containment**:
   - Retrieved chunks are treated strictly as untrusted data enclosed in isolated boundary tags.
   - Irrelevant queries or empty retrieval trigger a strict no-context response to prevent hallucination.
   - Missing AI credentials display a transparent configuration notice rather than simulating fake LLM output.

---

## 6. Pre-Configured Test Accounts

| Role | Email / ID | Password | Key Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@campus.edu` / `ADM-001` | `admin123` | Full system control, Gates & Pass Types CRUD, Audit Logs, RAG Doc Indexing |
| **Security Officer** | `guard@campus.edu` / `SEC-007` | `security123` | Camera QR scanner, manual lookup, Entry/Exit movement logging, Inside headcount |
| **Faculty Mentor** | `faculty@campus.edu` / `FAC-101` | `faculty123` | Pass approval queue, approve with notes, reject with mandatory reason |
| **Student** | `nihal@campus.edu` / `24A81A0549` | `student123` | Request passes, view history, fullscreen QR display, RAG AI Assistant |
| **Visitor** | `visitor@gmail.com` / `VIS-999` | `visitor123` | Visitor portal, pre-registration, temporary QR pass display |

---

## 7. Verification & Automated Test Suite

Run the full integration test suite:

```bash
cd backend
npm test
```

### Test Suite Execution Output (32 / 32 Passed):
```
✓ 1. Health check passed: PostgreSQL confirmed as active runtime database
✓ 2. Student ID login (24A81A0549) verified
✓ 3. Faculty authentication verified
✓ 4. Security Guard authentication verified
✓ 5. Super Admin authentication verified
✓ 6. Backend RBAC strictly enforced (Student blocked from admin resources)
✓ 7. User profile update verified
✓ 8. Campus gates listed from PostgreSQL: 5 gates active
✓ 9. Admin created new campus gate successfully
✓ 10. Configured pass types verified: 5 types
✓ 11. Pass cancellation workflow verified
✓ 12. Student pass request created (ID: pas-af361381)
✓ 13. Faculty approved pass with cryptographic HMAC token generated in PostgreSQL
✓ 14. Cryptographic anti-tamper security verified (forged signature rejected)
✓ 15. Security QR verification passed at gate kiosk
✓ 16. Movement anomaly blocked: "Exit cannot happen before entry"
✓ 17. Campus ENTRY movement logged successfully
✓ 18. Movement anomaly blocked: "Entry cannot happen twice incorrectly"
✓ 19. "Currently Inside Campus" live tracker confirmed in PostgreSQL
✓ 20. Campus EXIT movement logged and user removed from inside registry
✓ 21. Visitor registered (ID: vis-fcf136f6)
✓ 22. Faculty approved visitor: Digital Pass and QR generated
✓ 23. Visitor gate entry granted and logged
✓ 24. Visitor gate exit completed and logged
✓ 25. Pass revocation verified (QR immediately invalidated)
✓ 26. In-App notifications verified in PostgreSQL: 8 notifications
✓ 27. Dashboard statistics aggregated directly from PostgreSQL tables
✓ 28. Native PostgreSQL Vector Similarity Search verified (3 chunks retrieved)
✓ 29. RAG Hallucination defense verified: No-context response triggered for irrelevant query
✓ 30. RAG Prompt Injection Defense verified (untrusted data containment isolated)
✓ 31. Hybrid RAG query confirmed (Live DB pass status + policy grounding)
✓ 32. System audit trail verified in PostgreSQL (10 logs verified)

======================================================
🏆 ALL 32 COMPREHENSIVE POSTGRESQL INTEGRATION TESTS PASSED!
======================================================
```

---

## 8. Live Application URLs

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Gate Security Kiosk**: [http://localhost:3000/gate-scanner](http://localhost:3000/gate-scanner)
- **Currently Inside Monitor**: [http://localhost:3000/currently-inside](http://localhost:3000/currently-inside)
- **AI Campus Assistant**: [http://localhost:3000/assistant](http://localhost:3000/assistant)
- **Visitor Portal**: [http://localhost:3000/visitors](http://localhost:3000/visitors)
- **Gates & Pass Types Admin**: [http://localhost:3000/gates-management](http://localhost:3000/gates-management)
- **System Audit Logs**: [http://localhost:3000/audit-logs](http://localhost:3000/audit-logs)
- **OpenAPI Documentation**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
