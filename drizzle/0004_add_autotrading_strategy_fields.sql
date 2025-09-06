-- Migration: Add comprehensive autotrading strategy fields
-- Created: 2025-08-24

-- Add new columns to strategies table
ALTER TABLE strategies 
ADD COLUMN user_id integer,
ADD COLUMN is_active boolean DEFAULT false,
ADD COLUMN seed_amount numeric(18,2),
ADD COLUMN coin_mode varchar(10) DEFAULT 'custom',
ADD COLUMN selected_coins text[],
ADD COLUMN entry_rate numeric(10,2),
ADD COLUMN exit_rate numeric(10,2),
ADD COLUMN seed_division integer DEFAULT 1,
ADD COLUMN allow_average_down boolean DEFAULT false,
ADD COLUMN allow_average_up boolean DEFAULT false,
ADD COLUMN ai_mode varchar(20),
ADD COLUMN webhook_enabled boolean DEFAULT false,
ADD COLUMN telegram_enabled boolean DEFAULT false,
ADD COLUMN backtest_period varchar(10),
ADD COLUMN portfolio_rebalancing boolean DEFAULT false,
ADD COLUMN updated_at timestamp DEFAULT NOW();

-- Add foreign key constraint for user_id
ALTER TABLE strategies 
ADD CONSTRAINT strategies_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add check constraints
ALTER TABLE strategies 
ADD CONSTRAINT coin_mode_check 
CHECK (coin_mode IN ('auto', 'custom'));

ALTER TABLE strategies 
ADD CONSTRAINT ai_mode_check 
CHECK (ai_mode IS NULL OR ai_mode IN ('conservative', 'balanced', 'aggressive'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_strategies_user ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_active ON strategies(user_id, is_active);

-- Make user_id NOT NULL after adding the constraint
-- Note: You may need to populate existing records with a user_id first
-- ALTER TABLE strategies ALTER COLUMN user_id SET NOT NULL;
