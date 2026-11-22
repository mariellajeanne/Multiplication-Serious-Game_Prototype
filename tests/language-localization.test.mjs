import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');
function language(stored){
 const context=vm.createContext({document:{documentElement:{lang:'en'}},localStorage:{getItem:()=>stored,setItem(){}}});
 vm.runInContext(read('src/ui/language.js'),context,{filename:'src/ui/language.js'});
 return {t:text=>vm.runInContext(`uiText(${JSON.stringify(text)})`,context),entries:vm.runInContext('Object.entries(TAGALOG_UI)',context)};
}
const tl=language('tl'),en=language('en');

// Procedure guidance players read while multiplying, with the source that shows it.
const procedure={
 'worksheet/src/worksheet-render-and-tutorial.js':['Connect these two digits.','Now touch the other digit.','Tap to see the product.','Bring the carry into the ones.','Put the ones digit here.','Lift the tens to the carry shelf.','Place the last digit.','Swipe down to add the rows.','Carry selected. Add it to the product.','Add the waiting carry first.','Drag each digit, or tap a digit then its tile.','Undone.'],
 'worksheet/src/digit-entry.js':['This digit is waiting for the carry. Add it here on the sheet.','Move the written tens digit up to the carry row.','Add the waiting carry to the ones digit in the calculator or on the sheet.','Place the tens digit one column to the left.','That digit belongs in the carry row!','The tens digit belongs one column to the left.','Select an empty worksheet tile first.','Enter a digit, then press Enter.','Digit placed!','Try again!'],
 'worksheet/src/product-placement.js':['Try another place for this digit.','Select a current product digit.','Partial products ready.'],
 'worksheet/src/tap-and-drag.js':['That is not the digit holding the product ones.','Now tap the carry tile.','Carry must combine with the ones part of the product.','Carry must join the ones digit.'],
 'src/ui/worksheet-experience.js':['Connect the two digits first.','Tap the multiplication expression first.','Choose how to find the answer.','Drag a digit, or tap it and then its destination.','Add the carry now, or place the ones first.','Carry selected. Tap the ones digit here or on the sheet.','Enter the full answer, then press Enter.'],
 'src/ui/worksheet-drag.js':['Add the waiting carry','Place the digits','Drag the carry onto the placed ones.','Bring the carry to the ones digit.','Drag the ones digit to its column.','Drag the tens digit one column left.','Lift the tens digit into the carry shelf.','Drag the tens digit into the carry shelf.'],
 'src/ui/worksheet-observation.js':['Add the partial products','Connect the operand digits','Generate the product','Apply the waiting carry','Place the ones digit','Place the remaining digit'],
 'src/ui/game-tour-v18.js':['Solve an Order','Earn Coins','Buy a Package','Unbox a Food','Add Food to Your Menu','Boost Coins with Equipped Food','Skip Tutorial'],
 'src/network/help-requests.js':['Calling a Baker…','Waiting for Baker to confirm…','Help request declined.','Your Co-Baker left. You can keep practicing!','Already being helped! Another Baker accepted.']
};

test('worksheet, carrying, tutorial and Co-Baker guidance is translated where it is shown',()=>{
 for(const [file,phrases] of Object.entries(procedure)){
  const source=read(file);
  for(const phrase of phrases){
   assert.ok(source.includes(phrase),`${file} no longer shows "${phrase}"; update the dictionary key`);
   assert.notEqual(tl.t(phrase),phrase,`untranslated: ${phrase}`);
   assert.equal(en.t(phrase),phrase);
  }
 }
});

test('English mode is unchanged for every dictionary entry',()=>{
 for(const [english] of tl.entries)assert.equal(en.t(english),english);
});

test('protected names stay exact, including inside translated sentences',()=>{
 const names=["My Panaderya","Baker's Boost",'Co-Baker','Gift Package','Divine Package','Gift','Surprise','Mystery','Secret','Enchanted','Mythical','Cosmic','Divine',
  'Classic','Favorite','Special','Premium','Deluxe','Signature','Masterpiece','Crown Jewel','Coin Stack','Golden Vault','Divine Treasury','Pandesal','Ensaymada',
  'Brazo de Mercedes','Snack Order','Royal Order','Food Index','Food Inventory','Equip','Sell','Equip Best','Auto Equip','Normal'];
 for(const name of names)assert.equal(tl.t(name),name,name);
 for(const term of ["Baker's Boost",'Co-Baker','Food Index','Food Inventory','Package Counter','Permanent Luck','Recipe Mastery','Auto Equip'])
  for(const [english,tagalog] of tl.entries)if(english.includes(term))assert.ok(tagalog.includes(term),`"${term}" lost in: ${tagalog}`);
});

test('dynamic messages keep numbers, names and digit positions',()=>{
 assert.equal(tl.t('Put 7 in the tens column.'),'Ilagay ang 7 sa tens column.');
 assert.equal(tl.t('Put 1 in the carry tile above 9.'),'Ilagay ang 1 sa kahon ng carry sa itaas ng 9.');
 assert.equal(tl.t('Move carry 2 onto the ones digit 4 to make 6.'),'Ilipat ang carry na 2 sa ones digit na 4 para maging 6.');
 assert.equal(tl.t('Check the hundreds column!'),'Tingnan ulit ang hundreds column!');
 assert.equal(tl.t('3 / 4 pairs placed'),'3 / 4 pares ang nailagay');
 assert.equal(tl.t('Need 1,250 more coins for a menu slot.'),'Kulang ka pa ng 1,250 coins para sa menu slot.');
 assert.equal(tl.t('Open 5 Divine packages for 1.2M coins'),'Buksan ang 5 Divine package sa halagang 1.2M coins');
 assert.equal(tl.t('Start Picnic Order, Pandesal, 93 × 35, 0% complete, Coin Jar'),'Simulan ang Picnic Order, Pandesal, 93 × 35, 0% tapos, Coin Jar');
 assert.equal(tl.t('Ana #1234 needs help!'),'Humihingi ng tulong si Ana #1234!');
 assert.equal(tl.t('Co-Baker · Available'),'Co-Baker · Available');
 assert.equal(tl.t('Monay, 1 stars Classic, +1 Mastery available'),'Monay, 1-star Classic, +1 Mastery na puwedeng bilhin');
 assert.equal(tl.t('Task 2 of 6; 1 completed'),'Gawain 2 sa 6; 1 ang tapos na');
 assert.equal(tl.t('Play Orders'),'Maglaro ng Order');
 assert.equal(tl.t('Play Custom'),'Play Custom','unknown mode names are not guessed');
});

test('Tagalog wording follows the glossary',()=>{
 for(const [english,tagalog] of tl.entries){
  assert.doesNotMatch(tagalog,/\b(mga|ng) coin\b(?! reward)/i,`use "coins": ${tagalog}`);
  assert.doesNotMatch(tagalog,/\btile\b/i,`use "kahon" for worksheet tiles: ${tagalog}`);
  assert.doesNotMatch(tagalog,/\$\{|undefined/,english);
 }
});
