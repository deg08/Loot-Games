export const BOOSTER_CATALOG = Object.freeze([
  Object.freeze({id:'extra_moves',title:'+5 ходов',emoji:'➕',description:'Добавляет пять ходов',coinPrice:90}),
  Object.freeze({id:'shuffle',title:'Перемешать',emoji:'🔀',description:'Перемешивает все свободные фрукты',coinPrice:55}),
  Object.freeze({id:'rainbow',title:'Радужный фрукт',emoji:'🌈',description:'Создаёт фрукт, подходящий к любой сумме',coinPrice:80}),
  Object.freeze({id:'hammer',title:'Молоток',emoji:'🔨',description:'Наносит один удар выбранной преграде',coinPrice:65})
]);

export const PURCHASE_CATALOG = Object.freeze([
  Object.freeze({id:'coins_250',title:'Горсть монет',emoji:'🪙',kind:'consumable',testPrice:'49 ₽',grant:{coins:250}}),
  Object.freeze({id:'coins_700',title:'Корзина монет',emoji:'🧺',kind:'consumable',testPrice:'99 ₽',grant:{coins:700}}),
  Object.freeze({id:'starter_bundle',title:'Набор садовника',emoji:'🎒',kind:'non_consumable',testPrice:'149 ₽',grant:{coins:500,inventory:{extra_moves:3,shuffle:3,rainbow:2,hammer:3}}}),
  Object.freeze({id:'remove_ads',title:'Без рекламы',emoji:'🛡️',kind:'non_consumable',testPrice:'199 ₽',grant:{entitlement:'remove_ads'}})
]);

export const boosterById = id => BOOSTER_CATALOG.find(item => item.id === id);
export const purchaseById = id => PURCHASE_CATALOG.find(item => item.id === id);
