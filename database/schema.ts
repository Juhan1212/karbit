import {
  integer,
  pgTable,
  varchar,
  numeric,
  timestamp,
  index,
  unique,
  check,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

export const guestBook = pgTable("guestBook", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});

/* ================================
   1. 사용자 & 인증
================================ */
export const plans = pgTable("plans", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 50 }).notNull().unique(),
  description: text(),
  price: numeric({ precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: varchar({ length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar({ length: 100 }),
  planId: integer("plan_id").references(() => plans.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSessions = pgTable(
  "user_sessions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text().notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [index("idx_user_sessions_token").on(table.token)]
);

/* ================================
   2. 거래소 연동 & API 키
================================ */
export const exchanges = pgTable(
  "exchanges",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 50 }).notNull().unique(),
    type: varchar({ length: 20 }).notNull(),
    referralCode: varchar("referral_code", { length: 100 }),
  },
  (table) => [check("type_check", sql`${table.type} IN ('KR', 'Overseas')`)]
);

export const userExchanges = pgTable(
  "user_exchanges",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exchangeId: integer("exchange_id")
      .notNull()
      .references(() => exchanges.id, { onDelete: "cascade" }),
    apiKey: text("api_key"),
    apiSecret: text("api_secret"),
    isActive: boolean("is_active").default(true),
    verified: boolean().default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique().on(table.userId, table.exchangeId),
    index("idx_user_exchanges_user").on(table.userId),
  ]
);

/* ================================
   3. 코인 & 거래소 페어
================================ */
export const coinsExchanges = pgTable(
  "coins_exchanges",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    exchangeId: integer("exchange_id")
      .notNull()
      .references(() => exchanges.id, { onDelete: "cascade" }),
    coinSymbol: varchar("coin_symbol", { length: 20 }).notNull(),
  },
  (table) => [unique().on(table.exchangeId, table.coinSymbol)]
);

/* ================================
   4. 전략 히스토리
================================ */
export const strategies = pgTable("strategies", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 100 }).notNull(),
  seed: numeric({ precision: 18, scale: 8 }).notNull(),
  entryPremium: numeric("entry_premium", { precision: 10, scale: 6 }).notNull(),
  exitPremium: numeric("exit_premium", { precision: 10, scale: 6 }).notNull(),
  leverage: numeric({ precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ================================
   5. 포지션
================================ */
export const positions = pgTable(
  "positions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    strategyId: integer("strategy_id")
      .notNull()
      .references(() => strategies.id, { onDelete: "cascade" }),
    entryExchangeBuyId: integer("entry_exchange_buy_id")
      .notNull()
      .references(() => coinsExchanges.id),
    entryExchangeSellId: integer("entry_exchange_sell_id")
      .notNull()
      .references(() => coinsExchanges.id),
    entryRate: numeric("entry_rate", { precision: 10, scale: 6 }).notNull(),
    exitRate: numeric("exit_rate", { precision: 10, scale: 6 }),
    entryTime: timestamp("entry_time").notNull(),
    exitTime: timestamp("exit_time"),
    status: varchar({ length: 20 }).default("OPEN"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_positions_strategy").on(table.strategyId),
    index("idx_positions_status").on(table.status),
    check("status_check", sql`${table.status} IN ('OPEN', 'CLOSED')`),
  ]
);

/* ================================
   6. 거래 내역
================================ */
export const trades = pgTable(
  "trades",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    positionId: integer("position_id")
      .notNull()
      .references(() => positions.id, { onDelete: "cascade" }),
    exchangeCoinId: integer("exchange_coin_id")
      .notNull()
      .references(() => coinsExchanges.id),
    side: varchar({ length: 4 }).notNull(),
    price: numeric({ precision: 18, scale: 8 }).notNull(),
    amount: numeric({ precision: 18, scale: 8 }).notNull(),
    fee: numeric({ precision: 18, scale: 8 }),
    tradeTime: timestamp("trade_time").notNull(),
  },
  (table) => [
    index("idx_trades_position").on(table.positionId),
    index("idx_trades_exchange_coin").on(table.exchangeCoinId),
    check("side_check", sql`${table.side} IN ('BUY', 'SELL')`),
  ]
);

/* ================================
   Relations
================================ */
export const usersRelations = relations(users, ({ one, many }) => ({
  plan: one(plans, {
    fields: [users.planId],
    references: [plans.id],
  }),
  sessions: many(userSessions),
  exchanges: many(userExchanges),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  users: many(users),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const userExchangesRelations = relations(userExchanges, ({ one }) => ({
  user: one(users, {
    fields: [userExchanges.userId],
    references: [users.id],
  }),
  exchange: one(exchanges, {
    fields: [userExchanges.exchangeId],
    references: [exchanges.id],
  }),
}));

export const exchangesRelations = relations(exchanges, ({ many }) => ({
  userExchanges: many(userExchanges),
  coinsExchanges: many(coinsExchanges),
}));

export const coinsExchangesRelations = relations(
  coinsExchanges,
  ({ one, many }) => ({
    exchange: one(exchanges, {
      fields: [coinsExchanges.exchangeId],
      references: [exchanges.id],
    }),
    entryBuyPositions: many(positions, { relationName: "entryBuyExchange" }),
    entrySellPositions: many(positions, { relationName: "entrySellExchange" }),
    trades: many(trades),
  })
);

export const strategiesRelations = relations(strategies, ({ many }) => ({
  positions: many(positions),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  strategy: one(strategies, {
    fields: [positions.strategyId],
    references: [strategies.id],
  }),
  entryExchangeBuy: one(coinsExchanges, {
    fields: [positions.entryExchangeBuyId],
    references: [coinsExchanges.id],
    relationName: "entryBuyExchange",
  }),
  entryExchangeSell: one(coinsExchanges, {
    fields: [positions.entryExchangeSellId],
    references: [coinsExchanges.id],
    relationName: "entrySellExchange",
  }),
  trades: many(trades),
}));

export const tradesRelations = relations(trades, ({ one }) => ({
  position: one(positions, {
    fields: [trades.positionId],
    references: [positions.id],
  }),
  exchangeCoin: one(coinsExchanges, {
    fields: [trades.exchangeCoinId],
    references: [coinsExchanges.id],
  }),
}));
