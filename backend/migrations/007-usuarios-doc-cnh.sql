SET @sql_doc_cnh = (
  SELECT IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios'
        AND COLUMN_NAME = 'doc_cnh'),
    'SELECT 1',
    'ALTER TABLE usuarios ADD COLUMN doc_cnh MEDIUMTEXT AFTER doc_comprovante'
  )
);
PREPARE stmt_doc_cnh FROM @sql_doc_cnh;
EXECUTE stmt_doc_cnh;
DEALLOCATE PREPARE stmt_doc_cnh;
