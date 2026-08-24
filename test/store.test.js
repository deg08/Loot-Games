import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultProfile } from '../src/core/profile.js';
import { buyBooster, consumeBooster, fulfillPurchase, recordPendingPurchase, recoverPendingPurchases } from '../src/core/store.js';

test('boosters can be bought with coins and consumed once',() => {
  const bought = buyBooster(createDefaultProfile(),'shuffle');
  assert.equal(bought.ok,true);
  assert.equal(bought.profile.coins,45);
  assert.equal(bought.profile.inventory.shuffle,2);
  const used = consumeBooster(bought.profile,'shuffle');
  assert.equal(used.ok,true);
  assert.equal(used.profile.inventory.shuffle,1);
});

test('booster purchase fails without enough coins',() => {
  const profile = createDefaultProfile();
  profile.coins = 0;
  const result = buyBooster(profile,'rainbow');
  assert.equal(result.ok,false);
  assert.equal(result.reason,'not_enough_coins');
});

test('purchase fulfillment is idempotent',() => {
  const pending = recordPendingPurchase(createDefaultProfile(),{transactionId:'tx-1',productId:'coins_250',createdAt:1});
  const first = fulfillPurchase(pending.profile,'tx-1');
  assert.equal(first.ok,true);
  assert.equal(first.profile.coins,350);
  const duplicate = fulfillPurchase(first.profile,'tx-1');
  assert.equal(duplicate.duplicate,true);
  assert.equal(duplicate.profile.coins,350);
});

test('non-consumable purchases cannot be granted twice',() => {
  const pending = recordPendingPurchase(createDefaultProfile(),{transactionId:'bundle-1',productId:'starter_bundle'});
  const first = fulfillPurchase(pending.profile,'bundle-1');
  assert.equal(first.profile.entitlements.starter_bundle,true);
  const second = recordPendingPurchase(first.profile,{transactionId:'bundle-2',productId:'starter_bundle'});
  assert.equal(second.ok,false);
  assert.equal(second.reason,'already_owned');
});

test('pending purchases are recovered after interrupted sessions',() => {
  const pending = recordPendingPurchase(createDefaultProfile(),{transactionId:'restore-1',productId:'coins_700'});
  const recovered = recoverPendingPurchases(pending.profile);
  assert.deepEqual(recovered.recovered,['restore-1']);
  assert.equal(recovered.profile.coins,800);
});
