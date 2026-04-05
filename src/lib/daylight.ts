import SunCalc from 'suncalc';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export interface DaylightData {
  date: string; // YYYY-MM-DD
  displayDate: string; // MMM DD
  sunriseTime: number; // Decimal hours (e.g., 6.5 for 6:30 AM)
  sunsetTime: number; // Decimal hours
  times: [number, number]; // [sunriseTime, sunsetTime] for Recharts Area
  daylightDuration: number; // Decimal hours
  sunriseStr: string;
  sunsetStr: string;
}

function timeToDecimalHours(date: Date, timezone: string): number {
  const timeStr = formatInTimeZone(date, timezone, 'HH:mm:ss');
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours + minutes / 60 + seconds / 3600;
}

export function checkObservesDST(year: number, timezone: string): boolean {
  const jan = new Date(Date.UTC(year, 0, 1));
  const jul = new Date(Date.UTC(year, 6, 1));
  const offsetJanStr = formatInTimeZone(jan, timezone, 'xxx');
  const offsetJulStr = formatInTimeZone(jul, timezone, 'xxx');
  return offsetJanStr !== offsetJulStr;
}

export function generateYearlyData(
  year: number, 
  lat: number, 
  lng: number, 
  timezone: string,
  applyDST: boolean = true
): DaylightData[] {
  const data: DaylightData[] = [];
  
  // Determine number of days in the year
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInYear = isLeapYear ? 366 : 365;

  const jan = new Date(Date.UTC(year, 0, 1));
  const jul = new Date(Date.UTC(year, 6, 1));
  const offsetJanStr = formatInTimeZone(jan, timezone, 'xxx');
  const offsetJulStr = formatInTimeZone(jul, timezone, 'xxx');
  
  const parseOffset = (offsetStr: string) => {
    const sign = offsetStr.startsWith('-') ? -1 : 1;
    const [hours, minutes] = offsetStr.substring(1).split(':').map(Number);
    return sign * (hours + minutes / 60);
  };
  
  const standardOffset = Math.min(parseOffset(offsetJanStr), parseOffset(offsetJulStr));

  for (let i = 0; i < daysInYear; i++) {
    // Construct local date at noon
    const localDate = new Date(year, 0, i + 1, 12, 0, 0); // Month is 0-indexed, day is 1-indexed
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    
    // Create a string representing noon in the target timezone
    const localNoonStr = `${year}-${month}-${day}T12:00:00`;
    
    // Get the corresponding UTC Date object
    const utcDate = fromZonedTime(localNoonStr, timezone);
    
    // Calculate sunrise and sunset
    const times = SunCalc.getTimes(utcDate, lat, lng);
    
    let sunriseTime = 0;
    let sunsetTime = 0;
    let daylightDuration = 0;
    let sunriseStr = '--:--';
    let sunsetStr = '--:--';

    if (isNaN(times.sunrise.getTime()) || isNaN(times.sunset.getTime())) {
      // Handle polar day/night cases
      const pos = SunCalc.getPosition(utcDate, lat, lng);
      if (pos.altitude > 0) {
        // Polar day (sun is up all day)
        sunriseTime = 0;
        sunsetTime = 24;
        daylightDuration = 24;
        sunriseStr = 'Sun is up all day';
        sunsetStr = 'Sun is up all day';
      } else {
        // Polar night (sun is down all day)
        sunriseTime = 12; // Arbitrary, won't show duration
        sunsetTime = 12;
        daylightDuration = 0;
        sunriseStr = 'Sun is down all day';
        sunsetStr = 'Sun is down all day';
      }
    } else {
      if (applyDST) {
        sunriseTime = timeToDecimalHours(times.sunrise, timezone);
        sunsetTime = timeToDecimalHours(times.sunset, timezone);
        sunriseStr = formatInTimeZone(times.sunrise, timezone, 'h:mm a');
        sunsetStr = formatInTimeZone(times.sunset, timezone, 'h:mm a');
      } else {
        const getDecimalFromUTC = (date: Date) => {
          let val = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600 + standardOffset;
          while (val < 0) val += 24;
          while (val >= 24) val -= 24;
          return val;
        };
        sunriseTime = getDecimalFromUTC(times.sunrise);
        sunsetTime = getDecimalFromUTC(times.sunset);
        
        const formatDecimal = (decimal: number) => {
          let h = Math.floor(decimal);
          let m = Math.round((decimal - h) * 60);
          if (m === 60) {
            h += 1;
            m = 0;
          }
          if (h >= 24) h -= 24;
          const ampm = h >= 12 ? 'PM' : 'AM';
          const displayH = h % 12 || 12;
          return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
        };
        sunriseStr = formatDecimal(sunriseTime);
        sunsetStr = formatDecimal(sunsetTime);
      }
      
      // Handle cases where sunset is technically the next local day (e.g., very far north/south)
      if (sunsetTime < sunriseTime) {
        sunsetTime += 24;
      }
      
      daylightDuration = sunsetTime - sunriseTime;
    }

    data.push({
      date: `${year}-${month}-${day}`,
      displayDate: formatInTimeZone(utcDate, timezone, 'MMM d'),
      sunriseTime,
      sunsetTime,
      times: [sunriseTime, sunsetTime],
      daylightDuration,
      sunriseStr,
      sunsetStr,
    });
  }

  return data;
}
