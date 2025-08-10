import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/auth", "routes/auth.tsx"),
  layout("routes/_layout.tsx", [
    route("/dashboard", "routes/dashboard.tsx"),
    route("/exchanges", "routes/exchanges.tsx"),
    route("/autotrading", "routes/autotrading.tsx"),
    route("/plans", "routes/plans.tsx"),
  ]),
] satisfies RouteConfig;
