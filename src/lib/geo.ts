import type { AirportCoordinates } from "@/types/flight";

const toRadians = (value: number) => (value * Math.PI) / 180;
const toDegrees = (value: number) => (value * 180) / Math.PI;

export const createGreatCirclePoints = (
  from: AirportCoordinates,
  to: AirportCoordinates,
  segments = 32,
): AirportCoordinates[] => {
  const lat1Rad = toRadians(from.lat);
  const lon1Rad = toRadians(from.lon);
  const lat2Rad = toRadians(to.lat);
  const lon2Rad = toRadians(to.lon);

  const angularDistance =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat1Rad - lat2Rad) / 2) ** 2 +
          Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin((lon1Rad - lon2Rad) / 2) ** 2,
      ),
    );

  if (!Number.isFinite(angularDistance) || angularDistance === 0) {
    return [from, to];
  }

  return Array.from({ length: segments + 1 }, (_, index) => {
    const fraction = index / segments;
    const a = Math.sin((1 - fraction) * angularDistance) / Math.sin(angularDistance);
    const b = Math.sin(fraction * angularDistance) / Math.sin(angularDistance);

    const x =
      a * Math.cos(lat1Rad) * Math.cos(lon1Rad) + b * Math.cos(lat2Rad) * Math.cos(lon2Rad);
    const y =
      a * Math.cos(lat1Rad) * Math.sin(lon1Rad) + b * Math.cos(lat2Rad) * Math.sin(lon2Rad);
    const z = a * Math.sin(lat1Rad) + b * Math.sin(lat2Rad);

    return {
      lat: toDegrees(Math.atan2(z, Math.sqrt(x * x + y * y))),
      lon: toDegrees(Math.atan2(y, x)),
    };
  });
};
