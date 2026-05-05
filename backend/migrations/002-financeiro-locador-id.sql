SET @sql_col = (
  SELECT IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'despesas_receitas'
        AND COLUMN_NAME = 'locador_id'),
    'SELECT 1',
    'ALTER TABLE despesas_receitas ADD COLUMN locador_id INT UNSIGNED NULL AFTER colaborador_id'
  )
);
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

SET @sql_idx = (
  SELECT IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'despesas_receitas'
        AND INDEX_NAME = 'idx_despesas_receitas_locador_id'),
    'SELECT 1',
    'ALTER TABLE despesas_receitas ADD INDEX idx_despesas_receitas_locador_id (locador_id)'
  )
);
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

SET @sql_fk = (
  SELECT IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'despesas_receitas'
        AND CONSTRAINT_NAME = 'fk_dr_locador'),
    'SELECT 1',
    'ALTER TABLE despesas_receitas ADD CONSTRAINT fk_dr_locador FOREIGN KEY (locador_id) REFERENCES locadores(id) ON DELETE SET NULL'
  )
);
PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

UPDATE despesas_receitas dr
LEFT JOIN veiculos v ON v.id = dr.veiculo_id
SET dr.locador_id = v.locador_id
WHERE dr.locador_id IS NULL
  AND v.locador_id IS NOT NULL;
