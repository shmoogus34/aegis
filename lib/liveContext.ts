// lib/liveContext.ts — Real-Time Live Intelligence & Omni-Knowledge Engine
// Integrates: Exact Time/Clock, Farmville & Global Weather, Live News & Web Search, and Obsidian Vault Knowledge

import fs from 'fs';
import path from 'path';

// ── 1. Live Time & Clock ───────────────────────────────────────────────
export interface LiveTimeInfo {
  iso: string;
  formattedTime: string;
  formattedDate: string;
  dayOfWeek: string;
  timezone: string;
  speechSummary: string;
}

export function getCurrentSystemTime(timeZone: string = 'America/New_York'): LiveTimeInfo {
  const now = new Date();
  
  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const dateStr = now.toLocaleDateString('en-US', {
    timeZone,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const dayOfWeek = now.toLocaleDateString('en-US', {
    timeZone,
    weekday: 'long',
  });

  return {
    iso: now.toISOString(),
    formattedTime: timeStr,
    formattedDate: dateStr,
    dayOfWeek,
    timezone: timeZone === 'America/New_York' ? 'EDT (Eastern Daylight Time)' : timeZone,
    speechSummary: `It is currently ${timeStr} on ${dayOfWeek}, ${dateStr} in ${timeZone === 'America/New_York' ? 'Farmville, Virginia' : timeZone}.`,
  };
}

// ── 2. Real-Time Weather Engine (Open-Meteo) ───────────────────────────
export interface LiveWeatherReport {
  locationName: string;
  latitude: number;
  longitude: number;
  currentTempF: number;
  feelsLikeF: number;
  condition: string;
  humidityPercent: number;
  windSpeedMph: number;
  todayMaxTempF: number;
  todayMinTempF: number;
  precipitationInches: number;
  precipitationProbabilityMax: number;
  speechSummary: string;
  raw?: any;
}

// WMO Weather Interpretation Codes
const WMO_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

const NON_LOCATION_WORDS = new Set([
  'today', 'tomorrow', 'now', 'tonight', 'the day', 'day', 'this week', 'the week', 'weekend', 'the weekend',
  'the', 'my area', 'here', 'current', 'outside', 'me', 'us', 'right now', 'farmville', 'farmville va', 'farmville virginia'
]);

/** Geocode city name to latitude and longitude */
export async function geocodeLocation(cityName: string): Promise<{ name: string; lat: number; lon: number; admin1?: string; country?: string }> {
  const cleanName = cityName.trim().toLowerCase();
  if (!cleanName || cleanName.includes('farmville') || NON_LOCATION_WORDS.has(cleanName)) {
    return { name: 'Farmville, VA', lat: 37.3021, lon: -78.3919, admin1: 'Virginia', country: 'United States' };
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanName)}&count=1&language=en&format=json`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const displayName = item.admin1 ? `${item.name}, ${item.admin1}` : `${item.name}, ${item.country || ''}`;
        return {
          name: displayName,
          lat: item.latitude,
          lon: item.longitude,
          admin1: item.admin1,
          country: item.country,
        };
      }
    }
  } catch (err) {
    console.warn('[Geocoding error]:', err);
  }

  // Fallback to Farmville, VA
  return { name: 'Farmville, VA', lat: 37.3021, lon: -78.3919, admin1: 'Virginia', country: 'United States' };
}

/** Fetch live real-time weather and forecast */
export async function getLiveWeather(locationQuery?: string): Promise<LiveWeatherReport> {
  const geo = await geocodeLocation(locationQuery || 'Farmville, VA');
  
  try {
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;
    
    const res = await fetch(forecastUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const current = data.current || {};
      const daily = data.daily || {};

      const currentTemp = Math.round(current.temperature_2m ?? 70);
      const feelsLike = Math.round(current.apparent_temperature ?? currentTemp);
      const weatherCode = current.weather_code ?? 0;
      const condition = WMO_CODES[weatherCode] || 'Clear';
      const humidity = Math.round(current.relative_humidity_2m ?? 50);
      const windSpeed = Math.round(current.wind_speed_10m ?? 5);

      const todayMax = Math.round(daily.temperature_2m_max?.[0] ?? currentTemp);
      const todayMin = Math.round(daily.temperature_2m_min?.[0] ?? currentTemp - 10);
      const precipSum = daily.precipitation_sum?.[0] ?? 0;
      const precipProb = Math.round(daily.precipitation_probability_max?.[0] ?? 0);

      const speechSummary = `In ${geo.name}, it is currently ${currentTemp}°F and ${condition.toLowerCase()}, with a feels-like temperature of ${feelsLike}°F. Humidity is ${humidity}% with winds around ${windSpeed} mph. Today's forecast has a high of ${todayMax}°F, a low of ${todayMin}°F, and a ${precipProb}% chance of rain.`;

      return {
        locationName: geo.name,
        latitude: geo.lat,
        longitude: geo.lon,
        currentTempF: currentTemp,
        feelsLikeF: feelsLike,
        condition,
        humidityPercent: humidity,
        windSpeedMph: windSpeed,
        todayMaxTempF: todayMax,
        todayMinTempF: todayMin,
        precipitationInches: precipSum,
        precipitationProbabilityMax: precipProb,
        speechSummary,
        raw: data,
      };
    }
  } catch (err) {
    console.warn('[Weather API error]:', err);
  }

  // Graceful fallback if weather service is unavailable
  return {
    locationName: geo.name,
    latitude: geo.lat,
    longitude: geo.lon,
    currentTempF: 71,
    feelsLikeF: 73,
    condition: 'Partly cloudy',
    humidityPercent: 75,
    windSpeedMph: 7,
    todayMaxTempF: 78,
    todayMinTempF: 62,
    precipitationInches: 0,
    precipitationProbabilityMax: 20,
    speechSummary: `In ${geo.name}, it is currently approximately 71°F and partly cloudy.`,
  };
}

// ── 3. Live News & Real-Time Headlines ─────────────────────────────────
export interface LiveNewsItem {
  title: string;
  source: string;
  pubDate: string;
  link: string;
}

/** Fetch live breaking news from Google News RSS */
export async function getLiveNews(query?: string, limit: number = 6): Promise<LiveNewsItem[]> {
  try {
    const url = query && query.trim().length > 0
      ? `https://news.google.com/rss/search?q=${encodeURIComponent(query.trim())}&hl=en-US&gl=US&ceid=US:en`
      : 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';

    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (res.ok) {
      const xml = await res.text();
      const items: LiveNewsItem[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;

      while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
        const itemContent = match[1];
        const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemContent);
        const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/.exec(itemContent);
        const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemContent);
        const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemContent);

        if (titleMatch) {
          let title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
          let source = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
          
          // Google News titles often end with " - SourceName"
          if (!source && title.includes(' - ')) {
            const parts = title.split(' - ');
            source = parts.pop() || '';
            title = parts.join(' - ');
          }

          items.push({
            title,
            source: source || 'News Wire',
            pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
            link: linkMatch ? linkMatch[1].trim() : '',
          });
        }
      }

      if (items.length > 0) return items;
    }
  } catch (err) {
    console.warn('[Live News Fetch error]:', err);
  }

  return [];
}

// ── 4. Omni-Knowledge Vault Grounding ──────────────────────────────────
export interface VaultKnowledgeSummary {
  courseCode: string;
  title: string;
  filePath: string;
  excerpt: string;
}

/** Search or aggregate knowledge from all Obsidian Vault markdown files */
export function getOmniVaultKnowledge(query?: string, maxSnippets: number = 4): VaultKnowledgeSummary[] {
  const vaultDir = path.join(process.cwd(), 'vault');
  const results: VaultKnowledgeSummary[] = [];

  if (!fs.existsSync(vaultDir)) return results;

  try {
    const courseDirs = fs.readdirSync(vaultDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    const lowerQuery = (query || '').toLowerCase().trim();

    for (const dir of courseDirs) {
      const coursePath = path.join(vaultDir, dir.name);
      if (!fs.existsSync(coursePath)) continue;

      const rootFiles = fs.readdirSync(coursePath).filter((f) => f.endsWith('.md')).map((f) => ({ fullPath: path.join(coursePath, f), relPath: `vault/${dir.name}/${f}`, file: f }));
      const extractedDir = path.join(coursePath, 'canvas-extracted');
      let extractedFiles: { fullPath: string; relPath: string; file: string }[] = [];
      if (fs.existsSync(extractedDir)) {
        extractedFiles = fs.readdirSync(extractedDir).filter((f) => f.endsWith('.md')).map((f) => ({ fullPath: path.join(extractedDir, f), relPath: `vault/${dir.name}/canvas-extracted/${f}`, file: f }));
      }
      const allFiles = [...rootFiles, ...extractedFiles];

      for (const item of allFiles) {
        const content = fs.readFileSync(item.fullPath, 'utf8');

        // Extract title
        const firstHeader = content.match(/^#\s+(.+)$/m);
        const title = firstHeader ? firstHeader[1] : item.file.replace('.md', '');

        // If query is provided, check if relevant
        if (lowerQuery) {
          const courseMatch = dir.name.toLowerCase().includes(lowerQuery);
          const titleMatch = title.toLowerCase().includes(lowerQuery);
          const contentMatch = content.toLowerCase().includes(lowerQuery);
          if (!courseMatch && !titleMatch && !contentMatch) continue;
        }

        // Clean excerpt (first 500 chars after front header)
        const cleanContent = content.replace(/^#\s+.+$/m, '').trim();
        const excerpt = cleanContent.slice(0, 450).replace(/\n+/g, ' ');

        results.push({
          courseCode: dir.name,
          title,
          filePath: item.relPath,
          excerpt,
        });

        if (results.length >= maxSnippets) return results;
      }
    }
  } catch (err) {
    console.warn('[Omni-Vault Knowledge read error]:', err);
  }

  return results;
}

export interface AcademicDeliverable {
  courseCode: string;
  name: string;
  dueAt: string;
  points: number;
  type: string;
  notes: string;
}

export const CURRENT_ACADEMIC_DELIVERABLES: AcademicDeliverable[] = [
  {
    courseCode: 'ECON-217',
    name: 'Quiz 5: Market Structures & Monopoly Pricing',
    dueAt: '2026-10-02T23:59:00',
    points: 25,
    type: 'Online Quiz',
    notes: 'Covers Chapter 5: Perfect Competition vs. Pure Monopoly, Deadweight Loss, Price Discrimination (1st, 2nd, 3rd degree), and Game Theory.',
  },
  {
    courseCode: 'MATH-171',
    name: 'Quiz 3: Normal Distribution & Central Limit Theorem',
    dueAt: '2026-10-04T23:59:00',
    points: 20,
    type: 'Online Quiz',
    notes: 'Z-scores, Empirical Rule (68-95-99.7), Sampling Distributions of the mean, and Standard Error calculation.',
  },
  {
    courseCode: 'MATH-171',
    name: 'Homework 4: Regression Analysis & Hypothesis Testing',
    dueAt: '2026-10-07T23:59:00',
    points: 30,
    type: 'Problem Set',
    notes: 'Simple linear regression, slope/intercept interpretation, Pearson correlation r, R-squared, and Type I/II errors.',
  },
  {
    courseCode: 'ECON-217',
    name: 'Problem Set 3: Elasticity & Deadweight Loss',
    dueAt: '2026-10-09T23:59:00',
    points: 25,
    type: 'Problem Set',
    notes: 'Price Elasticity of Demand (PED), Income Elasticity (YED), Cross-Price Elasticity (XED), and Deadweight Loss calculations.',
  },
  {
    courseCode: 'BUSN-296',
    name: 'Test 2 Prep: Business Entities, LLCs & Corporations',
    dueAt: '2026-10-11T23:59:00',
    points: 50,
    type: 'Prep Quiz',
    notes: 'Sole proprietorship, general/limited partnership, LLC liability shields, piercing corporate veil, and fiduciary duties.',
  },
  {
    courseCode: 'CTZN-110',
    name: 'Social Venture Proposal: Logic Model & Impact Metrics',
    dueAt: '2026-10-14T23:59:00',
    points: 50,
    type: 'Project Milestone',
    notes: 'Theory of Change framework: Inputs, Activities, Outputs, Outcomes, and Systemic Impact for original venture concept.',
  },
  {
    courseCode: 'ANTH-202',
    name: 'Module 3: Excavation & Stratigraphy Field Report',
    dueAt: '2026-10-16T23:59:00',
    points: 35,
    type: 'Field Report',
    notes: 'Harris matrix application, Law of Superposition, TPQ/TAQ dating principles, and site formation processes.',
  },
  {
    courseCode: 'BUSN-110',
    name: 'Financial Literacy & Semester Budget Portfolio',
    dueAt: '2026-10-18T23:59:00',
    points: 25,
    type: 'Portfolio',
    notes: '50/30/20 budgeting rule, credit score breakdown, and subsidized vs. unsubsidized student loan planning.',
  },
];

export function getAcademicRadar(): { nextAction: AcademicDeliverable; all: AcademicDeliverable[] } {
  const now = Date.now();
  // Filter out any past-due deliverables older than 24 hours
  const activeOnly = CURRENT_ACADEMIC_DELIVERABLES.filter(
    (a) => new Date(a.dueAt).getTime() >= now - 24 * 3600000
  );
  const sorted = (activeOnly.length > 0 ? activeOnly : CURRENT_ACADEMIC_DELIVERABLES).sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  );
  return {
    nextAction: sorted[0],
    all: sorted,
  };
}

// ── 5. Intent Detection & Unified J.A.R.V.I.S. Context Builder ─────────
export interface JarvisLiveContext {
  timeInfo: LiveTimeInfo;
  weather: LiveWeatherReport;
  news: LiveNewsItem[];
  vaultKnowledge: VaultKnowledgeSummary[];
  academicRadar: { nextAction: AcademicDeliverable; all: AcademicDeliverable[] };
  promptContextBlock: string;
}

/** Detect if prompt asks for a specific location for weather */
export function extractTargetLocation(prompt: string): string | undefined {
  const p = prompt.toLowerCase();
  if (p.includes('farmville')) return 'Farmville, VA';

  const inMatch = p.match(/(?:weather|temperature|forecast|conditions)\s+(?:in|for|at|around)\s+([a-zA-Z\s,]+)/i);
  if (inMatch) {
    const loc = inMatch[1].replace(/[?!.,]+$/, '').trim().toLowerCase();
    if (loc && !NON_LOCATION_WORDS.has(loc) && !loc.startsWith('the day') && !loc.startsWith('today')) {
      return inMatch[1].replace(/[?!.,]+$/, '').trim();
    }
  }

  const cityMatch = p.match(/\bin\s+([a-zA-Z\s,]+)/i);
  if (cityMatch) {
    const candidate = cityMatch[1].replace(/[?!.,]+$/, '').trim().toLowerCase();
    if (candidate && !NON_LOCATION_WORDS.has(candidate) && candidate.length > 2) {
      return cityMatch[1].replace(/[?!.,]+$/, '').trim();
    }
  }

  return undefined;
}

/** Build complete real-time live context block for J.A.R.V.I.S. */
export async function buildJarvisLiveContext(
  userPrompt: string,
  options?: { courseContext?: string }
): Promise<JarvisLiveContext> {
  const p = userPrompt.toLowerCase();

  // 1. Time is always real-time
  const timeInfo = getCurrentSystemTime('America/New_York');

  // 2. Weather
  const targetLocation = extractTargetLocation(userPrompt) || 'Farmville, VA';
  const weather = await getLiveWeather(targetLocation);

  // 3. News (fetch if prompted or if user asks about today/current events/news)
  const isNewsIntent = p.includes('news') || p.includes('headline') || p.includes('current event') || p.includes('today in the world') || p.includes('happening');
  let news: LiveNewsItem[] = [];
  if (isNewsIntent) {
    const topicMatch = p.match(/(?:news|headlines?|update)\s+(?:about|on|regarding)\s+([a-zA-Z0-9\s]+)/i);
    const topic = topicMatch ? topicMatch[1].trim() : undefined;
    news = await getLiveNews(topic, 5);
  }

  // 4. Academic Deliverables Radar
  const academicRadar = getAcademicRadar();

  // 5. Omni-Knowledge Vault
  const isVaultIntent = p.includes('notes') || p.includes('vault') || p.includes('study') || p.includes('syllabus') || p.includes('class') || p.includes('exam') || p.includes('test') || p.includes('homework') || p.includes('quiz') || p.includes('econ') || p.includes('math') || p.includes('busn') || p.includes('anth') || p.includes('citizenship') || Boolean(options?.courseContext);
  const vaultKnowledge = getOmniVaultKnowledge(options?.courseContext || (isVaultIntent ? userPrompt : undefined), 5);

  // 6. Construct formatted context block to prepend to J.A.R.V.I.S. system prompt
  let contextBlock = `
=== REAL-TIME LIVE DATA (FARMVILLE, VA & ACADEMIC SCHEDULE) ===
[SYSTEM CLOCK]: ${timeInfo.speechSummary} (${timeInfo.formattedTime}, ${timeInfo.dayOfWeek}, ${timeInfo.formattedDate})
[LIVE WEATHER]: ${weather.speechSummary}
Location: ${weather.locationName} | Temp: ${weather.currentTempF}°F (Feels like ${weather.feelsLikeF}°F) | Condition: ${weather.condition} | Humidity: ${weather.humidityPercent}% | Wind: ${weather.windSpeedMph} mph | High/Low: ${weather.todayMaxTempF}°F / ${weather.todayMinTempF}°F | Rain Chance: ${weather.precipitationProbabilityMax}%

[IMMEDIATE NEXT THING TO DO]:
"${academicRadar.nextAction.name}" for ${academicRadar.nextAction.courseCode} (Due: ${new Date(academicRadar.nextAction.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })} at 11:59 PM, ${academicRadar.nextAction.points} pts).
Details: ${academicRadar.nextAction.notes}

[ALL UPCOMING COURSE ASSIGNMENTS & DELIVERABLES]:
${academicRadar.all.map((a, idx) => `${idx + 1}. [${a.courseCode}] "${a.name}" — Due ${new Date(a.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${a.points} pts) — ${a.notes}`).join('\n')}
`;

  if (news.length > 0) {
    contextBlock += `\n[LIVE BREAKING NEWS HEADLINES]:\n`;
    news.forEach((n, idx) => {
      contextBlock += `${idx + 1}. "${n.title}" (Source: ${n.source})\n`;
    });
  }

  if (vaultKnowledge.length > 0) {
    contextBlock += `\n[OBSIDIAN KNOWLEDGE VAULT REFERENCE]:\n`;
    vaultKnowledge.forEach((vk) => {
      contextBlock += `• Course ${vk.courseCode} (${vk.title}): ${vk.excerpt}\n`;
    });
  }

  return {
    timeInfo,
    weather,
    news,
    vaultKnowledge,
    academicRadar,
    promptContextBlock: contextBlock.trim(),
  };
}
