// AI Matching Logic for Lost & Found Items

/**
 * Find potential matches between a found item and lost items
 * @param {Object} foundItem - The found item to match
 * @param {Array} lostItems - Array of lost items to match against
 * @returns {Array} Array of matches with scores
 */
export async function findMatches(foundItem, lostItems) {
  if (!foundItem || !lostItems || lostItems.length === 0) {
    return [];
  }

  const matches = [];

  for (const lostItem of lostItems) {
    const score = calculateMatchScore(foundItem, lostItem);
    
    if (score >= 0.5) { // 50% threshold
      matches.push({
        lostItem,
        score,
        reasoning: generateReasoning(foundItem, lostItem, score),
        breakdown: getScoreBreakdown(foundItem, lostItem),
      });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches;
}

/**
 * Calculate match score between found and lost items
 */
function calculateMatchScore(foundItem, lostItem) {
  let score = 0;
  let factors = 0;

  // Category match (most important)
  if (foundItem.category?.toLowerCase() === lostItem.category?.toLowerCase()) {
    score += 0.4;
  }
  factors++;

  // Location proximity
  if (foundItem.found_location && lostItem.last_seen_location) {
    const locationScore = compareLocations(
      foundItem.found_location,
      lostItem.last_seen_location
    );
    score += locationScore * 0.2;
  }
  factors++;

  // Time proximity (within 7 days)
  if (foundItem.created_at && lostItem.last_seen_date) {
    const timeScore = compareTimestamps(
      foundItem.created_at,
      lostItem.last_seen_date
    );
    score += timeScore * 0.1;
  }
  factors++;

  // Field matching (brand, color, model, etc.)
  const fieldScore = compareFields(foundItem, lostItem);
  score += fieldScore * 0.3;
  factors++;

  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Compare location strings
 */
function compareLocations(loc1, loc2) {
  if (!loc1 || !loc2) return 0;
  
  const l1 = loc1.toLowerCase().trim();
  const l2 = loc2.toLowerCase().trim();
  
  // Exact match
  if (l1 === l2) return 1.0;
  
  // Partial match
  if (l1.includes(l2) || l2.includes(l1)) return 0.7;
  
  // Check for common keywords
  const keywords1 = l1.split(/\s+/);
  const keywords2 = l2.split(/\s+/);
  const commonKeywords = keywords1.filter(k => keywords2.includes(k));
  
  if (commonKeywords.length > 0) {
    return 0.5 * (commonKeywords.length / Math.max(keywords1.length, keywords2.length));
  }
  
  return 0;
}

/**
 * Compare timestamps
 */
function compareTimestamps(ts1, ts2) {
  if (!ts1 || !ts2) return 0;
  
  const date1 = new Date(ts1);
  const date2 = new Date(ts2);
  const diffDays = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
  
  if (diffDays <= 1) return 1.0;
  if (diffDays <= 3) return 0.7;
  if (diffDays <= 7) return 0.5;
  return 0.2;
}

/**
 * Compare item fields (brand, color, model, etc.)
 */
function compareFields(item1, item2) {
  const fieldsToCompare = [
    'brand', 'model', 'color', 'size', 'type',
    'id_type', 'key_type', 'bag_type', 'item_type'
  ];
  
  let matches = 0;
  let total = 0;
  
  for (const field of fieldsToCompare) {
    if (item1[field] && item2[field]) {
      total++;
      const val1 = String(item1[field]).toLowerCase().trim();
      const val2 = String(item2[field]).toLowerCase().trim();
      
      if (val1 === val2) {
        matches++;
      } else if (val1.includes(val2) || val2.includes(val1)) {
        matches += 0.5;
      }
    }
  }
  
  return total > 0 ? matches / total : 0;
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(foundItem, lostItem, score) {
  const reasons = [];
  
  if (foundItem.category === lostItem.category) {
    reasons.push(`Same category: ${foundItem.category}`);
  }
  
  if (foundItem.found_location && lostItem.last_seen_location) {
    const locScore = compareLocations(foundItem.found_location, lostItem.last_seen_location);
    if (locScore > 0.5) {
      reasons.push(`Similar location: ${foundItem.found_location}`);
    }
  }
  
  // Check matching fields
  const matchingFields = [];
  const fields = ['brand', 'color', 'model'];
  for (const field of fields) {
    if (foundItem[field] && lostItem[field]) {
      const val1 = String(foundItem[field]).toLowerCase();
      const val2 = String(lostItem[field]).toLowerCase();
      if (val1 === val2 || val1.includes(val2) || val2.includes(val1)) {
        matchingFields.push(field);
      }
    }
  }
  
  if (matchingFields.length > 0) {
    reasons.push(`Matching: ${matchingFields.join(', ')}`);
  }
  
  return reasons.join(' • ') || 'Potential match based on category and timing';
}

/**
 * Get detailed score breakdown
 */
function getScoreBreakdown(foundItem, lostItem) {
  return {
    category: foundItem.category === lostItem.category ? 1.0 : 0,
    location: compareLocations(foundItem.found_location, lostItem.last_seen_location),
    timing: compareTimestamps(foundItem.created_at, lostItem.last_seen_date),
    fields: compareFields(foundItem, lostItem),
  };
}
