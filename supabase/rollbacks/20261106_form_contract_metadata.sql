-- Roll back the frontend release if necessary. Retain additive metadata/program
-- columns and their contents; dropping them would destroy newly saved fields.
-- No automatic row updates, status conversion, DROP or DELETE is authorized.
SELECT 'Preserve metadata columns and restore the previous frontend deployment; inspect per-table requirements before any future schema rollback.' AS rollback_plan;
