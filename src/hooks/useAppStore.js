import { useState, useEffect } from 'react';
import { classify, computeNutritionStatic, routeEdible, routeInedible, predictHotelWaste, uid, getNeighborhoods, getFacilities, getDistricts } from '../utils/triageEngine';

// Seed demo data to match FoodBridge
const seedRecords = async () => {
  const records = [];
  
  const addSR = (fd) => {
    const record = {
      id: uid(), sourceType: fd.sourceType, sourceName: fd.sourceName, neighborhood: fd.neighborhood,
      category: fd.category, weightKg: Number(fd.weightKg), condition: fd.condition,
      timestamp: new Date().toISOString(), isPredicted: false
    };
    const cls = classify(record.condition);
    record.classification = cls.classification;
    record.classificationReason = cls.reason;

    if (record.classification === 'edible') {
      record.nutrition = computeNutritionStatic(record.weightKg, record.category);
      record.routing = { kind: 'shelter', allocations: routeEdible(record.neighborhood, record.nutrition.meals) };
    } else {
      record.routing = { kind: 'facility', ...routeInedible(record.neighborhood, record.category, record.weightKg) };
    }
    records.unshift(record);
  };

  const addH = (fd) => {
    const pred = predictHotelWaste(
      Number(fd.totalRooms), Number(fd.occupancyPct),
      fd.breakfast, fd.restaurant, fd.banquet, Number(fd.banquetGuests || 0)
    );
    const baseTs = new Date().toISOString();
    
    if (pred.edibleKg > 0.05) {
      const r = {
        id: uid(), sourceType: 'hotel', sourceName: fd.sourceName, neighborhood: fd.neighborhood,
        category: 'mixed_hotel_surplus', weightKg: pred.edibleKg, condition: 'predicted',
        timestamp: baseTs, isPredicted: true, classification: 'edible',
        classificationReason: `Rule-based: predicted edible portion from occupancy model.`
      };
      r.nutrition = computeNutritionStatic(r.weightKg, r.category);
      r.routing = { kind: 'shelter', allocations: routeEdible(r.neighborhood, r.nutrition.meals) };
      records.unshift(r);
    }
    if (pred.inedibleKg > 0.05) {
      const r = {
        id: uid(), sourceType: 'hotel', sourceName: fd.sourceName, neighborhood: fd.neighborhood,
        category: 'mixed_hotel_surplus', weightKg: pred.inedibleKg, condition: 'predicted',
        timestamp: baseTs, isPredicted: true, classification: 'inedible',
        classificationReason: `Rule-based: predicted inedible/prep-scrap portion from occupancy model.`
      };
      r.routing = { kind: 'facility', ...routeInedible(r.neighborhood, r.category, r.weightKg) };
      records.unshift(r);
    }
  };

  addSR({ sourceType: 'supermarket', sourceName: 'Albert Heijn — Centrum', neighborhood: 'centrum', category: 'bakery', weightKg: 18, condition: 'near_expiry' });
  addSR({ sourceType: 'supermarket', sourceName: 'Jumbo — Oost', neighborhood: 'oost', category: 'produce', weightKg: 32, condition: 'near_expiry' });
  addSR({ sourceType: 'supermarket', sourceName: 'Albert Heijn — West', neighborhood: 'west', category: 'dairy', weightKg: 14, condition: 'expired' });
  addSR({ sourceType: 'restaurant', sourceName: 'Café De Reiger', neighborhood: 'centrum', category: 'prepared_meals', weightKg: 9, condition: 'fresh' });
  addSR({ sourceType: 'restaurant', sourceName: 'Restaurant Zuidas Bites', neighborhood: 'zuid', category: 'meat', weightKg: 11, condition: 'spoiled' });
  addSR({ sourceType: 'supermarket', sourceName: 'Jumbo — Nieuw-West', neighborhood: 'nieuw-west', category: 'produce', weightKg: 27, condition: 'near_expiry' });
  addSR({ sourceType: 'restaurant', sourceName: 'Noorderlicht Café', neighborhood: 'noord', category: 'bakery', weightKg: 7, condition: 'fresh' });
  addH({ sourceName: 'Hotel Amstel Waterfront', neighborhood: 'centrum', totalRooms: 220, occupancyPct: 82, breakfast: true, restaurant: true, banquet: true, banquetGuests: 60 });
  addH({ sourceName: 'Hotel Zuidplein Business', neighborhood: 'zuid', totalRooms: 150, occupancyPct: 68, breakfast: true, restaurant: false, banquet: false, banquetGuests: 0 });
  addH({ sourceName: 'Hotel Oost Canal View', neighborhood: 'oost', totalRooms: 90, occupancyPct: 75, breakfast: true, restaurant: true, banquet: false, banquetGuests: 0 });
  
  return records;
};

export function useAppStore() {
  const [records, setRecords] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('worldMonitorRecordsV2');
    if (stored) {
      setRecords(JSON.parse(stored));
    } else {
      seedRecords().then(seed => {
        setRecords(seed);
        localStorage.setItem('worldMonitorRecordsV2', JSON.stringify(seed));
      });
    }
    setIsLoaded(true);
  }, []);

  const saveRecords = (newRecords) => {
    setRecords(newRecords);
    localStorage.setItem('worldMonitorRecordsV2', JSON.stringify(newRecords));
  };

  const addRecord = (record) => {
    const newRecords = [record, ...records];
    saveRecords(newRecords);
  };

  const clearRecords = () => {
    saveRecords([]);
  };

  const loadDemoData = async () => {
    const seed = await seedRecords();
    saveRecords(seed);
  };

  return { records, isLoaded, addRecord, clearRecords, loadDemoData };
}
