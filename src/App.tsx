import { useState, useEffect, FormEvent } from 'react';
import { Search, MapPin, ChevronLeft, ChevronRight, Loader2, Sun } from 'lucide-react';
import { resolveLocation, LocationData } from './lib/location';
import { generateYearlyData, DaylightData, checkObservesDST } from './lib/daylight';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';

export default function App() {
  const [query, setQuery] = useState('New York, NY');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<DaylightData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [observesDST, setObservesDST] = useState(true);
  const [applyDST, setApplyDST] = useState(true);

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const loc = await resolveLocation(query);
      setLocation(loc);
      setApplyDST(true); // Reset toggle to default on new search
    } catch (err: any) {
      setError(err.message || 'Failed to resolve location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location) {
      setIsCalculating(true);
      // Yield to browser to show loading state
      const timer = setTimeout(() => {
        const obsDST = checkObservesDST(year, location.timezone);
        setObservesDST(obsDST);
        
        const yearlyData = generateYearlyData(
          year, 
          location.lat, 
          location.lng, 
          location.timezone, 
          obsDST ? applyDST : true
        );
        setData(yearlyData);
        setIsCalculating(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [year, location]); // Removed applyDST from here

  useEffect(() => {
    // Only run this when applyDST changes, and not during the initial location/year load
    if (location && !isCalculating) {
      const obsDST = checkObservesDST(year, location.timezone);
      const yearlyData = generateYearlyData(
        year, 
        location.lat, 
        location.lng, 
        location.timezone, 
        obsDST ? applyDST : true
      );
      setData(yearlyData);
    }
  }, [applyDST]);

  const formatHours = (decimalHours: number) => {
    if (decimalHours === 24 || decimalHours === 0) return '12:00 AM';
    let hours = Math.floor(decimalHours);
    let minutes = Math.round((decimalHours - hours) * 60);
    if (minutes === 60) {
      hours += 1;
      minutes = 0;
    }
    if (hours === 24) return '12:00 AM';
    const ampm = hours >= 12 && hours < 24 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatDuration = (decimalHours: number) => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as DaylightData;
      return (
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-lg w-64">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-slate-800">{dataPoint.displayDate}, {year}</p>
            {dataPoint.isDST && (
              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase tracking-wider">
                DST
              </span>
            )}
          </div>
          
          {/* Tiny Bar */}
          <div className="mb-4">
            <div className="h-3 w-full bg-slate-700 rounded-sm overflow-hidden relative">
              {dataPoint.blocks && dataPoint.blocks.map((block, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 bg-yellow-200"
                  style={{
                    left: `${(block[0] / 24) * 100}%`,
                    width: `${((block[1] - block[0]) / 24) * 100}%`
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>12 AM</span>
              <span>12 PM</span>
              <span>12 AM</span>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {dataPoint.events && dataPoint.events.length > 0 ? (
              dataPoint.events.map((event, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className={event.type === 'Sunrise' ? 'text-orange-600 font-medium' : 'text-indigo-600 font-medium'}>
                    {event.type}
                  </span>
                  <span className="text-slate-700">{event.display}</span>
                </div>
              ))
            ) : (
              <div className="text-slate-600 italic">
                {dataPoint.daylightDuration === 0 ? 'Sun is down all day' : 'Sun is up all day'}
              </div>
            )}
            
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-2">
              <span className="font-medium text-slate-600">Total Daylight</span>
              <span className="text-slate-800 font-medium">{formatDuration(dataPoint.daylightDuration)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-200">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-orange-500">
              <Sun className="h-6 w-6" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Daylight Grapher</h1>
            </div>
            
            <form onSubmit={handleSearch} className="w-full sm:max-w-md relative">
              <input
                type="text"
                placeholder="Enter city, zip code, or address..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <button 
                type="submit" 
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500 text-white p-1.5 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
                disabled={loading || !query.trim()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3">
            <div className="mt-0.5">⚠️</div>
            <p>{error}</p>
          </div>
        )}

        {!location && !loading && !error && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-500 mb-4">
              <MapPin className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Search for a location</h2>
            <p className="text-slate-500 max-w-md mx-auto">
              Enter any city, state, zip code, or address to see its daylight patterns and sunrise/sunset times throughout the year.
            </p>
          </div>
        )}

        {location && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-orange-500" />
                  {location.formattedAddress}
                </h2>
                <p className="text-slate-500 mt-1">
                  {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}° • Timezone: {location.timezone}
                </p>
              </div>
              
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setYear(y => y - 1)}
                  className="p-2 hover:bg-white rounded-lg transition-colors text-slate-600 hover:text-slate-900 hover:shadow-sm"
                  aria-label="Previous year"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-lg font-semibold w-16 text-center tabular-nums">{year}</span>
                <button 
                  onClick={() => setYear(y => y + 1)}
                  className="p-2 hover:bg-white rounded-lg transition-colors text-slate-600 hover:text-slate-900 hover:shadow-sm"
                  aria-label="Next year"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sunrise / Sunset Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Sunrise & Sunset Times</h3>
                <div className="relative flex-1 min-h-[400px]">
                  {(loading || isCalculating) && (
                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                      <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                    </div>
                  )}
                  <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        barCategoryGap={0}
                        barGap={0}
                      >
                        <ReferenceArea {...({ y1: 0, y2: 24, fill: '#334155' } as any)} />
                        <XAxis 
                          dataKey="displayDate" 
                          xAxisId={0}
                          minTickGap={30}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <XAxis 
                          dataKey="displayDate" 
                          xAxisId={1}
                          hide={true}
                        />
                        <YAxis 
                          domain={[0, 24]} 
                          ticks={[0, 4, 8, 12, 16, 20, 24]}
                          tickFormatter={(val) => formatHours(val)}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          reversed={true}
                          allowDataOverflow={true}
                        />
                        <Bar 
                          dataKey="times1" 
                          xAxisId={0}
                          fill="#fef08a" 
                          name="Daylight"
                          isAnimationActive={false}
                        />
                        <Bar 
                          dataKey="times2" 
                          xAxisId={1}
                          fill="#fef08a" 
                          name="Daylight (Night)"
                          isAnimationActive={false}
                        />
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          vertical={false} 
                          stroke="#ffffff" 
                          style={{ mixBlendMode: 'difference' }} 
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.2)' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Daylight Saving Time</h4>
                    <p className="text-xs text-slate-500">
                      {observesDST 
                        ? "Toggle to see times without DST adjustments." 
                        : "This region does not observe DST."}
                    </p>
                  </div>
                  <button
                    onClick={() => setApplyDST(!applyDST)}
                    disabled={!observesDST}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                      !observesDST ? 'bg-slate-300 cursor-not-allowed' : applyDST ? 'bg-orange-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        applyDST && observesDST ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <p className="text-sm text-slate-500 mt-4 text-center">
                  Discontinuities indicate Daylight Saving Time transitions.
                </p>
              </div>

              {/* Daylight Duration Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Total Daylight Hours</h3>
                <div className="relative flex-1 min-h-[400px]">
                  {(loading || isCalculating) && (
                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                      <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                    </div>
                  )}
                  <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#eab308" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="displayDate" 
                          minTickGap={30}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          domain={[0, 24]}
                          ticks={[0, 4, 8, 12, 16, 20, 24]}
                          tickFormatter={(val) => `${Math.round(val)}h`}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="daylightDuration" 
                          stroke="#eab308" 
                          fill="url(#colorDuration)" 
                          strokeWidth={2}
                          name="Duration"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-4 text-center">
                  Total daylight hours throughout the year.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
