# Database migration policy

Stage 2A establishes PostgreSQL as the production persistence target. Schema changes must be versioned before production deployment. Until Alembic is introduced, `Base.metadata.create_all()` is permitted only for initial development/bootstrapping and must not be treated as a production migration mechanism.

## Production prerequisite

Set `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`, and `FRONTEND_ORIGINS` in the backend runtime environment. Never commit these values.
