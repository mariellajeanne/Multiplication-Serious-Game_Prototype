/* Small local vector illustrations: Filipino breads, with no network assets. */
function foodArt(id,extraClass=''){
 const food=FOOD.find(f=>f.id===id)||FOOD[0];
 const crumbs='<g fill="#fff1b4"><circle cx="49" cy="54" r="2"/><circle cx="69" cy="42" r="2"/><circle cx="97" cy="60" r="2"/><circle cx="113" cy="49" r="2"/><circle cx="79" cy="72" r="2"/></g>';
 const bun='<ellipse cx="80" cy="65" rx="52" ry="32" fill="#bf692c"/><ellipse cx="80" cy="58" rx="50" ry="30" fill="#efa956"/>';
 const spiral='<path d="M56 66c-21-24 41-47 56-13 13 30-43 43-52 18-6-19 26-30 34-12 6 13-15 21-20 10" fill="none" stroke="#ffe3a2" stroke-width="8" stroke-linecap="round"/>';
 const drawings={
  pandesal:'<g transform="rotate(-15 80 60)"><ellipse cx="61" cy="65" rx="33" ry="29" fill="#b36c36"/><ellipse cx="61" cy="59" rx="33" ry="28" fill="#f0b86d"/><ellipse cx="101" cy="60" rx="30" ry="27" fill="#cb8240"/><ellipse cx="101" cy="54" rx="30" ry="26" fill="#f8ce86"/><path d="M53 38q-14 16-5 35M98 34q-14 14-8 32" fill="none" stroke="#fff0bd" stroke-width="5" stroke-linecap="round"/>'+crumbs+'</g>',
  monay:bun+'<path d="M81 30q-18 27-1 58" fill="none" stroke="#b56c31" stroke-width="7"/>'+crumbs,
  kababayan:'<path d="M39 64l10 33h62l11-33" fill="#b76734"/><path d="M34 67q-5-15 12-21 7-29 34-22 28-5 34 23 20 6 12 22z" fill="#efb657"/><path d="M54 77l5 14m20-15v15m24-15-4 15" stroke="#efbc79" stroke-width="4"/>',
  'pan-de-coco':bun+'<path d="M55 44q25-18 49 1" fill="none" stroke="#ffd987" stroke-width="8" stroke-linecap="round"/>'+crumbs,
  'spanish-bread':'<g transform="rotate(-20 80 60)"><rect x="27" y="35" width="110" height="51" rx="25" fill="#bd6f34"/><rect x="27" y="28" width="110" height="50" rx="25" fill="#efac5c"/><path d="M50 33q-11 18 1 39m27-42q-10 20 2 42m25-41q-8 20 4 37" fill="none" stroke="#ffdc95" stroke-width="5"/>'+crumbs+'</g>',
  'cheese-bread':bun+'<g fill="#ffe67f" stroke="#e9c654" stroke-width="1"><path d="M50 42l17-3 3 12-18 3zM84 35l17 4-3 12-18-4zM73 61l18-2 2 12-18 2zM105 55l14 3-4 12-14-3zM45 65l15-3 3 11-15 2z"/></g>',
  kalihim:'<path d="M29 43l96-5 8 43-95 12z" fill="#c77d40"/><path d="M32 54l96-5 3 23-96 12z" fill="#db5f78"/><path d="M29 43l96-5-2 15-92 5z" fill="#f3c686"/><path d="M47 47l60-4" stroke="#ffe3aa" stroke-width="4" stroke-linecap="round"/>',
  ensaymada:bun+spiral+'<g stroke="#fff1ad" stroke-width="3"><path d="M45 45l11 2m39-15 8 5m10 36-12 4M57 80l8-2"/></g>',
  hopia:'<path d="M32 55v25c0 26 96 26 96 0V55" fill="#bd763a"/><ellipse cx="80" cy="55" rx="48" ry="30" fill="#efc783"/><ellipse cx="80" cy="51" rx="32" ry="19" fill="none" stroke="#d39a57" stroke-width="3"/><path d="M55 50h50m-45 9h40m-29-24v33m15-33v33" stroke="#d59c5c" stroke-width="2"/>',
  mamon:'<path d="M35 56l8 34q36 17 73 0l10-34" fill="#d79540"/><ellipse cx="80" cy="55" rx="48" ry="31" fill="#f6d582"/><ellipse cx="80" cy="49" rx="33" ry="20" fill="#ffe6a1"/>',
  pianono:'<path d="M36 44l60-15q34-2 37 31t-26 32L47 100z" fill="#e8aa5c"/><ellipse cx="47" cy="72" rx="25" ry="29" fill="#ffe8b2"/><path d="M42 52c-24 9-15 44 7 38 20-7 7-34-7-26-10 8 0 19 7 13" fill="none" stroke="#e9b65f" stroke-width="6"/>',
  'ube-pandesal':bun+'<ellipse cx="80" cy="59" rx="43" ry="25" fill="#aa79b7"/><path d="M55 63q21-21 47 0" stroke="#f9db8c" stroke-width="8" fill="none"/>'+crumbs,
  'buko-pie':'<path d="M27 61l10 28q44 21 88-2l10-26z" fill="#b97b3b"/><ellipse cx="81" cy="56" rx="55" ry="31" fill="#f2c27d"/><g stroke="#d69b53" stroke-width="5"><path d="M46 35l60 45M68 28l57 41M30 57l38 29M47 78l61-45M31 64l45-34M77 85l53-35"/></g>',
  brazo:'<path d="M36 39l63-9q32 3 34 33t-28 30l-64 4z" fill="#fff1ce"/><ellipse cx="43" cy="68" rx="24" ry="29" fill="#fff9e8"/><path d="M39 47c-25 12-14 45 9 38 20-9 4-32-9-20-7 8 1 16 8 11" fill="none" stroke="#edc256" stroke-width="7"/>',
  'ube-ensaymada':bun+'<ellipse cx="80" cy="58" rx="48" ry="29" fill="#ac76bd"/>'+spiral
 };
 return `<svg class="food-art ${extraClass}" viewBox="0 0 160 120" role="img" aria-label="${food.name}"><ellipse cx="80" cy="104" rx="58" ry="9" fill="#8e613422"/><ellipse cx="80" cy="97" rx="65" ry="8" fill="#fff5df"/>${drawings[food.artId||food.id]||bun}</svg>`;
}
function orderFood(ticket){return FOOD.filter(f=>f.rarity===ticket.rarity)[ticket.id%FOOD.filter(f=>f.rarity===ticket.rarity).length]||FOOD[0]}
function orderStory(ticket){return `${ticket.b} trays · ${ticket.a} ${orderFood(ticket).name} each`}
function luckProgress(){return `<div class="luck-track permanent-luck"><div class="luck-stars" aria-label="${g.mastery%4} of 4 practice stars">${Array.from({length:4},(_,i)=>`<span class="${i<g.mastery%4?'filled':''}" aria-hidden="true">★</span>`).join('')}</div><small>More mastery → Higher Luck</small><div class="luck-caption"><b>★ Ticket luck +${g.permanentLuck}<small>PERMANENT</small></b><button class="text-button" onclick="openProbabilities()" aria-label="Detailed ticket probabilities">ⓘ</button></div></div>`}

function trayArt(){return '<svg class="tray-icon" viewBox="0 0 64 44" role="img" aria-label="baking tray"><path d="M6 13Q4 5 13 5h38q9 0 7 8l-4 22q-1 5-7 5H17q-6 0-7-5Z" fill="#795032"/><path d="M8 11q0-4 6-4h36q6 0 6 4l-4 19q-1 4-6 4H18q-5 0-6-4Z" fill="#bd8857" stroke="#edc38b" stroke-width="3"/><path d="M17 13h30l-3 14H20Z" fill="#5d4937"/><path d="M3 17h8m42 0h8" stroke="#e3b17a" stroke-width="5" stroke-linecap="round"/></svg>'}
// Shared, code-native illustrations: soft fills, the same warm outline and light edge.
function bakeryIcon(name){
 const drawings={
  bakery:'<path d="M10 27h44v29H10z" fill="#efc68e"/><path d="M7 26 13 9h38l6 17Z" fill="#fff1ce"/><path d="m15 9-4 17m17-17-1 17M40 9l1 17M51 9l4 17" stroke="#cf8a71" stroke-width="8"/><path d="M7 26q6 7 12 0 7 7 13 0 7 7 13 0 6 7 12 0" fill="#fff1ce"/><rect x="17" y="35" width="18" height="14" rx="3" fill="#fff4d8"/><path d="M40 35h9v21h-9z" fill="#b9875a"/><path d="M20 43q6-11 12 0" fill="#e4ae58"/><path d="M8 57h49" stroke="#a16e46" stroke-width="4"/>',
  kitchen:'<path d="m37 11 12 4-18 31-7-4Z" fill="#cba16e"/><ellipse cx="24" cy="43" rx="13" ry="7" fill="#edd4a8"/><path d="M9 32h46q-2 24-23 24T9 32Z" fill="#e5b4a0"/><ellipse cx="32" cy="32" rx="23" ry="7" fill="#fff0d1"/><path d="M14 41q6 11 17 11" fill="none" stroke="#f8d5bd" stroke-width="4"/>',
  decor:'<path d="M20 39h25l-4 18H24Z" fill="#d99876"/><path d="M17 38h30v6H17Z" fill="#f1b58f"/><path d="M32 38V18M32 30Q15 34 15 20q13-3 17 10M32 24q1-16 15-15 4 13-15 15" fill="#a6bb81" stroke="#819664"/><circle cx="31" cy="12" r="7" fill="#edc791"/>',
  helper:'<path d="M13 27q-7-14 6-18 9-11 19-1 15-2 15 12-1 9-12 9" fill="#fff7e5"/><path d="M17 24h30v9H17Z" fill="#f3dfba"/><path d="M20 34v10q12 15 24 0V34" fill="#efc593"/><path d="M14 59q1-13 18-13t18 13" fill="#d7b39e"/><path d="M27 50v9m10-9v9" stroke="#fff3d8" stroke-width="4"/>',
  modes:'<path d="M13 20q19-9 38 0l7 25q-1 12-12 7l-9-8H27l-9 8q-11 5-12-7Z" fill="#c7b4d7"/><path d="M17 26v13m-6-6h13" stroke="#806b92" stroke-width="4"/><circle cx="43" cy="29" r="3" fill="#eeb39a"/><circle cx="49" cy="37" r="3" fill="#eac77d"/>',
  guide:'<path d="M6 15q14-5 26 2 12-7 26-2v34q-14-5-26 2-12-7-26-2Z" fill="#fff0d0"/><path d="M32 17v34M13 24h12m-12 8h12m-12 8h10" fill="none" stroke="#c1a176"/><path d="m40 28 4 4 8-10" fill="none" stroke="#92a776" stroke-width="4"/>',
  index:'<path d="M6 15q14-5 26 2 12-7 26-2v34q-14-5-26 2-12-7-26-2Z" fill="#fff0d0"/><path d="M32 17v34" fill="none"/><ellipse cx="19" cy="30" rx="8" ry="6" fill="#e6b56b"/><path d="M41 25h10m-10 8h10m-10 8h7" stroke="#c1a176"/>',
  inventory:'<path d="m8 25 24-9 24 9-5 29H13Z" fill="#d9b27b"/><path d="m8 25 24 8 24-8-24-9Z" fill="#fae9c4"/><path d="M20 29q-8-19 5-20 14-1 13 17" fill="#efbd6e"/><path d="M34 28q0-21 12-18 11 4 3 20" fill="#e7ad60"/><path d="m25 16 6 6m10-7 6 5" stroke="#fff1bc" stroke-width="3"/><path d="M22 36h20v12H22Z" fill="#fff1ce"/>',
  display:'<path d="M7 22h50v34H7Z" fill="#e4c59a"/><path d="M7 22q0-17 15-17h20q15 0 15 17Z" fill="#ffedc5"/><path d="M13 24h38v21H13Z" fill="#fff8e8"/><path d="M8 47h48v9H8Z" fill="#d3a674"/><path d="M21 55v5m23-5v5" stroke-width="4"/><path d="M32 29v11m-6-5h12" stroke="#bd8d54" stroke-width="3"/>',
  ticket:'<path d="M15 6h35v51l-5-3-5 3-5-3-5 3-5-3-5 3-5-3Z" fill="#fff0cf"/><path d="M21 17h22m-22 8h22m-22 8h15" stroke="#c09d6d"/><circle cx="39" cy="44" r="6" fill="#c5d3a1"/>',
  settings:'<path d="m27 7 10 0 2 7 6 3 7-2 5 9-5 5v7l5 5-5 9-7-2-6 3-2 7H27l-2-7-6-3-7 2-5-9 5-5v-7l-5-5 5-9 7 2 6-3Z" fill="#d8b386"/><circle cx="32" cy="33" r="10" fill="#fff7e1"/>',
  sound:'<path d="M9 25h10l13-11v36L19 39H9Z" fill="#e8be86"/><path d="M40 23q12 10 0 20m7-28q21 18 0 36" fill="none" stroke="#b29169" stroke-width="4"/>',
  mute:'<path d="M9 25h10l13-11v36L19 39H9Z" fill="#e8be86"/><path d="m42 25 13 15m0-15L42 40" stroke="#bf816b" stroke-width="4"/>'
 };
 return `<svg class="bakery-icon icon-${name}" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="#99734e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${drawings[name]||drawings.bakery}</svg>`;
}
function packageArt(){return '<svg class="package-art" viewBox="0 0 64 64" role="img" aria-label="Bakery package"><path d="M7 23 32 10l25 13v29L32 62 7 50Z" fill="#ca8a4d" stroke="#a56735" stroke-width="2"/><path d="m7 23 25 12 25-12-25-13Z" fill="#f5d091"/><path d="M32 35v27l25-10V23Z" fill="#dca265"/><path d="m24 14 25 13v11l-10 4V31L15 19Z" fill="#fff0c5"/><rect x="13" y="33" width="13" height="11" rx="3" fill="#fff4d8" transform="rotate(20 19 38)"/><path d="m17 38 3 3 4-4" fill="none" stroke="#75906b" stroke-width="2" stroke-linecap="round"/></svg>'}
function foodCopyLabel(number){if(number===1)return 'Collected again!';const last=number%100;return number+(last>=11&&last<=13?'th':({1:'st',2:'nd',3:'rd'}[number%10]||'th'))+' Copy!'}
function renderOrderRewards(rewards,coins,luckGain){
 return `<div class="resolved-order"><div class="resolved-packages">${rewards.map((reward,i)=>`<article class="package-reward r${reward.food.rarity}" style="--reward-delay:${i*.07}s"><span class="copy-badge ${reward.isNew?'new-discovery':''}">${reward.isNew?'NEW!':foodCopyLabel(reward.copyNumber)}</span><span class="package-seal">${packageArt()}</span>${foodArt(reward.food.id)}<h3>${reward.food.name}</h3>${rarityTag(reward.food.rarity)}</article>`).join('')}</div><div class="resolved-summary"><div class="resolved-coins"><span aria-hidden="true">🪙</span><strong>+${fmt(coins)}</strong><small>Coins</small></div><div class="resolved-luck"><span aria-hidden="true">✨</span><strong>+${luckGain}</strong><small>Ticket Luck</small></div></div><p class="resolved-practice">${g.mastery%4}/4 practice stars toward your next permanent Luck</p><button class="primary back-to-bakery" onclick="closeModal()">Back to Bakery ↗</button></div>`;
}
