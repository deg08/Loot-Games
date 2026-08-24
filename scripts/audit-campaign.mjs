import { CHAPTERS, LEVELS, campaignEstimatedMinutes, validateLevel } from '../src/config/levels.js';

const invalid = LEVELS.flatMap(level => validateLevel(level).map(error => ({level:level.id,error})));
if (invalid.length) {
  console.error(invalid);
  process.exitCode = 1;
} else {
  const minutes = campaignEstimatedMinutes();
  const hours = (minutes / 60).toFixed(1);
  const types = Object.groupBy(LEVELS,level => level.type);
  console.log(`Campaign: ${LEVELS.length} levels, ${CHAPTERS.length} chapters, ~${hours} hours`);
  console.log(Object.fromEntries(Object.entries(types).map(([type,levels]) => [type,levels.length])));
}
