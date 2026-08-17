const SESSION_ID = crypto.randomUUID();

export function createAnalytics(platform) {
  return {
    track(name,properties={}) {
      platform.track?.(name,{
        sessionId:SESSION_ID,
        timestamp:Date.now(),
        ...properties
      });
    }
  };
}
