-- ============================================================================
-- Migration: Inserir configurações SMTP iniciais
-- ============================================================================

INSERT IGNORE INTO configuracoes (chave, valor, tipo, descricao) VALUES
('smtp_host', 'smtp.gmail.com', 'texto', 'Host do servidor SMTP'),
('smtp_port', '587', 'numero', 'Porta do servidor SMTP'),
('smtp_secure', 'false', 'booleano', 'Usar conexão segura (TLS/SSL)'),
('smtp_user', '', 'texto', 'Usuário/email para autenticação SMTP'),
('smtp_pass', '', 'texto', 'Senha para autenticação SMTP'),
('mail_from', 'noreply@sislove.com', 'texto', 'Endereço de email padrão para envios');
