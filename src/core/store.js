import { boosterById, purchaseById } from '../config/products.js';
import { appendEconomyLog, normalizeProfile } from './profile.js';

export function buyBooster(profile,boosterId,maxLevel=100) {
  const booster = boosterById(boosterId);
  const next = normalizeProfile(profile,maxLevel);
  if (!booster) return {ok:false,reason:'unknown_booster',profile:next};
  if (next.coins < booster.coinPrice) return {ok:false,reason:'not_enough_coins',profile:next};
  next.coins -= booster.coinPrice;
  next.inventory[boosterId] = (next.inventory[boosterId] || 0) + 1;
  appendEconomyLog(next,{kind:'booster_purchase',amount:-booster.coinPrice,boosterId});
  return {ok:true,profile:next};
}

export function consumeBooster(profile,boosterId,maxLevel=100) {
  const next = normalizeProfile(profile,maxLevel);
  if (!boosterById(boosterId)) return {ok:false,reason:'unknown_booster',profile:next};
  if ((next.inventory[boosterId] || 0) < 1) return {ok:false,reason:'empty_inventory',profile:next};
  next.inventory[boosterId]--;
  appendEconomyLog(next,{kind:'booster_used',amount:-1,boosterId});
  return {ok:true,profile:next};
}

export function recordPendingPurchase(profile,{transactionId,productId,createdAt=Date.now()},maxLevel=100) {
  const next = normalizeProfile(profile,maxLevel);
  const product = purchaseById(productId);
  if (!transactionId || !product) return {ok:false,reason:'invalid_transaction',profile:next};
  const existing = next.transactions[transactionId];
  if (existing) return {ok:true,duplicate:true,status:existing.status,profile:next};
  if (product.kind === 'non_consumable' && next.entitlements[productId]) {
    return {ok:false,reason:'already_owned',profile:next};
  }
  next.transactions[transactionId] = {transactionId,productId,status:'pending',createdAt};
  return {ok:true,duplicate:false,status:'pending',profile:next};
}

export function fulfillPurchase(profile,transactionId,maxLevel=100) {
  const next = normalizeProfile(profile,maxLevel);
  const transaction = next.transactions[transactionId];
  if (!transaction) return {ok:false,reason:'transaction_not_found',profile:next};
  if (transaction.status === 'fulfilled') return {ok:true,duplicate:true,profile:next,transaction};
  const product = purchaseById(transaction.productId);
  if (!product) return {ok:false,reason:'product_not_found',profile:next};

  if (product.kind === 'non_consumable' && next.entitlements[product.id]) {
    transaction.status = 'fulfilled';
    transaction.fulfilledAt = Date.now();
    return {ok:true,duplicate:true,profile:next,transaction};
  }

  next.coins += product.grant.coins || 0;
  for (const [boosterId,count] of Object.entries(product.grant.inventory || {})) {
    next.inventory[boosterId] = (next.inventory[boosterId] || 0) + count;
  }
  if (product.grant.entitlement) next.entitlements[product.grant.entitlement] = true;
  if (product.kind === 'non_consumable') next.entitlements[product.id] = true;
  transaction.status = 'fulfilled';
  transaction.fulfilledAt = Date.now();
  appendEconomyLog(next,{kind:'test_purchase',amount:product.grant.coins || 0,productId:product.id,transactionId});
  return {ok:true,duplicate:false,profile:next,transaction};
}

export function recoverPendingPurchases(profile,maxLevel=100) {
  let next = normalizeProfile(profile,maxLevel);
  const recovered = [];
  for (const transaction of Object.values(next.transactions)) {
    if (transaction.status !== 'pending') continue;
    const result = fulfillPurchase(next,transaction.transactionId,maxLevel);
    if (!result.ok) continue;
    next = result.profile;
    recovered.push(transaction.transactionId);
  }
  return {profile:next,recovered};
}
