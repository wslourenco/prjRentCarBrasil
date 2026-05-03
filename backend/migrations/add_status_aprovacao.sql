-- Migration: adiciona fluxo de aprovação de cadastro
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS status_aprovacao ENUM('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'aprovado' AFTER senha_deve_trocar,
  ADD COLUMN IF NOT EXISTS motivo_rejeicao VARCHAR(500) DEFAULT NULL AFTER status_aprovacao;
