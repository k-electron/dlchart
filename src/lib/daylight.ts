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

export function generateYearlyData(year: number, lat: number, lng: number, timezone: string): DaylightData[] {
  const data: DaylightData[] = [];
  
  // Determine number of days in the year
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInYear = isLeapYear ? 366 : 365;

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
      // SunCalc returns Invalid Date if the sun doesn't rise or set
      // Let's check sun altitude at noon
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
      sunriseTime = timeToDecimalHours(times.sunrise, timezone);
      sunsetTime = timeToDecimalHours(times.sunset, timezone);
      
      // Handle cases where sunset is technically the next local day (e.g., very far north/south)
      if (sunsetTime < sunriseTime) {
        sunsetTime += 24;
      }
      
      daylightDuration = sunsetTime - sunriseTime;
      sunriseStr = formatInTimeZone(times.sunrise, timezone, 'h:mm a');
      sunsetStr = formatInTimeZone(times.sunset, timezone, 'h:mm a');
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
