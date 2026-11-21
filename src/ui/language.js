/* Bilingual player-facing instructions. Short familiar game terms stay English.
 * Keep the preference outside the progress save to avoid changing economy data,
 * co-baker revisions, migration signatures, or reset behavior. */
const PANADERYA_LANGUAGE_KEY='panaderyaQuestLanguage';
let panaderyaLanguage='en';
try{panaderyaLanguage=localStorage.getItem(PANADERYA_LANGUAGE_KEY)==='tl'?'tl':'en'}catch(_){/* Storage can be unavailable in private mode. */}
if(typeof document!=='undefined')document.documentElement.lang=panaderyaLanguage==='tl'?'tl':'en';
const TAGALOG_UI=Object.freeze({
 'Choose an order. Follow the golden trail.':'Pumili ng order. Sundan ang gintong gabay.',
 'Follow the golden trail.':'Sundan ang gintong gabay.',
 'Switch Guide ON for a hint.':'I-ON ang Guide para makakuha ng tulong.',
 'Choose an order':'Pumili ng order',
 'Tap a ticket to start or resume.':'I-tap ang ticket para magsimula o magpatuloy.',
 'Multiply, one pair at a time':'Mag-multiply nang paisa-isang pares',
 'Connect digits. Place products and carries.':'Pagdugtungin ang mga digit. Ilagay ang sagot at mga carry.',
 'Collect your coins':'Kunin ang iyong mga coin',
 'Finish the worksheet, then collect.':'Tapusin ang worksheet, saka kunin ang mga coin.',
 'Open packages. Equip foods.':'Magbukas ng package. Mag-equip ng pagkain.',
 "Grow your Baker's Boost.":"Palakihin ang iyong Baker's Boost.",
 'Worksheet tips':'Mga gabay sa worksheet',
 'Tap or drag between the digits.':'I-tap o i-drag mula sa isang digit papunta sa isa pa.',
 'Tap the × bubble to reveal product tiles.':'I-tap ang bilog na × para lumabas ang mga tile ng sagot.',
 'Swipe down to add the partial rows.':'Mag-swipe pababa para pagsamahin ang mga partial row.',
 'Save & Exit keeps your work.':'Gamitin ang Save & Exit para hindi mawala ang ginawa mo.',
 'For food fusion. Prices stay the same.':'Para sa pag-fuse ng mga pagkain. Hindi nagbabago ang presyo.',
 'Use ingredients for recipes':'Gamitin ang ingredients para sa mga recipe',
 'A 2-minute shift. Complete orders for coins. Packages are at the Package Counter.':'Dalawang minuto ang trabaho ng helper. Kumpletuhin ang mga order para kumita ng coin. Makukuha ang mga package sa Package Counter.',
 'discovered · discoveries stay, even after selling.':'ang nadiskubre · hindi mawawala ang mga nadiskubre kahit maibenta ang pagkain.',
 'Foods and purchased Mastery will be sold.':'Maibebenta ang mga pagkain pati ang nabili nilang Mastery.',
 'Food Index discoveries and unlocked Mastery stay.':'Mananatili ang mga nadiskubre sa Food Index at ang na-unlock na Mastery.',
 'Long-press (hold) a food item to select many items.':'Pindutin nang matagal ang pagkain para makapili ng marami.',
 'Tap foods to choose them.':'I-tap ang mga pagkain para piliin ang mga ito.',
 'Started orders keep their saved reward. Package food odds are separate.':'Mananatili ang naka-save na reward ng mga nasimulang order. Iba ang tsansa ng pagkain sa mga package.',
 'Take your time. Unlimited retries.':'Huwag magmadali. Walang limitasyon ang muling pagsubok.',
 'Keep multiplication facts close by.':'May talaan ng multiplication na maaari mong tingnan.',
 'Recall products before placing digits.':'Alalahanin ang sagot bago ilagay ang mga digit.',
 'Build your best chain of correct pairs.':'Bumuo ng pinakamahaba mong sunod-sunod na tamang pares.',
 'Practice careful, accurate multiplication.':'Sanayin ang maingat at tamang pag-multiply.',
 'Limited lives. Choose your challenge.':'Limitado ang lives. Piliin ang hamon mo.',
 'Choose the lives you want. Normal is always here.':'Piliin kung ilang lives ang gusto mo. Laging puwedeng piliin ang Normal.',
 'Connect the two digits first.':'Pagdugtungin muna ang dalawang digit.',
 'Get an answer, then write its digits.':'Kunin muna ang sagot, saka ilagay ang mga digit.',
 'Add the carry now, or place the ones first.':'Idagdag na ang carry, o ilagay muna ang ones digit.',
 'Carry selected. Tap the ones digit here or on the sheet.':'Napili ang carry. I-tap ang ones digit dito o sa worksheet.',
 'Drag a digit, or tap it and then its destination.':'I-drag ang digit, o i-tap ito at ang kahong paglalagyan.',
 'Could not save. Please try again.':'Hindi na-save. Pakisubukang muli.',
 'Enter the full answer, then press Enter.':'Ilagay ang buong sagot, saka pindutin ang Enter.',
 'Order saved. Choose any ticket, or resume later.':'Na-save ang order. Pumili ng ibang ticket o magpatuloy mamaya.',
 'New orders · coin rewards only':'Mga bagong order · coin lang ang reward',
 'These controls change saved progress.':'Binabago ng mga kontrol na ito ang naka-save na progress.',
 'Need a hand?':'Kailangan mo ng tulong?',
 'How to Play':'Paano Maglaro',
 'Long-press':'Pindutin nang matagal',
 'No foods in this view. Show all foods or open a package.':'Walang pagkain sa listahang ito. Ipakita ang lahat o magbukas ng package.',
 'Select an empty worksheet tile':'Pumili ng walang lamang tile sa worksheet',
 'Ready?':'Handa na?',
 'No upgrades ready':'Wala pang upgrade na puwedeng bilhin',
 'Select foods to choose them.':'I-tap ang mga pagkain para piliin ang mga ito.',
 'Tap the food to add it to your selection.':'I-tap ang pagkain para mapili ito.',
 'Permanent Luck grows as you complete orders. It increases the chance of higher coin tiers on new Order Tickets.':'Tumataas ang Permanent Luck habang kumukumpleto ka ng mga order. Mas malaki ang tsansa ng mas mataas na coin tier sa mga bagong Order Ticket.',
 "Base coins × Baker's Boost = total coins. A ticket keeps its tier until it is finished or replaced.":"Base coins × Baker's Boost = kabuuang coin. Hindi magbabago ang tier ng ticket hanggang matapos o mapalitan ito.",
 'Packages are available from the Package Counter. Permanent Luck does not change package contents.':'Makukuha ang mga package sa Package Counter. Hindi binabago ng Permanent Luck ang laman ng mga package.',
 'A new surprise awaits!':'May bagong sorpresa!',
 'Earn coins from playing to discover your next package.':'Maglaro at kumita ng coins para ma-unlock ang susunod na package.',
 'Next Discovery':'Susunod na Package',
 'Ready for a recipe':'Handa na para sa recipe!',
 'More recipes to discover':'May iba pang recipe na puwedeng ma-unlock!',
 'Golden Challenge!':'Gintong Hamon!',
 'Golden Challenge':'Gintong Hamon',
 'Solve it yourself for bonus coins!':'Sagutan mo nang mag-isa para sa dagdag na coins!',
 '← Drag to the worksheet':'← I-drag papunta sa worksheet',
 'Your order is ready to complete.':'Handa nang tapusin ang order mo!',
 'This digit is waiting for the carry. Add it here on the sheet.':'Kailangan pa ng carry ang digit na ito. Ilagay ang carry dito sa worksheet.',
 'Add the waiting carry':'Idagdag ang carry',
 'Place the digits':'Ilagay ang mga digit',
 'Add the rows':'I-add ang mga hanay',
 'Swipe down on the worksheet to finish your order.':'Mag-swipe pababa sa worksheet para matapos ang order mo.',
 'All placed!':'Nailagay na lahat!',
 'Digit placed!':'Nailagay na ang digit!',
 'Connect these two digits.':'Pagdugtungin ang dalawang digit na ito.',
 'Swipe down to add the rows.':'Mag-swipe pababa para i-add ang mga hanay.',
 'Now touch the other digit.':'I-tap naman ang isa pang digit.',
 'Add the waiting carry first.':'Idagdag muna ang carry.',
 'Carry selected. Add it to the product.':'Napili ang carry. Idagdag ito sa sagot.',
 'Drag each digit, or tap a digit then its tile.':'I-drag ang bawat digit, o i-tap ito at ang kahong paglalagyan.',
 'Get an answer on the right, then place it.':'Kunin muna ang sagot sa kanan, saka ilagay ito.',
 'Try the keypad on the right.':'Subukan ang keypad sa kanan.',
 'Tap to see the product.':'I-tap para makita ang sagot.',
 'Bring the carry into the ones.':'Isama ang carry sa ones digit.',
 'Put the ones digit here.':'Ilagay dito ang ones digit.',
 'Place the last digit.':'Ilagay ang huling digit.',
 'Lift the tens to the carry shelf.':'Iangat ang tens digit sa taas.',
 'Select an empty worksheet tile first.':'Pumili muna ng bakanteng kahon sa worksheet.',
 'Enter a digit, then press Enter.':'Maglagay ng digit, saka pindutin ang Enter.',
 'Try again!':'Subukan ulit!',
 'Move the written tens digit up to the carry row.':'Iangat ang tens digit sa hanay ng carry.',
 'This permanently removes the selected foods and their purchased Mastery. Your discoveries and unlocked recipe ceilings stay.':'Permanenteng mawawala ang napiling pagkain at ang nabili nitong Mastery. Mananatili ang mga nadiskubre at na-unlock na limit ng recipe.'
});
function uiText(english){return panaderyaLanguage==='tl'?(TAGALOG_UI[english]||english):english}
function getGameLanguage(){return panaderyaLanguage}
function languageSettingsMarkup(){
 return `<div class="settings-language-row settings-row" role="group" aria-label="Language / Wika"><b>🌐 Language / Wika</b><div class="settings-language-options"><button type="button" class="secondary" aria-pressed="${panaderyaLanguage==='en'}" onclick="setGameLanguage('en')">English</button><button type="button" class="secondary" aria-pressed="${panaderyaLanguage==='tl'}" onclick="setGameLanguage('tl')">Tagalog</button></div></div>`;
}
function setGameLanguage(value){
 if(value!=='en'&&value!=='tl')return false;
 panaderyaLanguage=value;
 try{localStorage.setItem(PANADERYA_LANGUAGE_KEY,value)}catch(_){}
 if(typeof document!=='undefined')document.documentElement.lang=value;
 if(typeof render==='function')render();
 if(typeof openSettings==='function')openSettings();
 return true;
}
