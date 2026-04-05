import SunCalc from 'suncalc';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export interface DaylightEvent {
  type: 'Sunrise' | 'Sunset';
  time: number; // Decimal hours
  display: string;
}

export interface DaylightData {
  date: string; // YYYY-MM-DD
  displayDate: string; // MMM DD
  sunriseTime: number | null; // Decimal hours (e.g., 6.5 for 6:30 AM), null for polar night
  sunsetTime: number | null; // Decimal hours, null for polar night
  times1: [number, number] | null; // Primary daylight block
  times2: [number, number] | null; // Secondary daylight block (for days where daylight crosses midnight)
  blocks: [number, number][]; // All daylight blocks for the day
  events: DaylightEvent[]; // Chronological list of sunrise/sunset events
  isDST: boolean; // Whether daylight saving time is active on this day
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
  const HORIZON_RAD = -0.833 * Math.PI / 180;

  for (let i = 0; i < daysInYear; i++) {
    const localDate = new Date(year, 0, i + 1);
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    
    const blocks: [number, number][] = [];
    let isUp = false;
    let blockStart = 0;
    
    // Sample every 15 minutes
    for (let min = 0; min <= 24 * 60; min += 15) {
      let utcDate: Date;
      
      if (applyDST) {
        let localTimeStr;
        if (min === 24 * 60) {
          const nextDay = new Date(year, 0, i + 2);
          const nm = String(nextDay.getMonth() + 1).padStart(2, '0');
          const nd = String(nextDay.getDate()).padStart(2, '0');
          localTimeStr = `${year}-${nm}-${nd}T00:00:00`;
        } else {
          localTimeStr = `${year}-${month}-${day}T${String(Math.floor(min/60)).padStart(2, '0')}:${String(min%60).padStart(2, '0')}:00`;
        }
        utcDate = fromZonedTime(localTimeStr, timezone);
      } else {
        const utcMs = Date.UTC(year, localDate.getMonth(), localDate.getDate(), Math.floor(min/60), min%60, 0) - (standardOffset * 60 * 60 * 1000);
        utcDate = new Date(utcMs);
      }
      
      const pos = SunCalc.getPosition(utcDate, lat, lng);
      const currentlyUp = pos.altitude > HORIZON_RAD;
      
      if (min === 0) {
        isUp = currentlyUp;
        if (isUp) blockStart = 0;
      } else {
        if (currentlyUp !== isUp) {
          // Crossed horizon, interpolate
          const prevMin = min - 15;
          let prevUtcDate: Date;
          
          if (applyDST) {
            const prevTimeStr = `${year}-${month}-${day}T${String(Math.floor(prevMin/60)).padStart(2, '0')}:${String(prevMin%60).padStart(2, '0')}:00`;
            prevUtcDate = fromZonedTime(prevTimeStr, timezone);
          } else {
            const utcMs = Date.UTC(year, localDate.getMonth(), localDate.getDate(), Math.floor(prevMin/60), prevMin%60, 0) - (standardOffset * 60 * 60 * 1000);
            prevUtcDate = new Date(utcMs);
          }
          
          const prevPos = SunCalc.getPosition(prevUtcDate, lat, lng);
          const fraction = (HORIZON_RAD - prevPos.altitude) / (pos.altitude - prevPos.altitude);
          const crossingMin = prevMin + fraction * 15;
          const crossingHour = crossingMin / 60;
          
          if (currentlyUp) {
            blockStart = crossingHour;
          } else {
            blocks.push([blockStart, crossingHour]);
          }
          isUp = currentlyUp;
        }
      }
      
      if (min === 24 * 60 && isUp) {
        blocks.push([blockStart, 24]);
      }
    }
    
    let daylightDuration = 0;
    blocks.forEach(b => { daylightDuration += (b[1] - b[0]); });
    
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

    let sunriseStr = '--:--';
    let sunsetStr = '--:--';
    const dayEvents: DaylightEvent[] = [];
    
    if (blocks.length === 0) {
      sunriseStr = 'Sun is down all day';
      sunsetStr = 'Sun is down all day';
    } else if (blocks.length === 1 && blocks[0][0] === 0 && blocks[0][1] === 24) {
      sunriseStr = 'Sun is up all day';
      sunsetStr = 'Sun is up all day';
    } else {
      const sunrises = blocks.filter(b => b[0] > 0).map(b => formatDecimal(b[0]));
      const sunsets = blocks.filter(b => b[1] < 24).map(b => formatDecimal(b[1]));
      
      sunriseStr = sunrises.length > 0 ? sunrises.join(', ') : '--:--';
      sunsetStr = sunsets.length > 0 ? sunsets.join(', ') : '--:--';
      
      // Populate chronological events
      blocks.forEach(b => {
        if (b[0] > 0) {
          dayEvents.push({ type: 'Sunrise', time: b[0], display: formatDecimal(b[0]) });
        }
        if (b[1] < 24) {
          dayEvents.push({ type: 'Sunset', time: b[1], display: formatDecimal(b[1]) });
        }
      });
      dayEvents.sort((a, b) => a.time - b.time);
    }

    const noonUtc = new Date(Date.UTC(year, localDate.getMonth(), localDate.getDate(), 12, 0, 0));
    
    // Determine if DST is active on this day
    const currentOffsetStr = formatInTimeZone(noonUtc, timezone, 'xxx');
    const currentOffset = parseOffset(currentOffsetStr);
    const isDST = applyDST && (currentOffset > standardOffset);

    data.push({
      date: `${year}-${month}-${day}`,
      displayDate: formatInTimeZone(noonUtc, 'UTC', 'MMM d'),
      sunriseTime: blocks.length > 0 && blocks[0][0] > 0 ? blocks[0][0] : null,
      sunsetTime: blocks.length > 0 && blocks[blocks.length-1][1] < 24 ? blocks[blocks.length-1][1] : null,
      times1: blocks.length > 0 ? blocks[0] : null,
      times2: blocks.length > 1 ? blocks[1] : null,
      blocks,
      events: dayEvents,
      isDST,
      daylightDuration,
      sunriseStr,
      sunsetStr,
    });
  }

  return data;
}
