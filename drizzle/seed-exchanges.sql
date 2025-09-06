INSERT INTO exchanges (name, type, referral_code, eng_name) VALUES
('업비트', 'KR', NULL, 'upbit'),
('빗썸', 'KR', NULL, 'bithumb'),
('바이낸스', 'Overseas', NULL, 'binance'),
('바이빗', 'Overseas', NULL, 'bybit'),
('OKX', 'Overseas', NULL, 'okx')
ON CONFLICT (name) DO NOTHING;
