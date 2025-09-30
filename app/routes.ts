import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/auth", "routes/auth.tsx"),
  route("/forgot-password", "routes/forgot-password.tsx"),
  route("/api/auth", "routes/api.auth.tsx"),
  route("/api/exchanges", "routes/api.exchanges.tsx"),
  route("/api/kline", "routes/api.kline.ts"),
  route("/api/password-reset", "routes/api.password-reset.tsx"),
  route("/api/payments", "routes/api.payments.tsx"),
  route("/api/strategy", "routes/api.strategy.tsx"),
  route("/api/active-positions", "routes/api.active-positions.ts"),
  route("/api/trading-data", "routes/api.trading-data.ts"),
  route(
    "/api/inquiry-restricted-coin",
    "routes/api.inquiry-restricted-coin.tsx"
  ),
  route("/api/close-position", "routes/api.close-position.tsx"),
  route("/api/open-position", "routes/api.open-position.tsx"),
  route("/api/premium/stream", "routes/api.premium.stream.ts"),
  route("/api/proxy", "routes/api.proxy.ts"),
  route("/api/proxy/position/price", "routes/api.proxy.position.price.ts"),
  route("/terms-service", "routes/terms-service.tsx"),
  route("/privacy-policy", "routes/privacy-policy.tsx"),
  layout("routes/_layout.tsx", [
    route("/dashboard", "routes/dashboard.tsx"),
    route("/exchanges", "routes/exchanges.tsx"),
    route("/autotrading", "routes/autotrading.tsx"),
    route("/plans", "routes/plans.tsx"),
  ]),
] satisfies RouteConfig;
