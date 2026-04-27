ALTER TABLE despesas_receitas
    ADD COLUMN locador_id INT UNSIGNED NULL AFTER colaborador_id,
    ADD INDEX idx_despesas_receitas_locador_id (locador_id),
    ADD CONSTRAINT fk_dr_locador FOREIGN KEY (locador_id) REFERENCES locadores(id) ON DELETE SET NULL;

UPDATE despesas_receitas dr
LEFT JOIN veiculos v ON v.id = dr.veiculo_id
SET dr.locador_id = v.locador_id
WHERE dr.locador_id IS NULL
  AND v.locador_id IS NOT NULL;
