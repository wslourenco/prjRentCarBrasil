-- ============================================================
--  SisLoVe – Script de criação do banco de dados MySQL
--  Execute: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS sislove
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sislove;

-- ----------------------------------------------------------------
-- Tabela: usuarios
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(120) NOT NULL UNIQUE,
  senha_hash  VARCHAR(255) NOT NULL,
  perfil      ENUM('admin','locador','locatario') NOT NULL DEFAULT 'locatario',
  tipo_documento ENUM('cpf','cnpj') NOT NULL DEFAULT 'cpf',
  documento   VARCHAR(20) NOT NULL,
  ativo       TINYINT(1) NOT NULL DEFAULT 1,
  criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- Tabela: locadores
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locadores (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo            ENUM('fisica','juridica') NOT NULL DEFAULT 'fisica',
  nome            VARCHAR(120),
  cpf             VARCHAR(20),
  rg              VARCHAR(20),
  data_nascimento DATE,
  razao_social    VARCHAR(120),
  cnpj            VARCHAR(20),
  insc_estadual   VARCHAR(30),
  email           VARCHAR(120),
  telefone        VARCHAR(20),
  celular         VARCHAR(20),
  cep             VARCHAR(10),
  endereco        VARCHAR(150),
  numero          VARCHAR(10),
  complemento     VARCHAR(60),
  bairro          VARCHAR(80),
  cidade          VARCHAR(80),
  estado          CHAR(2),
  banco           VARCHAR(80),
  agencia         VARCHAR(10),
  conta           VARCHAR(20),
  tipo_conta      ENUM('corrente','poupanca') DEFAULT 'corrente',
  pix_chave       VARCHAR(120),
  observacoes     TEXT,
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- Tabela: locatarios
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locatarios (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo             ENUM('fisica','juridica') NOT NULL DEFAULT 'fisica',
  nome             VARCHAR(120),
  cpf              VARCHAR(20),
  rg               VARCHAR(20),
  data_nascimento  DATE,
  razao_social     VARCHAR(120),
  cnpj             VARCHAR(20),
  insc_estadual    VARCHAR(30),
  email            VARCHAR(120),
  telefone         VARCHAR(20),
  celular          VARCHAR(20),
  whatsapp         VARCHAR(20),
  cep              VARCHAR(10),
  endereco         VARCHAR(150),
  numero           VARCHAR(10),
  complemento      VARCHAR(60),
  bairro           VARCHAR(80),
  cidade           VARCHAR(80),
  estado           CHAR(2),
  cnh              VARCHAR(20),
  categoria_cnh    VARCHAR(5) DEFAULT 'B',
  validade_cnh     DATE,
  orgao_emissor_cnh VARCHAR(30),
  estado_cnh       CHAR(2),
  motorist_app     TINYINT(1) DEFAULT 0,
  plataformas_app  VARCHAR(100),
  avaliacao_app    VARCHAR(10),
  profissao        VARCHAR(80),
  renda_mensal     DECIMAL(10,2),
  ref_nome1        VARCHAR(120),
  ref_telefone1    VARCHAR(20),
  ref_nome2        VARCHAR(120),
  ref_telefone2    VARCHAR(20),
  observacoes      TEXT,
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- Tabela: colaboradores
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS colaboradores (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo             ENUM('fisica','juridica') NOT NULL DEFAULT 'juridica',
  categoria        VARCHAR(60) NOT NULL,
  nome             VARCHAR(120),
  cpf              VARCHAR(20),
  razao_social     VARCHAR(120),
  cnpj             VARCHAR(20),
  insc_estadual    VARCHAR(30),
  email            VARCHAR(120),
  telefone         VARCHAR(20),
  celular          VARCHAR(20),
  whatsapp         VARCHAR(20),
  site             VARCHAR(150),
  contato_nome     VARCHAR(120),
  contato_cargo    VARCHAR(60),
  contato_telefone VARCHAR(20),
  cep              VARCHAR(10),
  endereco         VARCHAR(150),
  numero           VARCHAR(10),
  complemento      VARCHAR(60),
  bairro           VARCHAR(80),
  cidade           VARCHAR(80),
  estado           CHAR(2),
  banco            VARCHAR(80),
  agencia          VARCHAR(10),
  conta            VARCHAR(20),
  pix_chave        VARCHAR(120),
  contrato         VARCHAR(60),
  valor_contrato   DECIMAL(10,2),
  vencimento_contrato DATE,
  observacoes      TEXT,
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- Tabela: veiculos
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS veiculos (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  placa               VARCHAR(10) NOT NULL UNIQUE,
  renavam             VARCHAR(20),
  chassi              VARCHAR(40),
  marca               VARCHAR(60) NOT NULL,
  modelo              VARCHAR(80) NOT NULL,
  ano_fabricacao      SMALLINT UNSIGNED,
  ano_modelo          SMALLINT UNSIGNED,
  cor                 VARCHAR(40),
  combustivel         VARCHAR(20) DEFAULT 'Flex',
  transmissao         VARCHAR(30) DEFAULT 'Manual',
  nr_portas           TINYINT UNSIGNED DEFAULT 4,
  capacidade          TINYINT UNSIGNED DEFAULT 5,
  km_atual            INT UNSIGNED DEFAULT 0,
  km_compra           INT UNSIGNED DEFAULT 0,
  km_troca_oleo       INT UNSIGNED,
  km_troca_correia    INT UNSIGNED,
  km_troca_pneu       INT UNSIGNED,
  data_compra         DATE,
  valor_compra        DECIMAL(12,2),
  valor_fipe          DECIMAL(12,2),
  seguradora          VARCHAR(80),
  nr_apolice          VARCHAR(40),
  vencimento_seguro   DATE,
  data_licenciamento  DATE,
  data_vistoria       DATE,
  bloqueador          VARCHAR(80),
  nr_bloqueador       VARCHAR(40),
  locador_id          INT UNSIGNED,
  foto                VARCHAR(255),
  observacoes         TEXT,
  criado_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_veiculo_locador FOREIGN KEY (locador_id) REFERENCES locadores(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------
-- Tabela: locacoes
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locacoes (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  veiculo_id          INT UNSIGNED NOT NULL,
  locatario_id        INT UNSIGNED NOT NULL,
  data_inicio         DATE NOT NULL,
  data_previsao_fim   DATE,
  data_encerramento   DATE,
  valor_semanal       DECIMAL(10,2),
  caucao              DECIMAL(10,2),
  km_entrada          INT UNSIGNED,
  km_saida            INT UNSIGNED,
  status              ENUM('ativa','encerrada','cancelada') NOT NULL DEFAULT 'ativa',
  condicoes           TEXT,
  criado_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_locacao_veiculo   FOREIGN KEY (veiculo_id)   REFERENCES veiculos(id)   ON DELETE RESTRICT,
  CONSTRAINT fk_locacao_locatario FOREIGN KEY (locatario_id) REFERENCES locatarios(id) ON DELETE RESTRICT
);

-- ----------------------------------------------------------------
-- Tabela: despesas_receitas
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS despesas_receitas (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo             ENUM('despesa','receita') NOT NULL,
  data             DATE NOT NULL,
  valor            DECIMAL(10,2) NOT NULL,
  categoria        VARCHAR(80) NOT NULL,
  descricao        VARCHAR(200),
  forma_pagamento  VARCHAR(30) DEFAULT 'pix',
  comprovante      VARCHAR(80),
  veiculo_id       INT UNSIGNED,
  locatario_id     INT UNSIGNED,
  colaborador_id   INT UNSIGNED,
  observacoes      TEXT,
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dr_veiculo     FOREIGN KEY (veiculo_id)     REFERENCES veiculos(id)      ON DELETE SET NULL,
  CONSTRAINT fk_dr_locatario   FOREIGN KEY (locatario_id)   REFERENCES locatarios(id)    ON DELETE SET NULL,
  CONSTRAINT fk_dr_colaborador FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------
-- Dados iniciais: usuário administrador
-- Senhas: admin@sislove.com=admin123 | locador@sislove.com=locador123 | locatario@sislove.com=locatario123
-- ----------------------------------------------------------------
INSERT INTO usuarios (nome, email, senha_hash, perfil, tipo_documento, documento) VALUES
  ('Administrador', 'admin@sislove.com',
  '$2b$10$JoAN9u6AzGI4vD7ikmTsJuGyDQ1oZkhIyo7RkWUoPLWZbhwuUyWa6', 'admin', 'cpf', '11122233344'),
  ('Locador Demo',  'locador@sislove.com',
  '$2b$10$qZUFMmLRPJvplePl5Rmo6urlxA7ck0cxs4TyN0oQG3OCTZ6GgrhfO', 'locador', 'cpf', '22233344455'),
  ('Locatário Demo','locatario@sislove.com',
  '$2b$10$ch1Fi5BwQHKSQrn5LRQHC.1Xhq5Wvja4r7k0n115e8VuRMr45WEgu', 'locatario', 'cpf', '33344455566')
ON DUPLICATE KEY UPDATE id=id;