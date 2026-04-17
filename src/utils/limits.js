export const MAX_CARS = 100;

// Future-ready: customize by plan type without touching feature code.
export const PLAN_CAR_LIMITS = {
  free: MAX_CARS,
  pro: MAX_CARS,
  enterprise: MAX_CARS,
};

export function getCarsLimit(userPlan) {
  const explicitPlanLimit = Number(userPlan?.productsLimit);
  if (Number.isFinite(explicitPlanLimit) && explicitPlanLimit > 0) {
    return Math.max(explicitPlanLimit, MAX_CARS);
  }

  const planType = String(userPlan?.type || "free").trim().toLowerCase();
  return PLAN_CAR_LIMITS[planType] || MAX_CARS;
}
