-- Insert default plans (with conflict handling)
INSERT INTO plans (name, description, price) VALUES
('Free', '무료 플랜', 0),
('Starter', '프로 플랜', 25000),
('Premium', '프리미엄 플랜', 99000)
ON CONFLICT (name) DO NOTHING;
