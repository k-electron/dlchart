import SunCalc from 'suncalc';
import { fromZonedTime } from 'date-fns-tz';

const lat = 78.2232;
const lng = 15.6267;
const timezone = 'Arctic/Longyearbyen';
const year = 2026;

const HORIZON_RAD = -0.833 * Math.PI / 180;

for (let i = 100; i < 115; i++) {
  const month = String(Math.floor(i / 30) + 1).padStart(2, '0'); // Rough month
  
  // Let's just use proper date math
  const localDate = new Date(year, 0, i + 1);
  const m = String(localDate.getMonth() + 1).padStart(2, '0');
  const d = String(localDate.getDate()).padStart(2, '0');
  
  const blocks: [number, number][] = [];
  let isUp = false;
  let blockStart = 0;
  
  for (let min = 0; min <= 24 * 60; min += 15) {
    const localTimeStr = `${year}-${m}-${d}T${String(Math.floor(min/60)).padStart(2, '0')}:${String(min%60).padStart(2, '0')}:00`;
    let utcDate;
    if (min === 24 * 60) {
      // 24:00 is next day 00:00
      const nextDay = new Date(year, 0, i + 2);
      const nm = String(nextDay.getMonth() + 1).padStart(2, '0');
      const nd = String(nextDay.getDate()).padStart(2, '0');
      utcDate = fromZonedTime(`${year}-${nm}-${nd}T00:00:00`, timezone);
    } else {
      utcDate = fromZonedTime(localTimeStr, timezone);
    }
    
    const pos = SunCalc.getPosition(utcDate, lat, lng);
    const currentlyUp = pos.altitude > HORIZON_RAD;
    
    if (min === 0) {
      isUp = currentlyUp;
      if (isUp) blockStart = 0;
    } else {
      if (currentlyUp !== isUp) {
        // Crossed horizon
        // Interpolate exact time
        // We need previous altitude
        const prevMin = min - 15;
        const prevTimeStr = `${year}-${m}-${d}T${String(Math.floor(prevMin/60)).padStart(2, '0')}:${String(prevMin%60).padStart(2, '0')}:00`;
        const prevUtcDate = fromZonedTime(prevTimeStr, timezone);
        const prevPos = SunCalc.getPosition(prevUtcDate, lat, lng);
        
        const fraction = (HORIZON_RAD - prevPos.altitude) / (pos.altitude - prevPos.altitude);
        const crossingMin = prevMin + fraction * 15;
        const crossingHour = crossingMin / 60;
        
        if (currentlyUp) {
          // Sunrise
          blockStart = crossingHour;
        } else {
          // Sunset
          blocks.push([blockStart, crossingHour]);
        }
        isUp = currentlyUp;
      }
    }
    
    if (min === 24 * 60 && isUp) {
      blocks.push([blockStart, 24]);
    }
  }
  
  console.log(`${year}-${m}-${d}:`, blocks.map(b => `[${b[0].toFixed(2)}, ${b[1].toFixed(2)}]`).join(', '));
}
