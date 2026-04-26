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
  perfil      ENUM('admin','locador','locatario','auxiliar') NOT NULL DEFAULT 'locatario',
  tipo_documento ENUM('cpf','cnpj') NOT NULL DEFAULT 'cpf',
  documento   VARCHAR(20) NOT NULL DEFAULT '',
  ativo       TINYINT(1) NOT NULL DEFAULT 1,
  senha_deve_trocar TINYINT(1) NOT NULL DEFAULT 0,
  criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- ----------------------------------------------------------------
-- Tabela: configuracoes
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracoes (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chave             VARCHAR(120) NOT NULL UNIQUE COMMENT 'Identificador único da config (ex: smtp_host, smtp_port)',
  valor             TEXT COMMENT 'Valor da configuração (pode ser JSON ou texto simples)',
  tipo              ENUM('texto','numero','booleano','json') DEFAULT 'texto',
  descricao         VARCHAR(255),
  criado_em         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
  auxiliares_json  TEXT,
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
  valor_diario        DECIMAL(10,2),
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
  comprovante_pagamento VARCHAR(120),
  antecedente_criminal_arquivo VARCHAR(160),
  periodicidade       ENUM('dia','semana','quinzenal','mensal') DEFAULT 'semana',
  quantidade_periodos INT UNSIGNED DEFAULT 1,
  status              ENUM('pendente_aprovacao','ativa','encerrada','cancelada') NOT NULL DEFAULT 'ativa',
  condicoes           TEXT,
  criado_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_locacao_veiculo   FOREIGN KEY (veiculo_id)   REFERENCES veiculos(id)   ON DELETE RESTRICT,
  CONSTRAINT fk_locacao_locatario FOREIGN KEY (locatario_id) REFERENCES locatarios(id) ON DELETE RESTRICT
);

-- ----------------------------------------------------------------
-- Tabela: locatario_avaliacoes
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locatario_avaliacoes (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  locacao_id          INT UNSIGNED NOT NULL,
  locatario_id        INT UNSIGNED NOT NULL,
  avaliador_usuario_id INT UNSIGNED NOT NULL,
  pergunta_1          TINYINT UNSIGNED NOT NULL,
  pergunta_2          TINYINT UNSIGNED NOT NULL,
  pergunta_3          TINYINT UNSIGNED NOT NULL,
  pergunta_4          TINYINT UNSIGNED NOT NULL,
  pergunta_5          TINYINT UNSIGNED NOT NULL,
  pergunta_6          TINYINT UNSIGNED NOT NULL,
  pergunta_7          TINYINT UNSIGNED NOT NULL,
  pergunta_8          TINYINT UNSIGNED NOT NULL,
  pergunta_9          TINYINT UNSIGNED NOT NULL,
  pergunta_10         TINYINT UNSIGNED NOT NULL,
  media_geral         DECIMAL(4,2) NOT NULL,
  criado_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_avaliacao_locacao UNIQUE (locacao_id),
  CONSTRAINT chk_pergunta_1 CHECK (pergunta_1 BETWEEN 1 AND 5),
  CONSTRAINT chk_pergunta_2 CHECK (pergunta_2 BETWEEN 1 AND 5),
  CONSTRAINT chk_pergunta_3 CHECK (pergunta_3 BETWEEN 1 AND 5),
  CONSTRAINT chk_pergunta_4 CHECK (pergunta_4 BETWEEN 1 AND 5),
  CONSTRAINT chk_pergunta_5 CHECK (pergunta_5 BETWEEN 1 AND 5),
  CONSTRAINT chk_pergunta_6 CHECK (pergunta_6 BETWEEN 1 AND 5),
  CONSTRAINT chk_pergunta_7 CHECK (pergunta_7 BETWEEN 1 AND 5),
  CONSTRAINT chk_pergunta_8 CHECK (pergunta_8 BETWEEN 1 AND 5),
  CONSTRAINT chk_pergunta_9 CHECK (pergunta_9 BETWEEN 1 AND 5),
  CONSTRAINT chk_pergunta_10 CHECK (pergunta_10 BETWEEN 1 AND 5),
  CONSTRAINT fk_avaliacao_locacao FOREIGN KEY (locacao_id) REFERENCES locacoes(id) ON DELETE CASCADE,
  CONSTRAINT fk_avaliacao_locatario FOREIGN KEY (locatario_id) REFERENCES locatarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_avaliacao_usuario FOREIGN KEY (avaliador_usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
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
-- Migrações incrementais (ambientes já existentes)
-- ----------------------------------------------------------------
ALTER TABLE usuarios
  MODIFY COLUMN perfil ENUM('admin','locador','locatario','auxiliar') NOT NULL DEFAULT 'locatario';

SET @sql_add_senha_troca = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios'
        AND COLUMN_NAME = 'senha_deve_trocar'
    ),
    'SELECT 1',
    'ALTER TABLE usuarios ADD COLUMN senha_deve_trocar TINYINT(1) NOT NULL DEFAULT 0 AFTER ativo'
  )
);
PREPARE stmt_add_senha_troca FROM @sql_add_senha_troca;
EXECUTE stmt_add_senha_troca;
DEALLOCATE PREPARE stmt_add_senha_troca;

SET @sql_add_auxiliares = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'colaboradores'
        AND COLUMN_NAME = 'auxiliares_json'
    ),
    'SELECT 1',
    'ALTER TABLE colaboradores ADD COLUMN auxiliares_json TEXT AFTER observacoes'
  )
);
PREPARE stmt_add_auxiliares FROM @sql_add_auxiliares;
EXECUTE stmt_add_auxiliares;
DEALLOCATE PREPARE stmt_add_auxiliares;

SET @sql_add_comprovante_encerramento = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'locacoes'
        AND COLUMN_NAME = 'comprovante_pagamento'
    ),
    'SELECT 1',
    'ALTER TABLE locacoes ADD COLUMN comprovante_pagamento VARCHAR(120) AFTER km_saida'
  )
);
PREPARE stmt_add_comprovante_encerramento FROM @sql_add_comprovante_encerramento;
EXECUTE stmt_add_comprovante_encerramento;
DEALLOCATE PREPARE stmt_add_comprovante_encerramento;

SET @sql_add_periodicidade = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'locacoes'
        AND COLUMN_NAME = 'periodicidade'
    ),
    'SELECT 1',
    'ALTER TABLE locacoes ADD COLUMN periodicidade ENUM("dia","semana","quinzenal","mensal") DEFAULT "semana" AFTER comprovante_pagamento'
  )
);
PREPARE stmt_add_periodicidade FROM @sql_add_periodicidade;
EXECUTE stmt_add_periodicidade;
DEALLOCATE PREPARE stmt_add_periodicidade;

SET @sql_add_antecedente_criminal_arquivo = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'locacoes'
        AND COLUMN_NAME = 'antecedente_criminal_arquivo'
    ),
    'SELECT 1',
    'ALTER TABLE locacoes ADD COLUMN antecedente_criminal_arquivo VARCHAR(160) AFTER comprovante_pagamento'
  )
);
PREPARE stmt_add_antecedente_criminal_arquivo FROM @sql_add_antecedente_criminal_arquivo;
EXECUTE stmt_add_antecedente_criminal_arquivo;
DEALLOCATE PREPARE stmt_add_antecedente_criminal_arquivo;

SET @sql_add_quantidade_periodos = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'locacoes'
        AND COLUMN_NAME = 'quantidade_periodos'
    ),
    'SELECT 1',
    'ALTER TABLE locacoes ADD COLUMN quantidade_periodos INT UNSIGNED DEFAULT 1 AFTER periodicidade'
  )
);
PREPARE stmt_add_quantidade_periodos FROM @sql_add_quantidade_periodos;
EXECUTE stmt_add_quantidade_periodos;
DEALLOCATE PREPARE stmt_add_quantidade_periodos;

SET @sql_update_locacoes_status_enum = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'locacoes'
        AND COLUMN_NAME = 'status'
    ),
    'ALTER TABLE locacoes MODIFY COLUMN status ENUM("pendente_aprovacao","ativa","encerrada","cancelada") NOT NULL DEFAULT "ativa"',
    'SELECT 1'
  )
);
PREPARE stmt_update_locacoes_status_enum FROM @sql_update_locacoes_status_enum;
EXECUTE stmt_update_locacoes_status_enum;
DEALLOCATE PREPARE stmt_update_locacoes_status_enum;

SET @sql_add_valor_diario = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'veiculos'
        AND COLUMN_NAME = 'valor_diario'
    ),
    'SELECT 1',
    'ALTER TABLE veiculos ADD COLUMN valor_diario DECIMAL(10,2) AFTER nr_bloqueador'
  )
);
PREPARE stmt_add_valor_diario FROM @sql_add_valor_diario;
EXECUTE stmt_add_valor_diario;
DEALLOCATE PREPARE stmt_add_valor_diario;

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