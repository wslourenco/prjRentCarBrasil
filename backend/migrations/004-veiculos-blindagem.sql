SET @sql_blindado = (
  SELECT IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'veiculos'
        AND COLUMN_NAME = 'blindado'),
    'SELECT 1',
    'ALTER TABLE veiculos ADD COLUMN blindado TINYINT(1) NOT NULL DEFAULT 0 AFTER nr_bloqueador'
  )
);
PREPARE stmt_blindado FROM @sql_blindado;
EXECUTE stmt_blindado;
DEALLOCATE PREPARE stmt_blindado;

SET @sql_nivel = (
  SELECT IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'veiculos'
        AND COLUMN_NAME = 'nivel_blindagem'),
    'SELECT 1',
    'ALTER TABLE veiculos ADD COLUMN nivel_blindagem VARCHAR(20) DEFAULT NULL AFTER blindado'
  )
);
PREPARE stmt_nivel FROM @sql_nivel;
EXECUTE stmt_nivel;
DEALLOCATE PREPARE stmt_nivel;
