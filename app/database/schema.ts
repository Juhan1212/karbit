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
  period: varchar({ length: 20 }).default("월"), // 결제 주기
  features: text("features").array(), // 포함 기능 목록 (JSON 배열)
  limitations: text("limitations").array(), // 제한 사항 목록 (JSON 배열)
  isPopular: boolean("is_popular").default(false), // 인기 플랜 여부
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: varchar({ length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar({ length: 100 }),
  planId: integer("plan_id").references(() => plans.id),
  activeStrategyId: integer("active_strategy_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

  // 누적 상태 관리
  totalEntryCount: integer("total_entry_count").default(0), // 누적 포지션 진입 횟수
  totalOrderAmount: numeric("total_order_amount", {
    precision: 18,
    scale: 8,
  }).default("0"), // 누적 주문 금액
});

export const userPlanHistory = pgTable(
  "user_plan_history",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: integer("plan_id")
      .notNull()
      .references(() => plans.id),
    startDate: timestamp("start_date").notNull().defaultNow(),
    endDate: timestamp("end_date"), // null이면 현재 활성 플랜
    isActive: boolean("is_active").default(true),
    reason: varchar({ length: 100 }), // 플랜 변경 이유 (upgrade, downgrade, cancel 등)
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_user_plan_history_user").on(table.userId),
    index("idx_user_plan_history_active").on(table.userId, table.isActive),
    index("idx_user_plan_history_dates").on(table.startDate, table.endDate),
  ]
);

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

export const passwordResets = pgTable(
  "password_resets",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    email: varchar({ length: 255 }).notNull(),
    verificationCode: varchar("verification_code", { length: 6 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    isUsed: boolean("is_used").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_password_resets_email").on(table.email),
    index("idx_password_resets_code").on(table.verificationCode),
  ]
);

/* ================================
   결제 내역
================================ */
export const payments = pgTable(
  "payments",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: integer("plan_id")
      .notNull()
      .references(() => plans.id),
    amount: numeric({ precision: 12, scale: 2 }).notNull(),
    currency: varchar({ length: 3 }).default("KRW"),
    status: varchar({ length: 20 }).default("pending"), // pending, completed, failed, cancelled
    paymentMethod: varchar("payment_method", { length: 50 }), // card, bank_transfer, etc
    transactionId: varchar("transaction_id", { length: 100 }), // KG 이니시스 거래 ID
    paymentKey: varchar("payment_key", { length: 100 }), // KG 이니시스 결제 키
    orderId: varchar("order_id", { length: 100 }).notNull().unique(), // 주문 ID
    paidAt: timestamp("paid_at"),
    failureReason: text("failure_reason"),
    metadata: text().default("{}"), // JSON 형태의 추가 정보
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_payments_user").on(table.userId),
    index("idx_payments_status").on(table.status),
    index("idx_payments_order_id").on(table.orderId),
    check(
      "status_check",
      sql`${table.status} IN ('pending', 'completed', 'failed', 'cancelled')`
    ),
  ]
);

/* ================================
   2. 거래소 연동 & API 키
================================ */
export const exchanges = pgTable(
  "exchanges",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 50 }).notNull().unique(),
    engName: varchar("eng_name", { length: 50 }).notNull().unique(),
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
    displayName: varchar("display_name", { length: 100 }).notNull(), // 코인의 표시명 (예: Bitcoin)
    depositYn: boolean("deposit_yn").default(false), // 입금 가능여부
    withdrawYn: boolean("withdraw_yn").default(false), // 출금 가능여부
    netType: varchar("net_type", { length: 50 }), // 네트워크 종류
  },
  (table) => [unique().on(table.exchangeId, table.coinSymbol)]
);

/* ================================
   4. 전략 히스토리
================================ */
export const strategies = pgTable(
  "strategies",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar({ length: 100 }).notNull(),
    isActive: boolean("is_active").default(false),

    // 기본 설정
    seedAmount: numeric("seed_amount", { precision: 18, scale: 8 }).notNull(), // 시드 금액 (원화)

    // 코인 선택 설정
    coinMode: varchar("coin_mode", { length: 10 }).notNull().default("custom"), // "auto" | "custom"
    selectedCoins: text("selected_coins").array(), // 선택된 코인 배열 ["BTC", "ETH", "XRP"]

    // 환율 설정
    entryRate: numeric("entry_rate", { precision: 18, scale: 8 }).notNull(), // 포지션 진입 환율
    exitRate: numeric("exit_rate", { precision: 18, scale: 8 }).notNull(), // 포지션 종료 환율

    // 리스크 관리 설정
    seedDivision: integer("seed_division").notNull().default(1), // 시드 분할 횟수
    entryCount: integer("entry_count").default(0), // 포지션 진입 횟수 ~ max : 시드 분할 횟수
    allowAverageDown: boolean("allow_average_down").default(false), // 물타기 허용
    allowAverageUp: boolean("allow_average_up").default(false), // 불타기 허용
    leverage: integer("leverage").notNull().default(1), // 레버리지

    // 고급 설정 (Premium 전용)
    aiMode: boolean("ai_mode").default(false), // boolean으로 변경
    webhookEnabled: boolean("webhook_enabled").default(false),
    telegramEnabled: boolean("telegram_enabled").default(false),
    portfolioRebalancing: boolean("portfolio_rebalancing").default(false),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_strategies_active").on(table.isActive),
    check("coin_mode_check", sql`${table.coinMode} IN ('auto', 'custom')`),
    // ai_mode_check 제거
  ]
);

/* ================================
   5. 포지션
================================ */
export const positions = pgTable(
  "positions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    strategyId: integer("strategy_id")
      .notNull()
      .references(() => strategies.id, { onDelete: "cascade" }),

    coinSymbol: varchar("coin_symbol", { length: 20 }).notNull(),
    leverage: integer("leverage").notNull().default(1),
    status: varchar({ length: 20 }).default("OPEN"), // OPEN or CLOSED
    krExchange: varchar("kr_exchange", { length: 50 }).notNull(),
    krOrderId: varchar("kr_order_id", { length: 100 }).notNull(), // 주문 UUID
    krPrice: numeric("kr_price", { precision: 18, scale: 8 }).notNull(),
    krVolume: numeric("kr_volume", {
      precision: 18,
      scale: 8,
    }).notNull(),
    krFunds: numeric("kr_funds", {
      precision: 18,
      scale: 8,
    }).notNull(),
    krFee: numeric("kr_fee", { precision: 18, scale: 8 }).notNull(),
    frExchange: varchar("fr_exchange", { length: 50 }).notNull(),
    frOrderId: varchar("fr_order_id", { length: 100 }).notNull(), // 주문 UUID
    frPrice: numeric("fr_price", { precision: 18, scale: 8 }).notNull(),
    frVolume: numeric("fr_volume", {
      precision: 18,
      scale: 8,
    }).notNull(),
    frFunds: numeric("fr_funds", {
      precision: 18,
      scale: 8,
    }).notNull(),
    frFee: numeric("fr_fee", { precision: 18, scale: 8 }).notNull(),
    usdtPrice: numeric("usdt_price", { precision: 10, scale: 2 }),
    entryRate: numeric("entry_rate", { precision: 10, scale: 2 }).notNull(),
    exitRate: numeric("exit_rate", { precision: 10, scale: 2 }),
    profit: numeric("profit", { precision: 18, scale: 2 }),
    profitRate: numeric("profit_rate", { precision: 10, scale: 2 }),
    entryTime: timestamp("entry_time").defaultNow(),
    exitTime: timestamp("exit_time"),
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
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
  activeStrategy: one(strategies, {
    fields: [users.activeStrategyId],
    references: [strategies.id],
  }),
  sessions: many(userSessions),
  exchanges: many(userExchanges),
  planHistory: many(userPlanHistory),
  payments: many(payments),
  positions: many(positions),
  trades: many(trades),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  users: many(users),
  planHistory: many(userPlanHistory),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  plan: one(plans, {
    fields: [payments.planId],
    references: [plans.id],
  }),
}));

export const userPlanHistoryRelations = relations(
  userPlanHistory,
  ({ one }) => ({
    user: one(users, {
      fields: [userPlanHistory.userId],
      references: [users.id],
    }),
    plan: one(plans, {
      fields: [userPlanHistory.planId],
      references: [plans.id],
    }),
  })
);

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

export const strategiesRelations = relations(strategies, ({ one, many }) => ({
  positions: many(positions),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  user: one(users, {
    fields: [positions.userId],
    references: [users.id],
  }),
  strategy: one(strategies, {
    fields: [positions.strategyId],
    references: [strategies.id],
  }),
  trades: many(trades),
}));

export const tradesRelations = relations(trades, ({ one }) => ({
  user: one(users, {
    fields: [trades.userId],
    references: [users.id],
  }),
  position: one(positions, {
    fields: [trades.positionId],
    references: [positions.id],
  }),
  exchangeCoin: one(coinsExchanges, {
    fields: [trades.exchangeCoinId],
    references: [coinsExchanges.id],
  }),
}));
