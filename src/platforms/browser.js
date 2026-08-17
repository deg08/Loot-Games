const BEST_KEY = 'fruit10-best';

export function createBrowserPlatform(storage=window.localStorage) {
  return {
    id:'browser',
    loadBest() {
      return Number(storage.getItem(BEST_KEY) || 0);
    },
    saveBest(value) {
      storage.setItem(BEST_KEY,String(value));
    },
    async ready() {},
    gameplayStart() {},
    gameplayStop() {}
  };
}
