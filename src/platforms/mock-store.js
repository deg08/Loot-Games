export function createMockPurchaseAdapter(idFactory=() => crypto.randomUUID()) {
  return {
    id:'mock-store',
    async purchase(productId) {
      await new Promise(resolve => setTimeout(resolve,250));
      return {transactionId:`test-${idFactory()}`,productId,createdAt:Date.now()};
    },
    async pending() {
      return [];
    }
  };
}
