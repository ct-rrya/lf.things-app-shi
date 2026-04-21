// AI Matching Logic for Lost & Found Items
// Uses Groq API via fetch (compatible with React Native / Hermes)

import Constants from 'expo-constants';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroq(messages) {
  const apiKey = Constants.expoConfig?.extra?.groqApiKey || process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey) throw new Error('No Groq API key');

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages,
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const json = await res.json();
  return json.choices[0]?.message?.content?.trim();
}

/**
 * Find potential matches between a found item and lost items using AI
 * @param {Object} foundItem - The found item to match
 * @param {Array} lostItems - Array of lost items to match against
 * @returns {Array} Array of matches with scores
 */
export async function findMatches(foundItem, lostItems) {
  if (!foundItem || !lostItems || lostItems.length === 0) return [];

  try {
    return await findMatchesWithAI(foundItem, lostItems);
  } catch (err) {
    console.warn('AI matching failed, falling back to rule-based:', err.message);
    return findMatchesRuleBased(foundItem, lostItems);
  }
}

// ── AI-powered matching ──────────────────────────────────────────

async function findMatchesWithAI(foundItem, lostItems) {
  const prompt = buildPrompt(foundItem, lostItems);

  const raw = await callGroq([
    {
      role: 'system',
      content:
        'You are a lost and found matching assistant. Given a found item and a list of lost items, return a JSON array of matches. Each match must have: lost_item_index (number), score (0.0-1.0), reasoning (string). Only include items with score >= 0.5. Return ONLY valid JSON, no explanation.',
    },
    { role: 'user', content: prompt },
  ]);
  const parsed = JSON.parse(raw);

  return parsed
    .filter((m) => m.score >= 0.4)
    .map((m) => ({
      lostItem: lostItems[m.lost_item_index],
      score: m.score,
      reasoning: m.reasoning,
      breakdown: getScoreBreakdown(foundItem, lostItems[m.lost_item_index]),
    }))
    .filter((m) => m.lostItem != null)
    .sort((a, b) => b.score - a.score);
}

function buildPrompt(foundItem, lostItems) {
  const found = {
    category: foundItem.category,
    location: foundItem.found_location,
    date: foundItem.created_at,
    brand: foundItem.brand,
    color: foundItem.color,
    model: foundItem.model,
    description: foundItem.description,
  };

  const lost = lostItems.map((item, i) => ({
    index: i,
    category: item.category,
    last_seen_location: item.last_seen_location,
    last_seen_date: item.last_seen_date,
    brand: item.brand,
    color: item.color,
    model: item.model,
    description: item.description,
  }));

  return `Found item: ${JSON.stringify(found)}\n\nLost items: ${JSON.stringify(lost)}`;
}

// ── Rule-based fallback ──────────────────────────────────────────

function findMatchesRuleBased(foundItem, lostItems) {
  console.log(`Rule-based matching: found item category="${foundItem.category}", checking ${lostItems.length} lost items`);
  return lostItems
    .map((lostItem) => {
      const score = calculateMatchScore(foundItem, lostItem);
      console.log(`  → Lost item "${lostItem.name}" (${lostItem.category}): score=${score.toFixed(2)}`);
      if (score < 0.4) return null;
      return {
        lostItem,
        score,
        reasoning: generateReasoning(foundItem, lostItem),
        breakdown: getScoreBreakdown(foundItem, lostItem),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

function calculateMatchScore(foundItem, lostItem) {
  let score = 0;

  if (foundItem.category?.toLowerCase() === lostItem.category?.toLowerCase()) score += 0.4;

  score += compareLocations(foundItem.found_location, lostItem.last_seen_location) * 0.2;
  score += compareTimestamps(foundItem.created_at, lostItem.last_seen_date) * 0.1;
  score += compareFields(foundItem, lostItem) * 0.3;

  return Math.min(score, 1.0);
}

function compareLocations(loc1, loc2) {
  if (!loc1 || !loc2) return 0;
  const l1 = loc1.toLowerCase().trim();
  const l2 = loc2.toLowerCase().trim();
  if (l1 === l2) return 1.0;
  if (l1.includes(l2) || l2.includes(l1)) return 0.7;
  const kw1 = l1.split(/\s+/);
  const kw2 = l2.split(/\s+/);
  const common = kw1.filter((k) => kw2.includes(k));
  return common.length > 0 ? 0.5 * (common.length / Math.max(kw1.length, kw2.length)) : 0;
}

function compareTimestamps(ts1, ts2) {
  if (!ts1 || !ts2) return 0;
  const diffDays = Math.abs(new Date(ts1) - new Date(ts2)) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) return 1.0;
  if (diffDays <= 3) return 0.7;
  if (diffDays <= 7) return 0.5;
  return 0.2;
}

function compareFields(item1, item2) {
  const fields = ['brand', 'model', 'color', 'size', 'type', 'id_type', 'key_type', 'bag_type', 'item_type'];
  let matches = 0;
  let total = 0;
  for (const field of fields) {
    if (item1[field] && item2[field]) {
      total++;
      const v1 = String(item1[field]).toLowerCase().trim();
      const v2 = String(item2[field]).toLowerCase().trim();
      if (v1 === v2) matches++;
      else if (v1.includes(v2) || v2.includes(v1)) matches += 0.5;
    }
  }
  return total > 0 ? matches / total : 0;
}

function generateReasoning(foundItem, lostItem) {
  const reasons = [];
  if (foundItem.category === lostItem.category) reasons.push(`Same category: ${foundItem.category}`);
  if (compareLocations(foundItem.found_location, lostItem.last_seen_location) > 0.5)
    reasons.push(`Similar location: ${foundItem.found_location}`);
  const matchingFields = ['brand', 'color', 'model'].filter((f) => {
    if (!foundItem[f] || !lostItem[f]) return false;
    const v1 = String(foundItem[f]).toLowerCase();
    const v2 = String(lostItem[f]).toLowerCase();
    return v1 === v2 || v1.includes(v2) || v2.includes(v1);
  });
  if (matchingFields.length > 0) reasons.push(`Matching: ${matchingFields.join(', ')}`);
  return reasons.join(' • ') || 'Potential match based on category and timing';
}

function getScoreBreakdown(foundItem, lostItem) {
  return {
    category: foundItem.category === lostItem.category ? 1.0 : 0,
    location: compareLocations(foundItem.found_location, lostItem.last_seen_location),
    timing: compareTimestamps(foundItem.created_at, lostItem.last_seen_date),
    fields: compareFields(foundItem, lostItem),
  };
}
