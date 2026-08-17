const BEST_KEY = 'fruit10-best';
const PROFILE_KEY = 'fruit10-profile';

function readJson(storage,key) {
  try {
    return JSON.parse(storage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

export function createBrowserPlatform(storage=window.localStorage) {
  return {
    id:'browser',
    loadBest() {
      return Number(storage.getItem(BEST_KEY) || 0);
    },
    saveBest(value) {
      storage.setItem(BEST_KEY,String(value));
    },
    loadProfile() {
      return readJson(storage,PROFILE_KEY);
    },
    saveProfile(profile) {
      storage.setItem(PROFILE_KEY,JSON.stringify(profile));
    },
    track(name,properties) {
      const event = {event:name,...properties};
      window.dataLayer?.push(event);
      window.dispatchEvent(new CustomEvent('fruit10:analytics',{detail:event}));
      if (new URLSearchParams(location.search).has('debug')) console.info('[analytics]',event);
    },
    async ready() {},
    gameplayStart() {},
    gameplayStop() {}
  };
}
