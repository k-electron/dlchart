import SunCalc from 'suncalc';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

const lat = 78.2232;
const lng = 15.6267;
const timezone = 'Arctic/Longyearbyen';
const year = 2026;

for (let i = 290; i < 305; i++) {
  const localDate = new Date(year, 0, i + 1, 12, 0, 0);
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const localNoonStr = `${year}-${month}-${day}T12:00:00`;
  const utcDate = fromZonedTime(localNoonStr, timezone);
  
  const times = SunCalc.getTimes(utcDate, lat, lng);
  
  const format = (d: Date) => isNaN(d.getTime()) ? 'Invalid' : formatInTimeZone(d, timezone, 'yyyy-MM-dd HH:mm:ss');
  
  console.log(`${year}-${month}-${day}: Sunrise: ${format(times.sunrise)}, Sunset: ${format(times.sunset)}`);
}
