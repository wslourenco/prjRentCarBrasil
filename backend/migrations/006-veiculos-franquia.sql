SET @sql_franquia = (
  SELECT IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'veiculos'
        AND COLUMN_NAME = 'franquia'),
    'SELECT 1',
    'ALTER TABLE veiculos ADD COLUMN franquia DECIMAL(10,2) DEFAULT NULL AFTER nr_bloqueador'
  )
);
PREPARE stmt_franquia FROM @sql_franquia;
EXECUTE stmt_franquia;
DEALLOCATE PREPARE stmt_franquia;
