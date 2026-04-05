async function testGeocode() {
  const res = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=New+York,+NY&count=1');
  const data = await res.json();
  console.log("Open-Meteo NY:", JSON.stringify(data, null, 2));
}
testGeocode();
