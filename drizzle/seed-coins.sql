-- Coins exchanges seed data with display names
-- This file contains coin listings for various exchanges with display names

-- Create a temporary view for coin display names mapping
CREATE OR REPLACE VIEW coin_display_names AS
SELECT * FROM (VALUES
  ('BTC', 'Bitcoin'),
  ('ETH', 'Ethereum'),
  ('XRP', 'Ripple'),
  ('ADA', 'Cardano'),
  ('DOT', 'Polkadot'),
  ('SOL', 'Solana'),
  ('MATIC', 'Polygon'),
  ('AVAX', 'Avalanche'),
  ('LINK', 'Chainlink'),
  ('UNI', 'Uniswap'),
  ('LTC', 'Litecoin'),
  ('BCH', 'Bitcoin Cash'),
  ('ETC', 'Ethereum Classic'),
  ('XLM', 'Stellar'),
  ('TRX', 'TRON'),
  ('EOS', 'EOS'),
  ('ATOM', 'Cosmos'),
  ('NEAR', 'NEAR Protocol'),
  ('APT', 'Aptos'),
  ('SUI', 'Sui'),
  ('ARB', 'Arbitrum'),
  ('OP', 'Optimism'),
  ('MANA', 'Decentraland'),
  ('SAND', 'The Sandbox'),
  ('AXS', 'Axie Infinity'),
  ('CHZ', 'Chiliz'),
  ('ENJ', 'Enjin Coin'),
  ('BAT', 'Basic Attention Token'),
  ('ZRX', '0x'),
  ('OMG', 'OMG Network'),
  ('QTUM', 'Qtum'),
  ('ICX', 'ICON'),
  ('SC', 'Siacoin'),
  ('STEEM', 'Steem'),
  ('LSK', 'Lisk'),
  ('ARDR', 'Ardor'),
  ('STORJ', 'Storj'),
  ('GRS', 'Groestlcoin'),
  ('REP', 'Augur'),
  ('EMC2', 'Einsteinium'),
  ('SBD', 'Steem Dollars'),
  ('POWR', 'Power Ledger'),
  ('BTG', 'Bitcoin Gold'),
  ('IGNIS', 'Ignis'),
  ('PIVX', 'PIVX'),
  ('STRAT', 'Stratis'),
  ('ZCL', 'ZClassic'),
  ('KMD', 'Komodo'),
  ('ARK', 'Ark'),
  ('VTC', 'Vertcoin'),
  ('IOST', 'IOST'),
  ('POLY', 'Polymath'),
  ('TFUEL', 'Theta Fuel'),
  ('MARO', 'Maro'),
  ('ORBS', 'Orbs'),
  ('AERGO', 'Aergo'),
  ('ANKR', 'Ankr'),
  ('CELR', 'Celer Network'),
  ('CTK', 'CertiK'),
  ('BORA', 'BORA'),
  ('JST', 'JUST'),
  ('CRO', 'Cronos'),
  ('TON', 'Toncoin'),
  ('AXL', 'Axelar'),
  ('WEMIX', 'WEMIX'),
  ('KLAY', 'Klaytn'),
  ('SSX', 'SSX'),
  ('META', 'Metadium'),
  ('FCT2', 'FirmaChain'),
  ('WAXP', 'WAX'),
  ('HIVE', 'Hive'),
  ('KAVA', 'Kava'),
  ('XTZ', 'Tezos'),
  ('ONT', 'Ontology'),
  ('ALGO', 'Algorand'),
  ('FLOW', 'Flow'),
  ('EGLD', 'MultiversX'),
  ('DOGE', 'Dogecoin'),
  ('SHIB', 'Shiba Inu'),
  ('PEPE', 'Pepe'),
  ('BONK', 'Bonk'),
  ('WIF', 'dogwifhat'),
  ('FLOKI', 'FLOKI'),
  ('BNB', 'BNB'),
  ('BUSD', 'Binance USD'),
  ('USDT', 'Tether'),
  ('USDC', 'USD Coin'),
  ('DAI', 'Dai'),
  ('TUSD', 'TrueUSD'),
  ('PAXG', 'PAX Gold'),
  ('CAKE', 'PancakeSwap'),
  ('ALPHA', 'Alpha Finance Lab'),
  ('AUTO', 'Auto'),
  ('TWT', 'Trust Wallet Token'),
  ('BETA', 'Beta Finance'),
  ('HARD', 'Hard Protocol'),
  ('DEGO', 'Dego Finance'),
  ('OG', 'OG Fan Token'),
  ('ATM', 'Atletico Madrid Fan Token'),
  ('ASR', 'AS Roma Fan Token'),
  ('PSG', 'Paris Saint-Germain Fan Token'),
  ('JUV', 'Juventus Fan Token'),
  ('BAR', 'FC Barcelona Fan Token'),
  ('CITY', 'Manchester City Fan Token'),
  ('PORTO', 'FC Porto Fan Token'),
  ('SANTOS', 'Santos FC Fan Token'),
  ('LAZIO', 'Lazio Fan Token'),
  ('ALPINE', 'Alpine F1 Team Fan Token'),
  ('FIL', 'Filecoin'),
  ('THETA', 'THETA'),
  ('VET', 'VeChain'),
  ('FTT', 'FTX Token'),
  ('GMT', 'STEPN'),
  ('APE', 'ApeCoin'),
  ('GAL', 'Galxe'),
  ('LDO', 'Lido DAO'),
  ('MASK', 'Mask Network'),
  ('1INCH', '1inch'),
  ('SUSHI', 'SushiSwap'),
  ('YFI', 'yearn.finance'),
  ('COMP', 'Compound'),
  ('MKR', 'Maker'),
  ('SNX', 'Synthetix'),
  ('AAVE', 'Aave'),
  ('CRV', 'Curve DAO Token'),
  ('BAL', 'Balancer'),
  ('KNC', 'Kyber Network Crystal'),
  ('REN', 'Ren'),
  ('BAND', 'Band Protocol'),
  ('NMR', 'Numeraire'),
  ('REEF', 'Reef'),
  ('OCEAN', 'Ocean Protocol'),
  ('COTI', 'COTI'),
  ('ALICE', 'MyNeighborAlice'),
  ('FOR', 'ForTube'),
  ('BAKE', 'BakeryToken'),
  ('BURGER', 'BurgerCities'),
  ('SLP', 'Smooth Love Potion'),
  ('DEXE', 'DeXe'),
  ('DF', 'dForce'),
  ('FIRO', 'Firo'),
  ('LIT', 'Litentry'),
  ('PROS', 'Prosper'),
  ('VIDT', 'VIDT Datalink'),
  ('CHESS', 'Tranchess'),
  ('AUCTION', 'Bounce Token'),
  ('PNT', 'pNetwork'),
  ('TVK', 'Terra Virtua Kolect'),
  ('BADGER', 'Badger DAO'),
  ('FIS', 'Stafi'),
  ('OM', 'MANTRA'),
  ('POND', 'Marlin'),
  ('RAMP', 'RAMP'),
  ('BIT', 'BitDAO'),
  ('LOOKS', 'LooksRare'),
  ('MAGIC', 'Magic'),
  ('HIGH', 'Highstreet'),
  ('VOXEL', 'Voxies'),
  ('SPELL', 'Spell Token'),
  ('CVX', 'Convex Finance'),
  ('PYR', 'Vulcan Forged PYR'),
  ('RACA', 'Radio Caca'),
  ('WOO', 'WOO Network'),
  ('FLM', 'Flamingo'),
  ('SCRT', 'Secret'),
  ('API3', 'API3'),
  ('QNT', 'Quant'),
  ('PEOPLE', 'ConstitutionDAO'),
  ('IMXR', 'Immutable X'),
  ('SYN', 'Synapse'),
  ('QUICK', 'Quickswap'),
  ('EPX', 'Ellipsis X'),
  ('NDAU', 'Ndau'),
  ('METIS', 'Metis'),
  ('BICO', 'Biconomy'),
  ('OKB', 'OKB'),
  ('GLMR', 'Moonbeam'),
  ('MOVR', 'Moonriver'),
  ('SYS', 'Syscoin'),
  ('BOSON', 'Boson Protocol'),
  ('POLS', 'Polkastarter'),
  ('MLN', 'Melon'),
  ('PERP', 'Perpetual Protocol'),
  ('CTI', 'ClinTex CTi'),
  ('TOKE', 'Tokemak'),
  ('FARM', 'Harvest Finance'),
  ('COVER', 'Cover Protocol'),
  ('EASY', 'EasyFi'),
  ('LINEAR', 'Linear'),
  ('JOE', 'JoeToken'),
  ('PTP', 'Platypus Finance'),
  ('GMX', 'GMX'),
  ('GNS', 'Gains Network'),
  ('RDNT', 'Radiant Capital'),
  ('GRAIL', 'Camelot Token')
) AS t(symbol, name);

-- Insert coins for 업비트 (Upbit) - Korean exchange
INSERT INTO coins_exchanges (exchange_id, coin_symbol, display_name)
SELECT e.id, coins.symbol, 
       COALESCE(cdn.name, coins.symbol) as display_name
FROM exchanges e
CROSS JOIN (VALUES 
  ('BTC'), ('ETH'), ('XRP'), ('ADA'), ('DOT'), ('SOL'), ('MATIC'), ('AVAX'),
  ('LINK'), ('UNI'), ('LTC'), ('BCH'), ('ETC'), ('XLM'), ('TRX'), ('EOS'),
  ('ATOM'), ('NEAR'), ('APT'), ('SUI'), ('ARB'), ('OP'), ('MANA'), ('SAND'),
  ('AXS'), ('CHZ'), ('ENJ'), ('BAT'), ('ZRX'), ('OMG'), ('QTUM'), ('ICX'),
  ('SC'), ('STEEM'), ('LSK'), ('ARDR'), ('STORJ'), ('GRS'), ('REP'), ('EMC2'),
  ('SBD'), ('POWR'), ('BTG'), ('IGNIS'), ('PIVX'), ('STRAT'), ('ZCL'), ('KMD'),
  ('ARK'), ('VTC'), ('IOST'), ('POLY'), ('TFUEL'), ('MARO'), ('ORBS'), ('AERGO'),
  ('ANKR'), ('CELR'), ('CTK'), ('BORA'), ('JST'), ('CRO'), ('TON'), ('AXL')
) AS coins(symbol)
LEFT JOIN coin_display_names cdn ON coins.symbol = cdn.symbol
WHERE e.name = '업비트'
ON CONFLICT (exchange_id, coin_symbol) DO UPDATE SET
display_name = EXCLUDED.display_name;

-- Insert coins for 빗썸 (Bithumb) - Korean exchange
INSERT INTO coins_exchanges (exchange_id, coin_symbol, display_name)
SELECT e.id, coins.symbol, 
       COALESCE(cdn.name, coins.symbol) as display_name
FROM exchanges e
CROSS JOIN (VALUES 
  ('BTC'), ('ETH'), ('XRP'), ('ADA'), ('DOT'), ('SOL'), ('MATIC'), ('AVAX'),
  ('LINK'), ('UNI'), ('LTC'), ('BCH'), ('ETC'), ('XLM'), ('TRX'), ('EOS'),
  ('ATOM'), ('NEAR'), ('APT'), ('MANA'), ('SAND'), ('AXS'), ('CHZ'), ('ENJ'),
  ('BAT'), ('ZRX'), ('OMG'), ('QTUM'), ('ICX'), ('STEEM'), ('LSK'), ('ARDR'),
  ('STORJ'), ('REP'), ('POWR'), ('BTG'), ('PIVX'), ('STRAT'), ('KMD'), ('ARK'),
  ('VTC'), ('IOST'), ('TFUEL'), ('ORBS'), ('AERGO'), ('ANKR'), ('CELR'), ('BORA'),
  ('JST'), ('CRO'), ('TON'), ('WEMIX'), ('KLAY'), ('SSX'), ('META'), ('FCT2'),
  ('WAXP'), ('HIVE'), ('KAVA'), ('XTZ'), ('ONT'), ('ALGO'), ('FLOW'), ('EGLD')
) AS coins(symbol)
LEFT JOIN coin_display_names cdn ON coins.symbol = cdn.symbol
WHERE e.name = '빗썸'
ON CONFLICT (exchange_id, coin_symbol) DO UPDATE SET
display_name = EXCLUDED.display_name;

-- Insert coins for 바이낸스 (Binance) - Global exchange
INSERT INTO coins_exchanges (exchange_id, coin_symbol, display_name)
SELECT e.id, coins.symbol, 
       COALESCE(cdn.name, coins.symbol) as display_name
FROM exchanges e
CROSS JOIN (VALUES 
  ('BTC'), ('ETH'), ('XRP'), ('ADA'), ('DOT'), ('SOL'), ('MATIC'), ('AVAX'),
  ('LINK'), ('UNI'), ('LTC'), ('BCH'), ('ETC'), ('XLM'), ('TRX'), ('EOS'),
  ('ATOM'), ('NEAR'), ('APT'), ('SUI'), ('ARB'), ('OP'), ('MANA'), ('SAND'),
  ('AXS'), ('CHZ'), ('ENJ'), ('BAT'), ('ZRX'), ('OMG'), ('QTUM'), ('IOST'),
  ('TFUEL'), ('ORBS'), ('AERGO'), ('ANKR'), ('CELR'), ('CTK'), ('BORA'), ('JST'),
  ('CRO'), ('TON'), ('DOGE'), ('SHIB'), ('PEPE'), ('BONK'), ('WIF'), ('FLOKI'),
  ('BNB'), ('BUSD'), ('USDT'), ('USDC'), ('DAI'), ('TUSD'), ('PAXG'), ('CAKE'),
  ('ALPHA'), ('AUTO'), ('TWT'), ('BETA'), ('HARD'), ('DEGO'), ('OG'), ('ATM'),
  ('ASR'), ('PSG'), ('JUV'), ('BAR'), ('CITY'), ('PORTO'), ('SANTOS'), ('LAZIO'),
  ('ALPINE'), ('FIL'), ('THETA'), ('VET'), ('FTT'), ('GMT'), ('APE'), ('GAL'),
  ('LDO'), ('MASK'), ('1INCH'), ('SUSHI'), ('YFI'), ('COMP'), ('MKR'), ('SNX'),
  ('AAVE'), ('CRV'), ('BAL'), ('KNC'), ('REN'), ('BAND'), ('NMR'), ('STORJ'),
  ('REEF'), ('OCEAN'), ('COTI'), ('ALICE'), ('FOR'), ('BAKE'), ('BURGER'), ('SLP'),
  ('DEXE'), ('DF'), ('FIRO'), ('LIT'), ('PROS'), ('VIDT'), ('CHESS'), ('AUCTION'),
  ('PNT'), ('TVK'), ('BADGER'), ('FIS'), ('OM'), ('POND'), ('RAMP')
) AS coins(symbol)
LEFT JOIN coin_display_names cdn ON coins.symbol = cdn.symbol
WHERE e.name = '바이낸스'
ON CONFLICT (exchange_id, coin_symbol) DO UPDATE SET
display_name = EXCLUDED.display_name;

-- Insert coins for 바이빗 (Bybit) - Global exchange
INSERT INTO coins_exchanges (exchange_id, coin_symbol, display_name)
SELECT e.id, coins.symbol, 
       COALESCE(cdn.name, coins.symbol) as display_name
FROM exchanges e
CROSS JOIN (VALUES 
  ('BTC'), ('ETH'), ('XRP'), ('ADA'), ('DOT'), ('SOL'), ('MATIC'), ('AVAX'),
  ('LINK'), ('UNI'), ('LTC'), ('BCH'), ('ETC'), ('XLM'), ('TRX'), ('EOS'),
  ('ATOM'), ('NEAR'), ('APT'), ('SUI'), ('ARB'), ('OP'), ('MANA'), ('SAND'),
  ('AXS'), ('CHZ'), ('ENJ'), ('BAT'), ('ZRX'), ('OMG'), ('QTUM'), ('IOST'),
  ('DOGE'), ('SHIB'), ('PEPE'), ('BONK'), ('WIF'), ('FLOKI'), ('FIL'), ('THETA'),
  ('VET'), ('FTT'), ('GMT'), ('APE'), ('GAL'), ('LDO'), ('MASK'), ('1INCH'),
  ('SUSHI'), ('YFI'), ('COMP'), ('MKR'), ('SNX'), ('AAVE'), ('CRV'), ('BAL'),
  ('REEF'), ('OCEAN'), ('COTI'), ('ALICE'), ('BIT'), ('USDT'), ('USDC'), ('DAI'),
  ('LOOKS'), ('MAGIC'), ('HIGH'), ('VOXEL'), ('SPELL'), ('CVX'), ('PYR'), ('RACA'),
  ('WOO'), ('ALPINE'), ('SANTOS'), ('LAZIO'), ('PORTO'), ('PSG'), ('JUV'), ('BAR'),
  ('CITY'), ('ATM'), ('ASR'), ('OG'), ('FLM'), ('SCRT'), ('API3'), ('QNT'),
  ('PEOPLE'), ('IMXR'), ('SYN'), ('QUICK'), ('EPX'), ('NDAU'), ('METIS'), ('BICO')
) AS coins(symbol)
LEFT JOIN coin_display_names cdn ON coins.symbol = cdn.symbol
WHERE e.name = '바이빗'
ON CONFLICT (exchange_id, coin_symbol) DO UPDATE SET
display_name = EXCLUDED.display_name;

-- Insert coins for OKX - Global exchange
INSERT INTO coins_exchanges (exchange_id, coin_symbol, display_name)
SELECT e.id, coins.symbol, 
       COALESCE(cdn.name, coins.symbol) as display_name
FROM exchanges e
CROSS JOIN (VALUES 
  ('BTC'), ('ETH'), ('XRP'), ('ADA'), ('DOT'), ('SOL'), ('MATIC'), ('AVAX'),
  ('LINK'), ('UNI'), ('LTC'), ('BCH'), ('ETC'), ('XLM'), ('TRX'), ('EOS'),
  ('ATOM'), ('NEAR'), ('APT'), ('SUI'), ('ARB'), ('OP'), ('MANA'), ('SAND'),
  ('AXS'), ('CHZ'), ('ENJ'), ('BAT'), ('ZRX'), ('OMG'), ('QTUM'), ('IOST'),
  ('DOGE'), ('SHIB'), ('PEPE'), ('FIL'), ('THETA'), ('VET'), ('GMT'), ('APE'),
  ('GAL'), ('LDO'), ('MASK'), ('1INCH'), ('SUSHI'), ('YFI'), ('COMP'), ('MKR'),
  ('SNX'), ('AAVE'), ('CRV'), ('BAL'), ('USDT'), ('USDC'), ('DAI'), ('OKB'),
  ('LOOKS'), ('MAGIC'), ('HIGH'), ('VOXEL'), ('SPELL'), ('CVX'), ('PYR'), ('WOO'),
  ('FLM'), ('SCRT'), ('API3'), ('QNT'), ('PEOPLE'), ('SYN'), ('QUICK'), ('EPX'),
  ('METIS'), ('BICO'), ('GLMR'), ('MOVR'), ('SYS'), ('BOSON'), ('POLS'), ('MLN'),
  ('PERP'), ('CTI'), ('TOKE'), ('BADGER'), ('FARM'), ('COVER'), ('EASY'), ('DF'),
  ('LINEAR'), ('JOE'), ('PTP'), ('GMX'), ('GNS'), ('RDNT'), ('GRAIL')
) AS coins(symbol)
LEFT JOIN coin_display_names cdn ON coins.symbol = cdn.symbol
WHERE e.name = 'OKX'
ON CONFLICT (exchange_id, coin_symbol) DO UPDATE SET
display_name = EXCLUDED.display_name;

-- Clean up the view after use
DROP VIEW IF EXISTS coin_display_names;