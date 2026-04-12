-- ============================================================
--  SisLoVe – Dados de demonstração
-- ============================================================
USE sislove;

-- ----------------------------------------------------------------
-- 10 Locadores
-- ----------------------------------------------------------------
INSERT INTO locadores (tipo, nome, cpf, rg, data_nascimento, email, telefone, celular, cep, endereco, numero, bairro, cidade, estado, banco, agencia, conta, tipo_conta, pix_chave) VALUES
('fisica','Carlos Eduardo Mendes','321.654.987-01','12.345.678-9','1975-03-14','carlos.mendes@email.com','(11)3245-6789','(11)98745-1234','01310-100','Av. Paulista','1500','Bela Vista','São Paulo','SP','Bradesco','0023','12345-6','corrente','321.654.987-01'),
('fisica','Ana Paula Ferreira','456.789.123-02','23.456.789-0','1982-07-22','ana.ferreira@email.com','(21)3567-8901','(21)99123-4567','20040-020','Rua da Assembleia','120','Centro','Rio de Janeiro','RJ','Itaú','0741','98765-4','corrente','ana.ferreira@email.com'),
('fisica','Roberto Silva Santos','789.012.345-03','34.567.890-1','1969-11-05','roberto.santos@email.com','(31)3678-9012','(31)98234-5678','30130-010','Av. Afonso Pena','800','Centro','Belo Horizonte','MG','Caixa','0162','56789-0','poupanca','(31)98234-5678'),
('fisica','Mariana Costa Lima','012.345.678-04','45.678.901-2','1990-04-18','mariana.lima@email.com','(41)3789-0123','(41)97345-6789','80010-010','Rua XV de Novembro','250','Centro','Curitiba','PR','Nubank','','12345678-9','corrente','012.345.678-04'),
('fisica','Fernando Oliveira Cruz','135.246.357-05','56.789.012-3','1978-09-30','fernando.cruz@email.com','(51)3890-1234','(51)96456-7890','90010-000','Av. Borges de Medeiros','400','Centro Histórico','Porto Alegre','RS','Santander','0033','23456-7','corrente','(51)96456-7890'),
('fisica','Luciana Araújo Dias','246.357.468-06','67.890.123-4','1985-01-12','luciana.dias@email.com','(85)3901-2345','(85)99567-8901','60110-001','Av. Monsenhor Tabosa','789','Meireles','Fortaleza','CE','Bradesco','0156','34567-8','corrente','luciana.dias@email.com'),
('fisica','Marcelo Rodrigues Pinto','357.468.579-07','78.901.234-5','1972-06-25','marcelo.pinto@email.com','(71)4012-3456','(71)98678-9012','40020-020','Av. Sete de Setembro','1200','Comércio','Salvador','BA','Banco do Brasil','0027','45678-9','corrente','357.468.579-07'),
('fisica','Patrícia Gomes Nunes','468.579.680-08','89.012.345-6','1988-12-03','patricia.nunes@email.com','(62)4123-4567','(62)97789-0123','74005-010','Av. Goiás','500','Centro','Goiânia','GO','Inter','','87654321-0','corrente','(62)97789-0123'),
('fisica','Thiago Martins Souza','579.680.791-09','90.123.456-7','1980-08-17','thiago.souza@email.com','(92)4234-5678','(92)96890-1234','69010-010','Av. Eduardo Ribeiro','850','Centro','Manaus','AM','Sicredi','0155','56789-0','corrente','thiago.souza@email.com'),
('fisica','Juliana Nascimento Alves','680.791.802-10','01.234.567-8','1993-02-28','juliana.alves@email.com','(81)4345-6789','(81)99901-2345','50010-010','Rua do Sol','300','Santo Antônio','Recife','PE','C6 Bank','','11223344-5','corrente','juliana.alves@email.com');

-- ----------------------------------------------------------------
-- 10 Locatários
-- ----------------------------------------------------------------
INSERT INTO locatarios (tipo, nome, cpf, rg, data_nascimento, email, telefone, celular, whatsapp, cep, endereco, numero, bairro, cidade, estado, cnh, categoria_cnh, validade_cnh, orgao_emissor_cnh, estado_cnh, profissao, renda_mensal) VALUES
('fisica','Diego Henrique Barbosa','111.222.333-44','11.222.333-4','1992-05-10','diego.barbosa@email.com','(11)3111-2222','(11)91111-2222','(11)91111-2222','02010-010','Rua Voluntários da Pátria','400','Santana','São Paulo','SP','12345678900','AB','2027-05-10','DETRAN','SP','Motorista de Aplicativo',3800.00),
('fisica','Fernanda Cristina Moura','222.333.444-55','22.333.444-5','1989-09-20','fernanda.moura@email.com','(21)3222-3333','(21)92222-3333','(21)92222-3333','22030-010','Rua Siqueira Campos','200','Copacabana','Rio de Janeiro','RJ','23456789011','B','2026-09-20','DETRAN','RJ','Entregadora',2900.00),
('fisica','Gabriel Augusto Pereira','333.444.555-66','33.444.555-6','1995-12-01','gabriel.pereira@email.com','(31)3333-4444','(31)93333-4444','(31)93333-4444','30110-010','Av. do Contorno','600','Savassi','Belo Horizonte','MG','34567890122','B','2028-12-01','DETRAN','MG','Técnico de TI',4500.00),
('fisica','Helena Beatriz Cardoso','444.555.666-77','44.555.666-7','1987-03-15','helena.cardoso@email.com','(41)3444-5555','(41)94444-5555','(41)94444-5555','80210-080','Rua Marechal Hermes','150','Água Verde','Curitiba','PR','45678901233','B','2025-03-15','DETRAN','PR','Professora',3200.00),
('fisica','Igor Luís Teixeira','555.666.777-88','55.666.777-8','1998-07-07','igor.teixeira@email.com','(51)3555-6666','(51)95555-6666','(51)95555-6666','91010-010','Av. Farrapos','900','Floresta','Porto Alegre','RS','56789012344','AB','2029-07-07','DETRAN','RS','Motorista de Aplicativo',4100.00),
('fisica','Joana Maria Ribeiro','666.777.888-99','66.777.888-9','1991-10-25','joana.ribeiro@email.com','(85)3666-7777','(85)96666-7777','(85)96666-7777','60175-047','Rua Tibúrcio Cavalcante','350','Aldeota','Fortaleza','CE','67890123455','B','2026-10-25','DETRAN','CE','Enfermeira',4800.00),
('fisica','Lucas André Vasconcelos','777.888.999-00','77.888.999-0','1994-02-14','lucas.vasconcelos@email.com','(71)3777-8888','(71)97777-8888','(71)97777-8888','40060-330','Av. Oceânica','1500','Ondina','Salvador','BA','78901234566','AB','2028-02-14','DETRAN','BA','Motorista de Aplicativo',3600.00),
('fisica','Natália Priscila Campos','888.999.000-11','88.999.000-1','1986-06-30','natalia.campos@email.com','(62)3888-9999','(62)98888-9999','(62)98888-9999','74823-010','Rua 9','780','Setor Marista','Goiânia','GO','89012345677','B','2025-06-30','DETRAN','GO','Advogada',7500.00),
('fisica','Otávio Renan Castro','999.000.111-22','99.000.111-2','1997-11-11','otavio.castro@email.com','(92)3999-0000','(92)99999-0000','(92)99999-0000','69040-010','Rua Monsenhor Coutinho','680','Centro','Manaus','AM','90123456788','AB','2030-11-11','DETRAN','AM','Motorista de Aplicativo',3300.00),
('fisica','Paula Renata Figueiredo','000.111.222-33','00.111.222-3','1990-04-04','paula.figueiredo@email.com','(81)3000-1111','(81)90000-1111','(81)90000-1111','52050-010','Av. Norte Miguel Arraes de Alencar','2200','Casa Amarela','Recife','PE','01234567899','B','2027-04-04','DETRAN','PE','Contadora',5200.00);

-- ----------------------------------------------------------------
-- 10 Veículos (locador_id 1 a 10)
-- ----------------------------------------------------------------
INSERT INTO veiculos (placa, renavam, chassi, marca, modelo, ano_fabricacao, ano_modelo, cor, combustivel, transmissao, nr_portas, capacidade, km_atual, km_compra, km_troca_oleo, data_compra, valor_compra, valor_fipe, locador_id) VALUES
('ABC1D23','00123456789','9BWZZZ377VT004251','Hyundai','HB20 Sense',2022,2023,'Branco','Flex','Manual',4,5,32500,15000,40000,'2022-03-10',62000.00,65000.00,1),
('DEF2E34','00234567891','9BGKS48U0HG123456','Chevrolet','Onix Plus LT',2021,2022,'Prata','Flex','Automático',4,5,58000,42000,65000,'2021-06-15',72000.00,75000.00,2),
('GHI3F45','00345678902','9C2JC4110ER123789','Fiat','Cronos Drive',2023,2023,'Preto','Flex','Manual',4,5,18200,8000,30000,'2023-01-20',82000.00,85000.00,3),
('JKL4G56','00456789013','9BD17145P26543210','Fiat','Mobi Like',2022,2022,'Vermelho','Flex','Manual',4,5,44000,30000,50000,'2022-09-05',48000.00,50000.00,4),
('MNO5H67','00567890124','9BFZZZ335JB123987','Volkswagen','Polo MPI',2020,2021,'Cinza','Flex','Manual',4,5,71000,55000,80000,'2020-11-12',58000.00,60000.00,5),
('PQR6I78','00678901235','8A1FB3AF0NU123654','Renault','Sandero Zen',2021,2022,'Azul','Flex','Manual',4,5,52000,38000,60000,'2021-04-30',52000.00,54000.00,6),
('STU7J89','00789012346','9BWZZZ377GT123321','Volkswagen','T-Cross 200 TSI',2023,2024,'Branco','Flex','Automático',4,5,12000,0,20000,'2023-07-18',128000.00,132000.00,7),
('VWX8K90','00890123457','9BFZZZ335TB123159','Chevrolet','Tracker Premier',2022,2023,'Preto','Flex','Automático',4,5,27000,10000,35000,'2022-12-01',105000.00,110000.00,8),
('YZA9L01','00901234568','9BD17117L10123753','Fiat','Argo Drive',2021,2021,'Verde','Flex','Manual',4,5,63000,47000,70000,'2021-08-22',55000.00,57000.00,9),
('BCD0M12','01012345679','9BWZZZ377KT123486','Ford','Ka SE Plus',2020,2020,'Prata','Flex','Manual',4,5,88000,72000,95000,'2020-05-14',42000.00,43000.00,10);

-- ----------------------------------------------------------------
-- 10 Locações (6 ativas, 3 encerradas, 1 cancelada)
-- ----------------------------------------------------------------
INSERT INTO locacoes (veiculo_id, locatario_id, data_inicio, data_previsao_fim, data_encerramento, valor_semanal, caucao, km_entrada, km_saida, status, condicoes) VALUES
(1, 1, '2026-03-03', '2026-06-02', NULL,    1200.00, 2400.00, 30100, NULL,  'ativa',      'Motorista de app. Pagamento toda segunda-feira.'),
(2, 2, '2026-03-03', '2026-06-02', NULL,    1350.00, 2700.00, 56500, NULL,  'ativa',      'Entregadora. Pagamento toda segunda-feira.'),
(3, 3, '2026-03-10', '2026-06-09', NULL,    1400.00, 2800.00, 17000, NULL,  'ativa',      'Técnico de TI. Pagamento toda segunda-feira.'),
(4, 4, '2026-02-03', '2026-05-05', '2026-04-01', 900.00, 1800.00, 41000, 44000, 'encerrada', 'Encerrada antecipadamente a pedido do locatário.'),
(5, 5, '2026-03-17', '2026-06-16', NULL,    1250.00, 2500.00, 68500, NULL,  'ativa',      'Motorista de app. Pagamento toda segunda-feira.'),
(6, 6, '2026-02-17', '2026-05-19', '2026-03-31', 1100.00, 2200.00, 49000, 52000, 'encerrada', 'Contrato encerrado no prazo.'),
(7, 7, '2026-03-24', '2026-06-23', NULL,    1500.00, 3000.00, 10500, NULL,  'ativa',      'Motorista de app. T-Cross. Pagamento toda segunda-feira.'),
(8, 8, '2026-04-07', '2026-07-07', NULL,    1450.00, 3000.00, 26500, NULL,  'ativa',      'Pagamento toda segunda-feira. Caução pago.'),
(9, 9, '2026-01-13', '2026-04-14', '2026-04-06', 1100.00, 2200.00, 57000, 63000, 'encerrada', 'Contrato encerrado no prazo.'),
(10,10, '2026-03-02', NULL,        '2026-03-09', 1000.00, 2000.00, 86000, NULL,  'cancelada',  'Cancelada: locatário desistiu antes de retirar o veículo.');

-- ----------------------------------------------------------------
-- 10 Receitas
-- ----------------------------------------------------------------
INSERT INTO despesas_receitas (tipo, data, valor, categoria, descricao, forma_pagamento, veiculo_id, locatario_id) VALUES
('receita','2026-03-07',1200.00,'Aluguel Semanal','Semana 09/2026 – HB20 ABC1D23','pix',1,1),
('receita','2026-03-07',1350.00,'Aluguel Semanal','Semana 09/2026 – Onix DEF2E34','pix',2,2),
('receita','2026-03-14',1200.00,'Aluguel Semanal','Semana 10/2026 – HB20 ABC1D23','pix',1,1),
('receita','2026-03-14',1400.00,'Aluguel Semanal','Semana 10/2026 – Cronos GHI3F45','pix',3,3),
('receita','2026-03-21',1200.00,'Aluguel Semanal','Semana 11/2026 – HB20 ABC1D23','transferencia',1,1),
('receita','2026-03-21',1350.00,'Aluguel Semanal','Semana 11/2026 – Onix DEF2E34','pix',2,2),
('receita','2026-03-28',900.00,'Aluguel Semanal','Semana 12/2026 – Mobi JKL4G56','pix',4,4),
('receita','2026-04-04',1500.00,'Aluguel Semanal','Semana 13/2026 – T-Cross STU7J89','pix',7,7),
('receita','2026-04-04',1250.00,'Aluguel Semanal','Semana 13/2026 – Polo MNO5H67','pix',5,5),
('receita','2026-04-07',500.00,'Caução','Caução locação Tracker VWX8K90','deposito',8,8);

-- ----------------------------------------------------------------
-- 10 Despesas
-- ----------------------------------------------------------------
INSERT INTO despesas_receitas (tipo, data, valor, categoria, descricao, forma_pagamento, veiculo_id) VALUES
('despesa','2026-03-05',280.00,'Manutenção','Troca de óleo e filtro – HB20 ABC1D23','pix',1),
('despesa','2026-03-08',650.00,'Manutenção','Revisão freios dianteiros – Onix DEF2E34','pix',2),
('despesa','2026-03-10',1200.00,'Seguro','Parcela seguro março – Cronos GHI3F45','boleto',3),
('despesa','2026-03-12',180.00,'Combustível','Abastecimento – Polo MNO5H67','cartao_debito',5),
('despesa','2026-03-15',320.00,'Manutenção','Alinhamento e balanceamento – Argo YZA9L01','pix',9),
('despesa','2026-03-18',890.00,'Manutenção','Troca de pneu dianteiro direito – Ka BCD0M12','dinheiro',10),
('despesa','2026-03-22',1800.00,'IPVA','IPVA 2026 – T-Cross STU7J89','boleto',7),
('despesa','2026-03-25',450.00,'Manutenção','Troca de correia dentada – Sandero PQR6I78','pix',6),
('despesa','2026-04-02',980.00,'Seguro','Parcela seguro abril – Tracker VWX8K90','boleto',8),
('despesa','2026-04-05',210.00,'Licenciamento','Licenciamento 2026 – Mobi JKL4G56','boleto',4);
