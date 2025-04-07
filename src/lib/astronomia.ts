import { Origin, Horoscope } from "circular-natal-horoscope-js";


export default function chartascendant(year, month, day, hour, minute, latitude, longitude) {
  const origin = new Origin({
    year: year,
    month: month - 1, // 0 = January, 11 = December!
    date: day,
    hour: hour,
    minute: minute,
    latitude: latitude,
    longitude: longitude,
  });

  const horoscope = new Horoscope({
    origin: origin,
    houseSystem: "placidus",
    zodiac: "tropical",
    aspectPoints: ['bodies', 'points', 'angles'],
    aspectWithPoints: ['bodies', 'points', 'angles'],
    aspectTypes: ["major", "minor"],
    customOrbs: {},
    language: 'en'
  });
  const ascendant = horoscope.Ascendant;
  const chartposition = ascendant.ChartPosition;
  const chartecliptic = chartposition.Ecliptic;
  const decimaldegree = chartecliptic.DecimalDegrees;
  const ascdegree = chartecliptic.ArcDegreesFormatted30;
  const ascsignobj = ascendant.Sign;
  const ascsign = ascsignobj.Label;

  const bodies = horoscope.CelestialBodies;
  const points = horoscope.CelestialPoints;
  const midheaven = horoscope.Midheaven;

  return { 
    ascdegree,
    ascsign,
    decimaldegree,
    bodies,
    points,
    midheaven
  };
}