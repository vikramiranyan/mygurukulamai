# Gurukulam API integration

The browser client uses `VITE_API_BASE_URL` for the deployed FastAPI origin. Leave it empty only for a same-origin deployment with `/children` routes available at the frontend origin.

The API client never accepts or sends a `child_id` when creating a child; the server remains authoritative for public Child IDs.

Required production wiring:

1. Deploy the FastAPI backend with PostgreSQL.
2. Set `VITE_API_BASE_URL` in the frontend build environment to the backend origin.
3. Configure `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `DATABASE_URL`, and `FRONTEND_ORIGINS` on the backend.
4. Run frontend and backend CI before production acceptance.
