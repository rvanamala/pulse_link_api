# Pulse Link API (Express + JWT)

Minimal Express API with JWT authentication and in-memory user store.

Features
- POST /api/auth/register -> register new user (username, password)
- POST /api/auth/login -> login (username, password) -> returns JWT
- GET /api/protected -> sample protected endpoint (Authorization: Bearer <token>)

Quick start

1. Install dependencies

```bash
cd /Users/rajender.vanamala/WORK/DEV/pulse_link
npm install
```

2. Start server

```bash
# optional: copy .env.example to .env and edit JWT_SECRET
cp .env.example .env
npm start
```

3. Try it (examples)

Register:

```bash
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"username":"alice","password":"password123"}'
```

Login:

```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"alice","password":"password123"}'
```

Protected (replace <TOKEN> with JWT from login):

```bash
curl http://localhost:3000/api/protected -H "Authorization: Bearer <TOKEN>"
```

Notes
- This is a minimal example using an in-memory user list. For production, use a database and stronger secrets management.
# pulse_link_api
