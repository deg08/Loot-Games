export const PROFILE_SCHEMA_VERSION = 1;

export function createDefaultProfile() {
  return {
    version:PROFILE_SCHEMA_VERSION,
    bestScore:0,
    coins:0,
    unlockedLevel:1,
    levels:{}
  };
}

const safeInteger = (value,fallback=0) => Number.isFinite(Number(value))
  ? Math.max(0,Math.floor(Number(value)))
  : fallback;

export function normalizeProfile(value,maxLevel=15) {
  const source = value && typeof value === 'object' ? value : {};
  const normalized = createDefaultProfile();
  normalized.bestScore = safeInteger(source.bestScore);
  normalized.coins = safeInteger(source.coins);
  normalized.unlockedLevel = Math.max(1,Math.min(maxLevel,safeInteger(source.unlockedLevel,1)));

  if (source.levels && typeof source.levels === 'object') {
    for (const [key,entry] of Object.entries(source.levels)) {
      const id = safeInteger(key);
      if (id < 1 || id > maxLevel || !entry || typeof entry !== 'object') continue;
      normalized.levels[id] = {
        stars:Math.min(3,safeInteger(entry.stars)),
        bestScore:safeInteger(entry.bestScore),
        completions:safeInteger(entry.completions)
      };
    }
  }

  return normalized;
}

export function completeProfileLevel(profile,{levelId,stars,score,maxLevel}) {
  const next = normalizeProfile(profile,maxLevel);
  const previous = next.levels[levelId] || {stars:0,bestScore:0,completions:0};
  const earnedStars = Math.max(1,Math.min(3,safeInteger(stars,1)));
  const firstCompletionBonus = previous.completions === 0 ? 25 : 0;
  const improvedStars = Math.max(0,earnedStars - previous.stars);

  next.levels[levelId] = {
    stars:Math.max(previous.stars,earnedStars),
    bestScore:Math.max(previous.bestScore,safeInteger(score)),
    completions:previous.completions + 1
  };
  next.bestScore = Math.max(next.bestScore,safeInteger(score));
  next.coins += firstCompletionBonus + improvedStars * 25;
  next.unlockedLevel = Math.max(next.unlockedLevel,Math.min(maxLevel,levelId + 1));

  return {
    profile:next,
    coinsEarned:firstCompletionBonus + improvedStars * 25
  };
}

export function profileStarTotal(profile) {
  return Object.values(profile.levels || {}).reduce((sum,entry) => sum + safeInteger(entry?.stars),0);
}
