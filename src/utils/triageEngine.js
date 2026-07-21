import neighborhoodsData from '../data/foodbridge/neighborhoods.json';
import districtNeedData from '../data/foodbridge/district_need.json';
import facilitiesData from '../data/foodbridge/facilities.json';
import nutritionData from '../data/foodbridge/nutrition.json';
import hotelBenchmarksData from '../data/foodbridge/hotel_benchmarks.json';

const NEIGHBORHOODS = neighborhoodsData.neighborhoods;
const DISTRICT_NEED = districtNeedData.districts;
const DISTRICT_ASSUMPTIONS = districtNeedData.assumptions;
const FACILITIES = facilitiesData.facilities;
const NUTRITION = nutritionData;
const HOTEL = hotelBenchmarksData;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }
function nbhd(id) { return NEIGHBORHOODS.find(n => n.id === id); }

export function uid() { return Math.random().toString(36).slice(2, 9); }

export function classify(condition) {
  if (condition === 'expired' || condition === 'spoiled') {
    return {
      classification: 'inedible',
      reason: `Rule-based: condition reported as "${condition}" -> not fit for human consumption. Routed to energy-recovery pipeline.`
    };
  }
  return {
    classification: 'edible',
    reason: `Rule-based: condition "${condition}" and within a safe redistribution window -> eligible for donation.`
  };
}

export function computeNutritionStatic(weightKg, category) {
  const cat = NUTRITION.categories[category] || NUTRITION.categories.other;
  const totalKcal = weightKg * 10 * cat.kcalPer100g;
  const meals = totalKcal / NUTRITION.kcalPerMealAssumption;
  return { kcalPer100g: cat.kcalPer100g, totalKcal: Math.round(totalKcal), meals: round1(meals), source: 'static fallback table' };
}

export function routeEdible(originNeighborhoodId, mealsNeeded) {
  const origin = nbhd(originNeighborhoodId);
  const mealsPerPerson = DISTRICT_ASSUMPTIONS.mealsNeededPerPersonPerDay || 2;
  const candidates = DISTRICT_NEED.map(d => {
    const target = nbhd(d.id);
    const distanceKm = haversineKm(origin.lat, origin.lon, target.lat, target.lon);
    const coveragePct = d.currentCoveragePct;
    const needMeals = d.estimatedPeopleInNeed * mealsPerPerson * (1 - coveragePct / 100);
    return { ...d, distanceKm, needMeals, coveragePct, districtName: target.name, lat: target.lat, lon: target.lon };
  }).sort((a, b) => (b.needMeals - a.needMeals) || (a.distanceKm - b.distanceKm));

  let remaining = mealsNeeded;
  const allocations = [];
  for (const c of candidates) {
    if (remaining <= 0 || allocations.length >= 2) break;
    if (c.needMeals <= 0) continue;
    const amount = Math.min(remaining, c.needMeals);
    allocations.push({
      districtId: c.id, districtName: c.districtName,
      lat: c.lat, lon: c.lon,
      distanceKm: round1(c.distanceKm), mealsRouted: round1(amount),
      estimatedPeopleInNeed: c.estimatedPeopleInNeed, coveragePct: c.coveragePct
    });
    remaining -= amount;
  }
  if (remaining > 0 && allocations.length > 0) {
    allocations[allocations.length - 1].mealsRouted = round1(allocations[allocations.length - 1].mealsRouted + remaining);
  }
  return allocations;
}

export function routeInedible(originNeighborhoodId, category, weightKg) {
  const origin = nbhd(originNeighborhoodId);
  const candidates = FACILITIES.map(f => {
    const distanceKm = haversineKm(origin.lat, origin.lon, f.lat, f.lon);
    const matches = f.accepts.includes(category);
    return { ...f, distanceKm, matches };
  }).sort((a, b) => (Number(b.matches) - Number(a.matches)) || (a.distanceKm - b.distanceKm));

  const chosen = candidates[0];
  let energyEstimate, energyUnit, formula;
  if (chosen.energyModel === 'anaerobic_digestion') {
    const biogasM3 = (weightKg / 1000) * 100;
    const methaneM3 = biogasM3 * 0.6;
    energyEstimate = Math.round(methaneM3 * 10);
    energyUnit = 'kWh (anaerobic digestion, est.)';
    formula = '~100 m3 biogas/tonne x 60% CH4 x ~10 kWh/m3 CH4 (configurable assumption)';
  } else {
    energyEstimate = Math.round((weightKg / 1000) * 600);
    energyUnit = 'kWh (waste-to-energy incineration, est.)';
    formula = '~0.6 MWh/tonne incinerated (configurable assumption)';
  }
  return {
    facilityId: chosen.id, facilityName: chosen.name, address: chosen.address,
    lat: chosen.lat, lon: chosen.lon, distanceKm: round1(chosen.distanceKm),
    matchedAcceptedType: chosen.matches, energyEstimate, energyUnit, formula, source: chosen.source
  };
}

export function predictHotelWaste(totalRooms, occupancyPct, breakfast, restaurant, banquet, banquetGuests) {
  const roomsOccupied = totalRooms * (occupancyPct / 100);
  const guests = roomsOccupied * HOTEL.avgGuestsPerRoom;
  let kg = 0;
  const breakdown = [];
  if (breakfast) {
    const v = guests * HOTEL.wasteKgPerGuestNight.breakfast_buffet;
    kg += v; breakdown.push(`breakfast buffet: ${guests.toFixed(0)} guests x ${HOTEL.wasteKgPerGuestNight.breakfast_buffet}kg/guest = ${v.toFixed(1)}kg`);
  }
  if (restaurant) {
    const v = guests * HOTEL.wasteKgPerGuestNight.restaurant_ala_carte;
    kg += v; breakdown.push(`restaurant service: ${guests.toFixed(0)} guests x ${HOTEL.wasteKgPerGuestNight.restaurant_ala_carte}kg/guest = ${v.toFixed(1)}kg`);
  }
  if (banquet && banquetGuests > 0) {
    const v = banquetGuests * HOTEL.wasteKgPerBanquetGuest;
    kg += v; breakdown.push(`banquet/event: ${banquetGuests} guests x ${HOTEL.wasteKgPerBanquetGuest}kg/guest = ${v.toFixed(1)}kg`);
  }
  return {
    guests: Math.round(guests), totalKg: round2(kg),
    edibleKg: round2(kg * HOTEL.predictedEdibleRatio), inedibleKg: round2(kg * HOTEL.predictedInedibleRatio),
    breakdown
  };
}

export function getNeighborhoods() {
  return NEIGHBORHOODS;
}
export function getFacilities() {
  return FACILITIES;
}
export function getDistricts() {
  return DISTRICT_NEED;
}
