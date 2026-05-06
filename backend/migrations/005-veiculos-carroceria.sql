SET @sql_carroceria = (
  SELECT IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'veiculos'
        AND COLUMN_NAME = 'carroceria'),
    'SELECT 1',
    'ALTER TABLE veiculos ADD COLUMN carroceria VARCHAR(20) DEFAULT NULL AFTER nr_bloqueador'
  )
);
PREPARE stmt_carroceria FROM @sql_carroceria;
EXECUTE stmt_carroceria;
DEALLOCATE PREPARE stmt_carroceria;
