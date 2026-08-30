-- Gurukulam AI Stage 2A reference schema.
-- This is a reviewable SQL baseline; production execution should be performed
-- by the deployment migration runner, not by application startup.

CREATE TABLE IF NOT EXISTS parents (
    id BIGSERIAL PRIMARY KEY,
    google_sub VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(320) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS children (
    id BIGSERIAL PRIMARY KEY,
    parent_id BIGINT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    child_id VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(50),
    grade VARCHAR(50),
    section VARCHAR(50),
    school_name VARCHAR(255),
    school_board VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_children_parent_id ON children(parent_id);
CREATE INDEX IF NOT EXISTS ix_children_child_id ON children(child_id);
