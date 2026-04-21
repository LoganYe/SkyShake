import type { TurbulenceLabel, TurbulenceSeverity } from "@/types/flight";

export const getTurbulenceLabel = (score: number): TurbulenceLabel => {
  if (score < 0.3) {
    return "Smooth";
  }

  if (score < 0.6) {
    return "Moderate";
  }

  return "Severe";
};

export const getTurbulenceSeverity = (label: TurbulenceLabel): TurbulenceSeverity => {
  if (label === "Smooth") {
    return "low";
  }

  if (label === "Moderate") {
    return "moderate";
  }

  return "high";
};
