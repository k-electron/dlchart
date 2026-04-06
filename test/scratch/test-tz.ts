import tzLookup from 'tz-lookup';

console.log(tzLookup(40.7128, -74.0060)); // Should be America/New_York

async function testNominatim() {
  const query = "New York, NY";
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
    headers: {
      'User-Agent': 'DaylightGrapher/1.0'
    }
  });
  const data = await res.json();
  console.log(data);
}

testNominatim();
