CREATE TABLE IF NOT EXISTS debitos_cache (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  veiculo_id    INT UNSIGNED NOT NULL,
  estado        VARCHAR(2) NOT NULL,
  dados_json    MEDIUMTEXT,
  consultado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_veiculo (veiculo_id)
);
