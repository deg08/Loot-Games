export const PROFILE_SCHEMA_VERSION = 2;
export const BOOSTER_IDS = Object.freeze(['extra_moves','shuffle','rainbow','hammer']);

const safeInteger = (value,fallback=0) => Number.isFinite(Number(value))
  ? Math.max(0,Math.floor(Number(value)))
  : fallback;

export function createDefaultProfile() {
  return {
    version:PROFILE_SCHEMA_VERSION,
    bestScore:0,
    coins:100,
    unlockedLevel:1,
    levels:{},
    inventory:{extra_moves:1,shuffle:1,rainbow:1,hammer:1},
    entitlements:{},
    transactions:{},
    seenTutorials:{},
    economyLog:[]
  };
}

export function normalizeProfile(value,maxLevel=100) {
  if (!value || typeof value !== 'object') return createDefaultProfile();
  const source = value;
  const isLegacy = safeInteger(source.version) < PROFILE_SCHEMA_VERSION;
  const normalized = createDefaultProfile();
  normalized.bestScore = safeInteger(source.bestScore);
  normalized.coins = isLegacy ? Math.max(100,safeInteger(source.coins)) : safeInteger(source.coins);
  normalized.unlockedLevel = Math.max(1,Math.min(maxLevel,safeInteger(source.unlockedLevel,1)));
  normalized.inventory = Object.fromEntries(BOOSTER_IDS.map(id => [id,safeInteger(source.inventory?.[id],isLegacy ? 1 : 0)]));
  normalized.entitlements = source.entitlements && typeof source.entitlements === 'object'
    ? Object.fromEntries(Object.entries(source.entitlements).filter(([,owned]) => Boolean(owned)).map(([id]) => [id,true]))
    : {};
  normalized.seenTutorials = source.seenTutorials && typeof source.seenTutorials === 'object'
    ? Object.fromEntries(Object.entries(source.seenTutorials).filter(([,seen]) => Boolean(seen)).map(([id]) => [id,true]))
    : {};
  normalized.transactions = source.transactions && typeof source.transactions === 'object'
    ? structuredClone(source.transactions)
    : {};
  normalized.economyLog = Array.isArray(source.economyLog) ? source.economyLog.slice(-100) : [];

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
  const coinsEarned = firstCompletionBonus + improvedStars * 25;

  next.levels[levelId] = {
    stars:Math.max(previous.stars,earnedStars),
    bestScore:Math.max(previous.bestScore,safeInteger(score)),
    completions:previous.completions + 1
  };
  next.bestScore = Math.max(next.bestScore,safeInteger(score));
  next.coins += coinsEarned;
  next.unlockedLevel = Math.max(next.unlockedLevel,Math.min(maxLevel,levelId + 1));
  appendEconomyLog(next,{kind:'level_reward',amount:coinsEarned,levelId});

  return {profile:next,coinsEarned};
}

export function appendEconomyLog(profile,entry) {
  profile.economyLog = [...(profile.economyLog || []),{...entry,at:entry.at || Date.now()}].slice(-100);
  return profile;
}

export function markTutorialSeen(profile,tutorialId) {
  const next = normalizeProfile(profile);
  next.seenTutorials[tutorialId] = true;
  return next;
}

export function profileStarTotal(profile) {
  return Object.values(profile.levels || {}).reduce((sum,entry) => sum + safeInteger(entry?.stars),0);
}
