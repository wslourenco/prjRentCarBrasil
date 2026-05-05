-- Migration: adiciona fluxo de aprovação de cadastro
SET @sql_status = (
  SELECT IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios'
        AND COLUMN_NAME = 'status_aprovacao'),
    'SELECT 1',
    'ALTER TABLE usuarios ADD COLUMN status_aprovacao ENUM(''pendente'',''aprovado'',''rejeitado'') NOT NULL DEFAULT ''aprovado'' AFTER senha_deve_trocar'
  )
);
PREPARE stmt_status FROM @sql_status;
EXECUTE stmt_status;
DEALLOCATE PREPARE stmt_status;

SET @sql_motivo = (
  SELECT IF(
    EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios'
        AND COLUMN_NAME = 'motivo_rejeicao'),
    'SELECT 1',
    'ALTER TABLE usuarios ADD COLUMN motivo_rejeicao VARCHAR(500) DEFAULT NULL AFTER status_aprovacao'
  )
);
PREPARE stmt_motivo FROM @sql_motivo;
EXECUTE stmt_motivo;
DEALLOCATE PREPARE stmt_motivo;
