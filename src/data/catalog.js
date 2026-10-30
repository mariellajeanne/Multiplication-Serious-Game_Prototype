/* Panaderya Quest — src/data/catalog.js
 * Modularized from the original playable prototype.
 * Loaded as classic scripts in index.html, in dependency order.
 */
const $=id=>document.getElementById(id);const fmt=n=>Math.floor(n).toLocaleString('en-US');const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));const pick=a=>a[Math.floor(Math.random()*a.length)];const RARITIES=['Common','Uncommon','Rare','Epic','Legendary','Divine'];
const FOOD=[
{id:'pandesal',name:'Pandesal',icon:'🥖',rarity:0,base:1.2,ingredients:['Flour','Yeast']},
{id:'monay',name:'Monay',icon:'🍞',rarity:0,base:1.45,ingredients:['Flour','Butter']},
{id:'kababayan',name:'Kababayan',icon:'🧁',rarity:0,base:1.65,ingredients:['Flour','Eggs']},
{id:'pan-de-coco',name:'Pan de Coco',icon:'🥥',rarity:1,base:2.2,ingredients:['Coconut','Flour']},
{id:'spanish-bread',name:'Spanish Bread',icon:'🥐',rarity:1,base:2.5,ingredients:['Butter','Brown Sugar']},
{id:'cheese-bread',name:'Cheese Bread',icon:'🧀',rarity:1,base:2.8,ingredients:['Cheese','Flour']},
{id:'kalihim',name:'Kalihim (Pan de Regla)',icon:'🍥',rarity:2,base:3.9,ingredients:['Brown Sugar','Butter']},
{id:'ensaymada',name:'Ensaymada',icon:'🥯',rarity:2,base:4.4,ingredients:['Cheese','Butter']},
{id:'hopia',name:'Hopia',icon:'🥮',rarity:2,base:5.1,ingredients:['Mung Bean','Flour']},
{id:'mamon',name:'Mamon',icon:'🍰',rarity:3,base:7.4,ingredients:['Eggs','Butter']},
{id:'pianono',name:'Pianono',icon:'🍥',rarity:3,base:8.0,ingredients:['Eggs','Vanilla']},
{id:'ube-pandesal',name:'Ube Cheese Pandesal',icon:'💜',rarity:3,base:9.2,ingredients:['Ube','Cheese']},
{id:'buko-pie',name:'Buko Pie',icon:'🥧',rarity:4,base:14.0,ingredients:['Coconut','Butter']},
{id:'brazo',name:'Brazo de Mercedes',icon:'🍮',rarity:4,base:17.2,ingredients:['Eggs','Vanilla']},
{id:'ube-ensaymada',name:'Special Ube Ensaymada',icon:'✨',rarity:5,base:27,ingredients:['Ube','Cheese']}];
const INGREDIENTS=[['Flour','🌾',18],['Yeast','🫧',24],['Butter','🧈',40],['Eggs','🥚',38],['Brown Sugar','🍯',52],['Coconut','🥥',65],['Cheese','🧀',90],['Mung Bean','🫘',98],['Vanilla','🌼',145],['Ube','💜',210]];
const KITCHEN=[{id:'oven',name:'Oven',icon:'🔥',bonus:0.055},{id:'mixer',name:'Mixer',icon:'🥣',bonus:0.042},{id:'fridge',name:'Refrigerator',icon:'🧊',bonus:0.033},{id:'display',name:'Display Cabinet',icon:'🪟',bonus:0.028}];
const MODE=[{id:'normal',name:'Normal',icon:'✏️',unlock:0,desc:'Learn at your own pace. Unlimited retries.',base:1},{id:'lookup',name:'Lookup',icon:'🔢',unlock:0,desc:'Multiplication table available whenever needed.',base:1},{id:'blindfold',name:'Blindfold',icon:'🙈',unlock:3,desc:'Recall products before placing digits.',base:1.5},{id:'streak',name:'Streak',icon:'🔥',unlock:4,desc:'Chain correct combos for a rising bonus.',base:1.2},{id:'bullseye',name:'Bullseye',icon:'🎯',unlock:5,desc:'Finish accurately to maximize your payout.',base:2.5},{id:'survival',name:'Survival',icon:'❤️',unlock:6,desc:'Limited lives, higher payouts with fewer lives.',base:2.6}];
const BASIC_TUTORIAL=[{emoji:'🥖',title:'Welcome to Panaderya Quest!',text:'Help grow a Filipino bakery by solving long multiplication tickets. Every ticket earns coins, and lucky combos can drop surprise packages.'},{emoji:'🔢',title:'Multiply one pair at a time',text:'Follow the animated arrows: connect the bottom multiplier digit to the top multiplicand digit, then tap the M × N bubble to reveal the digit tiles.'},{emoji:'🧩',title:'Place digits and handle carries',text:'In the worksheet, tap or drag the floating digit into its destination, move carries upward, and tap a previous carry to merge it. Swipe down to add partial-product rows.'},{emoji:'🏆',title:'Build your prize pool!',text:'Correct actions send coins into the prize pool and improve temporary Luck. Complete the final sum to collect your coins and reveal any packages.'},{emoji:'🍰',title:'Grow your bakery',text:'Use coins to level up foods, find Filipino pastries from packages, and later unlock fusion, kitchenware, decorations, staff, and challenge modes.'}];
