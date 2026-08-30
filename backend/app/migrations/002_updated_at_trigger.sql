-- Keep updated_at accurate when records are modified directly in PostgreSQL.
CREATE OR REPLACE FUNCTION gurukulam_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS parents_set_updated_at ON parents;
CREATE TRIGGER parents_set_updated_at
BEFORE UPDATE ON parents
FOR EACH ROW EXECUTE FUNCTION gurukulam_set_updated_at();

DROP TRIGGER IF EXISTS children_set_updated_at ON children;
CREATE TRIGGER children_set_updated_at
BEFORE UPDATE ON children
FOR EACH ROW EXECUTE FUNCTION gurukulam_set_updated_at();
