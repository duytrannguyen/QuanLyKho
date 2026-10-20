-- Every query named VIOLATION must return zero rows.
SELECT 'active_inventory' AS table_name,COUNT(*) AS rows_count FROM active_inventory UNION ALL SELECT 'closed_cycles',COUNT(*) FROM closed_cycles UNION ALL SELECT 'serial_registry',COUNT(*) FROM serial_registry UNION ALL SELECT 'qk_migration_sales',COUNT(*) FROM qk_migration_sales;
SELECT state,COUNT(*) FROM active_inventory GROUP BY state;
SELECT close_type,COUNT(*) FROM closed_cycles GROUP BY close_type;
SELECT 'VIOLATION_DUPLICATE_SERIAL' AS check_name,serial_key FROM active_inventory GROUP BY serial_key HAVING COUNT(*)>1;
SELECT 'VIOLATION_CYCLE_OVERLAP' AS check_name,a.cycle_id FROM active_inventory a JOIN closed_cycles c ON c.cycle_id=a.cycle_id;
SELECT 'VIOLATION_MISSING_CONFIG' AS check_name,a.cycle_id FROM active_inventory a LEFT JOIN cat_configs cfg ON cfg.id=a.config_id WHERE cfg.id IS NULL;
SELECT 'VIOLATION_MISSING_REGISTRY' AS check_name,a.serial_key FROM active_inventory a LEFT JOIN serial_registry r ON r.serial_key=a.serial_key WHERE r.id IS NULL;
SELECT 'VIOLATION_DOUBLE_TRANSACTION' AS check_name,source_reference FROM closed_cycles WHERE close_type='SALE' AND source_reference IS NOT NULL GROUP BY source_reference HAVING COUNT(*)>1;
SELECT issue_type,severity,COUNT(*) FROM data_issues WHERE status='OPEN' GROUP BY issue_type,severity;
SELECT source_kind,status,COUNT(*) FROM qk_migration_sales GROUP BY source_kind,status;
