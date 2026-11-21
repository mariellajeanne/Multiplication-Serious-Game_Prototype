/**
 * Conservative cleanup for screenshots identified in one uploaded web snapshot.
 * Does not touch the game assets, source, tests, network code, or save data.
 * Run via the provided Windows installer, which first backs up ALL previews.
 * No external Node packages needed.
 */
import { readdir, readFile, stat, unlink, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, extname, join, resolve, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW_DIR = resolve(root, 'docs', 'previews');
const expected = [
  "docs/previews/bakery-components/assign.png|0da6fb5ce379854a1fabfa555ccd742cf22dadedc9d9e44c5057c4f5afb0627b",
  "docs/previews/bakery-components/completed-order-1194.png|64b9101d133942c912d4c5f5590a38a729f6e39b667736c2376e0e04cde9e144",
  "docs/previews/bakery-components/copies.png|ce985713d8562f3d2e484ac94bbf275447d2bf42a151bcf1137187914b1a9bc9",
  "docs/previews/bakery-components/decor.png|88c4c9dff70377bca645913f51e1c1ea5067c78163b1cc3e76cac8296ff6ea19",
  "docs/previews/bakery-components/food.png|49e1147de5952d827d4820447421db07b71862458ef9067146b473f32c69f25e",
  "docs/previews/bakery-components/fusion-quantity.png|12f5a30b53cc730ab9c5511912de55f2d7d436d239a2990b29bc3d38c2f81b42",
  "docs/previews/bakery-components/fusion.png|8b109524ec41685b0ac6cccc5f08e8eac61206b2f092c7ad835af93c9efcdb82",
  "docs/previews/bakery-components/index.png|95958ffd1f96500c5a78519d9d6b92a0cbb66d51ec44ded40048531ffe868102",
  "docs/previews/bakery-components/ingredients.png|c3a972f8cc6922be1a558c2d9ef1174d91440a6ad887753262e31d81534857a7",
  "docs/previews/bakery-components/inventory-1194.png|2b8c393ec8f8f6b9c3599a4f71624975aca7bac7cfd08dbe8904e7e7245a7268",
  "docs/previews/bakery-components/inventory-remove-confirmation.png|dfe564c3990c45906f0dbe5ab8d21764c3e405acb8a445504b6d0c1d84ba5f58",
  "docs/previews/bakery-components/inventory-sale-confirmation.png|336c107c0da7cafe3a6ce20a8a7669755e466bed18134edfb6377a0217df1135",
  "docs/previews/bakery-components/kitchen.png|63c77fb1ab63817c37d2b63a4bc50f9b7657c7e26cb368c96c1e0b9162c48959",
  "docs/previews/bakery-components/luck.png|27ee3e2b56fa6e25ba1ccf4a95f0e93137c2d99709016754b03d7e9d918ca407",
  "docs/previews/bakery-components/main-1024.png|6d7ef88fd3a5f0242909652aa6127171b2d71df89b1bc891c47d3950f5f8a030",
  "docs/previews/bakery-components/main-1280.png|2278a087f42c970301b88c79c19d068ab4835c61635f7f3cc81a9be3ff23bc7b",
  "docs/previews/bakery-components/main-2000.png|8c2cd4db4fb2ff9453a9386a4c4ea310e4c81bcbb4fd4778e16c726f50775106",
  "docs/previews/bakery-components/main-390.png|85dada73cf34984831459316e06b6bcd0546839d4cf821d4ca1f45f53bd0bea4",
  "docs/previews/bakery-components/main-768.png|f7dbe570934829816cce4972e354d6d76004f45b31e00551e5abc2dfeaed42d7",
  "docs/previews/bakery-components/main-progress-1024.png|c9f241f045feaffa84a941a70d47b28c09dacf4b1d0cafa9605615807df006c8",
  "docs/previews/bakery-components/main-progress-768.png|276516680bcbf8039c61ec5fb02b3e2880d983fb0a6a37f37c4125cadce84703",
  "docs/previews/bakery-components/modes.png|1d43858bd45a01d0ac9b264e63f029fd8f79ece7570e50ab69f851cb18146a9d",
  "docs/previews/bakery-components/order-resolved-1024.png|69e4829695b77a78478d64db41331bd9b13bab3a71964a61eb4803875d0b504c",
  "docs/previews/bakery-components/order-resolved-768.png|e3bf161792f5239fc0fd0ba35b3689e701e213463108e1b5c36398118c05636d",
  "docs/previews/bakery-components/sale.png|807fc7814e146f0728c39572b75a880631c7628eaf124b1e9f89576a2553a986",
  "docs/previews/bakery-components/settings.png|dd89bd53fb50ba8b1f79d01d9ba1eceb521647a3d0ad0b0d7a1610d98d2d949d",
  "docs/previews/bakery-components/staff.png|94335b71d4f22d02c1e60a24f286133a30b486ef1f86bb149d053640ced61968",
  "docs/previews/bakery-components/worksheet-1024.png|4dd1952ed71fb576eea201ba9d240f36e94ea2b8d52e67fc0133ee26ac283c8c",
  "docs/previews/bakery-components/worksheet-1194.png|5a7c3601491cc30bf3d3cc9ddd05f24ddb087ab04e6d921ced7c2693aae5874c",
  "docs/previews/bakery-components/worksheet-1280.png|374f251e022b1889051961b3b96401d395ce78d9f68dd25933162f21a9ef25eb",
  "docs/previews/bakery-components/worksheet-2000.png|9eccb673558c0ed4cb80a2a9a1512b6436e7703d7db3f4150564717aaaf22d35",
  "docs/previews/bakery-components/worksheet-390.png|3ca878e0935873bea9ed575ebef5d2c1e271cc0e63c2b48aba6b7b36cbf8ca62",
  "docs/previews/bakery-components/worksheet-768.png|38b5477eae555f61b68a978482cbaa74ba1183f10cfeb6e158474454dd98273f",
  "docs/previews/bakery-components/worksheet-product-1024.png|837453372b8670501232e546ee45aab7db0bccb852c3690c297fbbab56fc03db",
  "docs/previews/corrective-redesign/assign.png|4bf4efc3c7b4f4cee33b7fe458151c1b096642c1ebfb8bea37406f240838b132",
  "docs/previews/corrective-redesign/copies.png|697621c5b68b36f8a9eddda17829a3a10e6b6be8e1e8c2ff80a6cfaf57adb50e",
  "docs/previews/corrective-redesign/decor.png|d424d19da50548c946c0cd68f9533454857ac0fb0be11eb19f283c51524bbac3",
  "docs/previews/corrective-redesign/food.png|a098e191beb5c574476e02aed8a71667e4c106df0ba22f9edd5aa639924d22f5",
  "docs/previews/corrective-redesign/fusion.png|06eefd7deb5f103acc1bfee58269f0772bfcba4f43688e334af515860c9564fc",
  "docs/previews/corrective-redesign/index.png|c9baa89a3281f4a6b690a573df877b79b690f9dbbc33c524d6989fb15d3682d6",
  "docs/previews/corrective-redesign/ingredients.png|195a05022c9d2757c47ca2ea6c21c168accda241858c2aec7ced773132611b72",
  "docs/previews/corrective-redesign/kitchen.png|58449c865ca2f237eff8978ae1d3502976d79635802c76a925c799740632c423",
  "docs/previews/corrective-redesign/luck.png|4f75e9c7b1be927fba9703dcda03ea1621631324d1efb18409ec3276098d6c62",
  "docs/previews/corrective-redesign/main-1024.png|a5c20c1e1893bf01f8dae7b95126285660e21b5b96ae9cf1270d4d596c8bcf9c",
  "docs/previews/corrective-redesign/main-1280.png|d23591b23e69036cede87276e59f18bfbe5cc7b6ac6110da9ce4a455f0f8f419",
  "docs/previews/corrective-redesign/main-390.png|9bfbcc596b203192b68850367b4df5ccff7687e0f287c6b7746ffb6b7f6d252a",
  "docs/previews/corrective-redesign/main-768.png|bf726a7e50aac7f6f8d2f3b55690b8aa93d637030785a7240372827f21523d6e",
  "docs/previews/corrective-redesign/modes.png|4757aa36aad0a44c9392e89e7ece6a41c66a25e76857966179653b06a715f3c4",
  "docs/previews/corrective-redesign/settings.png|dbfec3209e35219659db39e46db33e0224b4c7f6d1b371fe95f831b5cb0b27f1",
  "docs/previews/corrective-redesign/staff.png|b3ac4c0924a7d8567bacf9a8546fb81b907983584b2938435ba683f111e97f4a",
  "docs/previews/corrective-redesign/worksheet-1024.png|a86d3ed19e4c01c11663d9dfb60a3b6c378a01c7db19cc70e8349e1959051719",
  "docs/previews/corrective-redesign/worksheet-1194.png|898693e27d7d19505fc10c0ce365339d84a999eefaac90c9b22d2843414ca2ce",
  "docs/previews/corrective-redesign/worksheet-1280.png|34b5663d512a7aa7eeca7cb588f2d69a9259a9e6408bb30b6db044416450572f",
  "docs/previews/corrective-redesign/worksheet-2000.png|04979be746c04761989643c1c8e70e049d8c41ab6d344c283d3282decd93ec89",
  "docs/previews/corrective-redesign/worksheet-390.png|f2e9751b47b0635faa764f46ac360d8d9722f11d6d3deb9eedae4d515f1452a6",
  "docs/previews/corrective-redesign/worksheet-768.png|5c3a14e2923e55390aac4062fdb3145d514ab95f4dd5e4d6251eb598ec72d87f",
  "docs/previews/cozy-redesign/assign.png|53fae095b02fe3a7c7e8baf623bc029228cb46374d9fb41885a459549b86a7a9",
  "docs/previews/cozy-redesign/completed-order-1194.png|584c348b44d7628b60834b0e78750750a5036d6c5f265631baba561b93b315cd",
  "docs/previews/cozy-redesign/copies.png|d1c331366340e0194dc67e205dedd8f2362d693b577730676cdfa03902d947a4",
  "docs/previews/cozy-redesign/decor.png|0f6765c7698852efbbdfe174d511d3fe9ff4f93e59e3ab5c338906e4562a46f6",
  "docs/previews/cozy-redesign/food.png|655898ecb9b2c746b7ee78df475b5758576d4916b09e3d6c8b56dc8b9aafca84",
  "docs/previews/cozy-redesign/fusion-quantity.png|af143a751b177c7c594fae78e27079ca59a90d05af0d475536e8dc49d7c40936",
  "docs/previews/cozy-redesign/fusion.png|973745f84b206651f9ce0d1707d4f9b56ebabfe3b6d0d76f4efda626d212ae9e",
  "docs/previews/cozy-redesign/index.png|e1ac487c374b61a70f94ddcab15ecbed6cc667869a8588716d5f9bfe46e28998",
  "docs/previews/cozy-redesign/ingredients.png|db3932287a96a6b31a471091706e587629fe466070d6946b2356bbb81c59860f",
  "docs/previews/cozy-redesign/inventory-remove-confirmation.png|4f678639d30543e159cc275bf481a41ef14f0271d723f9c48db2c32ff44a5c1d",
  "docs/previews/cozy-redesign/kitchen.png|6adf56d539a796215bf6e89b7618ee755a7be51fb9605a4707a74c6263a8afc4",
  "docs/previews/cozy-redesign/luck.png|bc999d3fb0e1aa4912b45cd20c6b1bf10a86b0e362b570f2e2d13446d96d838c",
  "docs/previews/cozy-redesign/main-1024.png|e4519f31f56359beaf09fccb13a17d36c39c80b8249fd4a1a12668265361e51c",
  "docs/previews/cozy-redesign/main-1280.png|24d45a627f5e56e80bd0ce4efec81487a08cd1219cd282d9d95beeb15f4bd2fc",
  "docs/previews/cozy-redesign/main-2000.png|68d0657156dd5317b73eb9d106bbcb4454dce365e5d1378164d55e61e9c0ee08",
  "docs/previews/cozy-redesign/main-390.png|7b55854de56723701661c9b7e9aa9939e332ec65cadb44b6510d2c2b83eac65c",
  "docs/previews/cozy-redesign/main-768.png|ee167744ad8754246282c1bf3c26c4608fcadd45e493fd8f98b0d0d6607905d3",
  "docs/previews/cozy-redesign/main-progress-1024.png|8cc9f0e6cc46c31ce0f135b2e3f589f3a371b7c9b016f426fedae4798e970e11",
  "docs/previews/cozy-redesign/main-progress-768.png|c6fa6ef7df9656c27089fa4ea3e6f6b7a7db7169a8949cdc0a5ba6d92195c88d",
  "docs/previews/cozy-redesign/modes.png|92f2ebcb1cb50f351223d2f3dc240478c879b569041a92153871bd904c477201",
  "docs/previews/cozy-redesign/order-resolved-1024.png|77c1459407b698a2f38582688e2bbf80045237eadac66ac4a1f61caabbd8e815",
  "docs/previews/cozy-redesign/sale.png|081df9557549059c85392a8ee0e353ca4e4cf4456b55d2dd119cbc733594a1d3",
  "docs/previews/cozy-redesign/settings.png|c582089109abcc224b6fa3a686548b5ee79fed881697bb7d0da4b1fddd77f8c9",
  "docs/previews/cozy-redesign/staff.png|002ebce5e6b0b269f05c1cadf0743f853083c0a230a70715a3f7dd5f46eb4377",
  "docs/previews/cozy-redesign/worksheet-1024.png|ddae5863ae4b344ecabbbe1633a76bec3f533b5d809a998756c17b0bd6aa7e21",
  "docs/previews/cozy-redesign/worksheet-1194.png|f9fbb88d68d6f2f4073d012220248e9dd16a40e5ffe64dbfd126aac6a053f1c7",
  "docs/previews/cozy-redesign/worksheet-1280.png|aafd8644efc75ee09792d040322d68f19ddceb66b54ec83f331b43318f77b1a2",
  "docs/previews/cozy-redesign/worksheet-2000.png|35f29870beb2e6ec840c4231e3bb78a2e3f8603dedcc2b95cf92cecb79f0fa2e",
  "docs/previews/cozy-redesign/worksheet-390.png|597f346a5d689713cd2e65988ea0884fd2a96a21f18acd46ccc95ae8d4050f68",
  "docs/previews/cozy-redesign/worksheet-768.png|064c2f309dc8d97623e6b0f6f1cffad0b61482c7c569e7ee19ff84a941f2bf68",
  "docs/previews/cozy-redesign/worksheet-product-1024.png|d193c524cbfe23010af72eedfb090ba621ea8e9be001f52c4a0de416ffe39d96",
  "docs/previews/cozy-redesign/worksheet-product-768.png|129a33858db9fe33b3b91e0fa3d6dded5e049fafd7f4b5ab5842d78739c1aa82",
  "docs/previews/frame11/edge-claim.png|1b3f0998170e9295aa09815a68216bde52ec10ffe031d1c3df6c44eecaa20c82",
  "docs/previews/frame11/edge-collection-1024.png|a2754e895f9a7d86c6e0fa129d3f2fdc4e3106b055ba2f66fdc7b675b2ab7d1f",
  "docs/previews/frame11/edge-collection-1194.png|96584227da5b0d875d005596e56eaff8b48f148642bbd7c7d5650c9212f736d2",
  "docs/previews/frame11/edge-collection-2000.png|a929151565af6ea14f9be93439336a9240ed80fdc20b4ab402375b8efcf4c4fc",
  "docs/previews/frame11/edge-collection-390.png|58afc24827bb2380ad27fea97a54fefd55c9c2e7a27d148687614c4c1d82af99",
  "docs/previews/frame11/edge-collection-768.png|a70f0d70c9e352702c1a6df63d8465ae0ccf924138fd6f34234a49b5ab75398f",
  "docs/previews/frame11/edge-fresh-2000.png|7717854ef2bd667db90e3c927359c6bdfc99bc28d026fa9c0c6271d839763822",
  "docs/previews/frame11/edge-packages.png|0a8154d32410d0c59be208be09274fc333822186f68ea64d6041ff5471c1900b",
  "docs/previews/frame11/webkit-claim.png|0b569729cc5a27e354b016dba5bfe41eeb013725a52b21bbcb91a00046a812df",
  "docs/previews/frame11/webkit-collection-1024.png|b3c85bd61680078a0192760ba1a359fdd8fa3f0564b8f7673d4044305dab555d",
  "docs/previews/frame11/webkit-collection-1194.png|08d3fa5798e3f49d24b515701964eb3198ad990d31d1c1f548d15c6731276aef",
  "docs/previews/frame11/webkit-collection-2000.png|65c47b937c46ca0aab12d9d10cae4818707931e26cd2f0d3b1a1cd6292c2afbc",
  "docs/previews/frame11/webkit-collection-390.png|1cb1b1cb05938777b6074766928570aeb68d5f9851e66ae4a4a1455fad10fb36",
  "docs/previews/frame11/webkit-collection-768.png|51d6173abc4340d322b19250fb7b06d5c13ed84cc0e9a0bd82c349a1ced82c28",
  "docs/previews/frame11/webkit-fresh-2000.png|19d66605062230325553e6a95b7e34a77bd090162d1aa3a41d56dc24bb214b45",
  "docs/previews/frame11/webkit-packages.png|9c7b2cbb59f201d016638198f45cbfe0abd9a009c1f96be989a2f5becbdd9c75",
  "docs/previews/progression/assign.png|76b2c1b467d8bb5af65510bde5bb739400335cc89392c29013d260b538158cda",
  "docs/previews/progression/bakery-level-1.png|016299d7d8fc3f0eeda3cf29762a5c89324728984b7a0b98ee4b8e6776e4d601",
  "docs/previews/progression/bakery-level-17.png|51c040cffb7b7ba30fe736e6d8e5dfe704f6e6e46b63b12b3a31a06c5327cc0b",
  "docs/previews/progression/bakery-level-30.png|d7cf9a8db35dafdb0312026c263a016a0acf9de156744e1686379b1a723283cf",
  "docs/previews/progression/bakery-level-7.png|71b1c972d5c072df7fdd66f4cdc2b40fa7c4e92aa163468451fddd23f362c4a8",
  "docs/previews/progression/completed-order-1194.png|12c0fd6ea76e86173051140342acea402419b7b62502f29536d3e6432d14f8a7",
  "docs/previews/progression/copies.png|1bb70d3d10e9cd3705c9f0267509fb12c5c55d32d606fd00c28d2e02caf701c5",
  "docs/previews/progression/decor.png|2f3fb8be01cfeacb3daaf5b04280c9ef8a0ef7a10f95c5d32fbda0bcb898e63c",
  "docs/previews/progression/food.png|ff190fce9bbe9b918ed291303538c6ab1ab4ab9c995d606e1fe85d8315eec4c1",
  "docs/previews/progression/fusion-overflow.png|889a13d10513f5f32b37337b12bd382869aedd383cc8b4c043b43e2a9970168f",
  "docs/previews/progression/fusion-preview.png|ac0ea7b46e44a61c1816f4849d1d4d6a1a4e6a185018beb966508046bc8567bd",
  "docs/previews/progression/fusion.png|ba03eca864564b5f9163f93a4ca378db881b7999bb0072d48e5f8eb6cebb9a14",
  "docs/previews/progression/index.png|5ff1fd727e7fed4ded3c34c97f643dd8e321627a0f2f02af5fac4269d8ba7ccb",
  "docs/previews/progression/ingredients.png|80aa93d5301da39f5286bac8de569e81dbf050764b035807341874adffdf8f87",
  "docs/previews/progression/inventory-1194.png|3d6f78907be95a789d6a460e6af88f3ce3485b5cc0918eddd95d4c4831103fcb",
  "docs/previews/progression/inventory-390.png|50ddd1f80f177e2d8e6c971441df274cd426dda8e81e836087a9ce782fac4cab",
  "docs/previews/progression/inventory-768.png|f8b08b0377d030e5224e450eabac571a6b68f4203098787a3846aee36b73f9c7",
  "docs/previews/progression/inventory-remove-confirmation.png|f9e01291631df820b6a00ea41b22ff2b6489ee16e202706240d91c10d04d7dea",
  "docs/previews/progression/inventory-sale-confirmation.png|46e0301ce2b0d27f980b0add7984923a3f32d99a91f31d134abadca7ff5fa0d3",
  "docs/previews/progression/inventory-selected.png|a5e54707e42439e8601d323fccb1c136263a8686733e875cbe528706aa01746c",
  "docs/previews/progression/inventory.png|7f33404b03aaebdbaa7c4af4c674fec32d9f0d8a01b51b66469831192996fb0f",
  "docs/previews/progression/kitchen.png|396d3dd5c514e2d2f309e7cb530276f879cbc3795f3eae8609d9da971f37e004",
  "docs/previews/progression/luck.png|d76a45ab78c6420dc32a9e99cd3ef0be613204d876c167863db0f298a0ebcf6c",
  "docs/previews/progression/main-1024.png|d5f6fe6d8745a5a4422b9013c28805dac28d0da0457332c441da8f4f22c25b6d",
  "docs/previews/progression/main-1280.png|725702e018ad6d647d052dd89c9c72c75dd4a96ff4d4bbf4fa9cd36a251e136d",
  "docs/previews/progression/main-2000.png|ebb0a44206643bd400e2e5a56a34de40cc0ba1b9fe2efefc2937633eaa8f3eb0",
  "docs/previews/progression/main-390.png|56ef847b2991bdab911b9754bf823ca0c3f9c4a1b3d99cd69680787498ab1121",
  "docs/previews/progression/main-768.png|7c23d8b96ff439c88da1f7804119a45bf22087e2f93b5c582ab3fc5467f29a54",
  "docs/previews/progression/main-progress-1024.png|9ca974353fa82d236b228c8a7134b4a1ab12430850b2fe9d57edac7855cc3e32",
  "docs/previews/progression/main-progress-1194.png|2a02178de22d3dc9887c7dffe92b92f015cc853eec751f52141c2dc29c7e5325",
  "docs/previews/progression/main-progress-2000.png|f32fa9286ab697e74e06e3917c262be3312241e06f0677fd17d8b8c6f916472b",
  "docs/previews/progression/main-progress-768.png|1a25959db656547ae7d8940cdc6cc381bbf5166cb5358de20d0928d7d59d8f73",
  "docs/previews/progression/modes.png|099bb3bb28577818838c90d368c225812abee8df77f51fb2cdb2a49afe8d9466",
  "docs/previews/progression/order-resolved-1024.png|b47307ef874dd407893aca6819c5a30d544bac921500ca66782cca5a25e6abae",
  "docs/previews/progression/order-resolved-1194.png|b74f42c71f120e8cc853408c4971602618f03f9730783eae39b5a35cc3132416",
  "docs/previews/progression/order-resolved-2000.png|d2e8e4edebbe5e50f7fab1437f1cdc24f66c38781fda50c2fe61e366fa7e851f",
  "docs/previews/progression/order-resolved-390.png|3e2ce5dcc8950b3a2efa736bbfa815bcb0e6073c8e7b17c254649c77d58440cf",
  "docs/previews/progression/order-resolved-768.png|418cd8d6578e8bbf7eb108f57fd67088cf0983c929ce1ac7d53320b899fc5129",
  "docs/previews/progression/sale.png|5a096d0a8239f899537354370daa55d29e95b8d3d5dbf700ef360925f5db7155",
  "docs/previews/progression/settings.png|81d95b7f943d26a830805c53afcf51d6bda3b5c3404f97550df589b7a6450fe8",
  "docs/previews/progression/staff.png|208622943858b21888590bddb35786141907c8c1eece8506963b0bb26dcc77ae",
  "docs/previews/progression/stage-cd-inventory-1024.png|f11963ac1c6f75671f4830a14c42b5624cf402f908e6561e7fba408c2c1872b4",
  "docs/previews/progression/stage-cd-inventory-1194.png|9f2fd47fe3954ba08bb4460d7b8a81409d6a4071ca13579d38c676f42a2ed25c",
  "docs/previews/progression/stage-cd-inventory-2000.png|61009dd3a21b1cbf6744d26b2ca2c7bf854084dbb52f9f0f8496b61bea477266",
  "docs/previews/progression/stage-cd-inventory-768.png|beac5cca7f3e31036beedf4e45c9b8b16fe0070969979e18a7e98364aa800aed",
  "docs/previews/progression/stage-cd-main-1024.png|856bec664763a30bbab6776d3036ab6dc4f3a6b7464aa748a2a08c7f7e9777b8",
  "docs/previews/progression/stage-cd-main-1194.png|9125d0d732044892b1a17f793f4538e95a4f65132b1331373b3602942a14ef34",
  "docs/previews/progression/stage-cd-main-2000.png|aa8a354187faea778f5126910c7e1ccbf3ca97586fc7095d11652348b581f621",
  "docs/previews/progression/stage-cd-main-768.png|5534b12f49f75fcb40be5eb72dfb9295eff62d1db9d3b04e30abd1878df08b4b",
  "docs/previews/progression/worksheet-1024.png|37f15123a180f5cd32a795d173003b83699598a8dac7b9d9b46684bc27579f75",
  "docs/previews/progression/worksheet-1194.png|2b49b4bf4f0d999646267310e9417278e031913e13cf1013ed40c161e7bdd4a7",
  "docs/previews/progression/worksheet-1280.png|2f6b0bfd67fec47eafab1cea6f997cac9f072ba42c365d1ed66e66a090422a52",
  "docs/previews/progression/worksheet-2000.png|8fc9f067b414e16edda7fe3da28b203207a3a2a2cc929f34a6abbfa5320102a9",
  "docs/previews/progression/worksheet-390.png|e4cc7a7b52ba0e446a7a5be0b7a49fe8103bc4e1d41aa9a122c47d56e9e26d7a",
  "docs/previews/progression/worksheet-768.png|c26fd8da51d50ded2a17edf8b9ae66bdc0acc4efce3ca964a04a6b77cf3a7f8c",
  "docs/previews/progression/worksheet-product-1024.png|fd274ce78a61ed8aee1afee4e8fb97de2cdfb77acbc03bcc54255d86e22a10b6",
  "docs/previews/progression/worksheet-product-1194.png|663bade0da88226e5ebcc3ba211ab6b9f31c319e071facd6646d6b72b321fbdd",
  "docs/previews/progression/worksheet-product-2000.png|798997fb1ceed8a81d3a5f9440d190147fb52be463508724c29bb75118b7b10b",
  "docs/previews/progression/worksheet-product-768.png|158a9c87b4f7602b74334895ca0e4f09aff1bef0bfc2f4d36a8870fb1cc9d92b",
  "docs/previews/tablet-ux/after/edge-add-rows.png|4860e2f4722ce40390eb4bd22dc0613cc53ac76c9c2937b2412df30e3c3103a5",
  "docs/previews/tablet-ux/after/edge-available-unbox.png|aca26d8986053d6c9e84634373c68d16e9724a82dfe738df22fdfa72c840e8cf",
  "docs/previews/tablet-ux/after/edge-claim.png|dbd423107e2017cc02e1c57996b7ed14bdca4ed07a5c69ad4add267613f30d7d",
  "docs/previews/tablet-ux/after/edge-collection-1024.png|3da25cbac085efc6c2332f588fe83fc54d36f58e497ef49a578edee8ecff2495",
  "docs/previews/tablet-ux/after/edge-collection-834.png|8a8280b9bfe8823390b710a55434a2a010c772d4f4aee3b00f32226b2d344b27",
  "docs/previews/tablet-ux/after/edge-crown-discovery.png|5bec941b1c2e7d8fef17f1454fc0b6dbed3c5d47ef309e6d2649956fe586ba66",
  "docs/previews/tablet-ux/after/edge-details-1024.png|edb03171f62cd68ebdd91810aa8dfc53c03bde333310ad0955eac222122ac23c",
  "docs/previews/tablet-ux/after/edge-details-1194.png|08831e1286dddaaa34f9ebf0ebf068fc5894ae8dfe955f7cefb1a8f14060c29e",
  "docs/previews/tablet-ux/after/edge-details-2000.png|18e9e07c42d59a73b23012aaf9293cec9cec2bfbd22e3314ddf1d2ae67818ad5",
  "docs/previews/tablet-ux/after/edge-details-768.png|861dd7e56203b926c93fa056214230073f7c06b4592008cb89882edfcab85e59",
  "docs/previews/tablet-ux/after/edge-details-834.png|eedd823c75a2f96492cfb20dc14f0a547d823e0fc440d5625a69048f93acfbed",
  "docs/previews/tablet-ux/after/edge-fresh-2000.png|9c4af476e3dabb672ad4ca6e476d45796e26890f69b6355c4814d3e1a7fecc3a",
  "docs/previews/tablet-ux/after/edge-packages.png|26b57d62982209bc274d2a10ed49fa0ea3b1227de65bec010812d9bafd77decd",
  "docs/previews/tablet-ux/after/edge-worksheet-1024.png|be6a74ddc882db4a497134e27e119d0deb5a84880f49107b15e1aa71ef3e80e8",
  "docs/previews/tablet-ux/after/edge-worksheet-1194.png|207c3abf54dc9e97e5e6a6fbe757188fa13f3644de660e9fdb32d7d17c88124f",
  "docs/previews/tablet-ux/after/edge-worksheet-2000.png|067f58d1a4ce1e9c3880ba887c334269bf727258bbee5300d4fb91e2b2df5f55",
  "docs/previews/tablet-ux/after/edge-worksheet-768.png|38a36406cc5280e81976036dc3dc1db5459bb60d82ab96d2acb1087b0033b947",
  "docs/previews/tablet-ux/after/edge-worksheet-834.png|e4f95daee81d100fd3c4424054d0f11cdbce6d36f87583f32e9b4536ec08a6c5",
  "docs/previews/tablet-ux/after/edge-worksheet-error.png|726ed89bde1acaa89b0c07809d63e0a2785506e82f2380d29616865c0e5128b0",
  "docs/previews/tablet-ux/after/webkit-available-unbox.png|c994a1f6f3aec67613d17157b31b49aae49533debc0a07674f68c6957aaa32ac",
  "docs/previews/tablet-ux/after/webkit-collection-1024.png|69b62d0a7570a72bb59ec990496cfc8520c5fae0285ee2b77bbe41c37eb7e7fe",
  "docs/previews/tablet-ux/after/webkit-collection-1194.png|f3b8a28926410e497d7e80571fafaecaec4852d6ae1351cf3228b7e849823c1a",
  "docs/previews/tablet-ux/after/webkit-collection-2000.png|98f61844a31a12d37d97c8074bfc505625ef9b6a64ee9228cf8dd492bd919858",
  "docs/previews/tablet-ux/after/webkit-collection-768.png|75f52e6b35d8c95c676ee24b4975bf6788d120931b348d368d8bf3b0c307e383",
  "docs/previews/tablet-ux/after/webkit-collection-834.png|bea47c70d2191ce9c37ee144479da9d9f02e6c310fd410e1868bfe119f6439d2",
  "docs/previews/tablet-ux/after/webkit-crown-discovery.png|3151f8d30e50097852b100712c6a702123534d3bb5851ea90a93cf613f2880b1",
  "docs/previews/tablet-ux/after/webkit-details-1194.png|9d77c6c40e8bef87fc00a55d9d75156df19d640fb3ec504520f2c3b5ec013811",
  "docs/previews/tablet-ux/after/webkit-details-2000.png|07f4b0afa896d3b5694c938605212a47d0f658a9fdfe4afea2faf96a6e6a73da",
  "docs/previews/tablet-ux/after/webkit-details-768.png|97bc4a3a1d0da01df80368f380217dc554bc0bab354c973620ca49dd16bd8d5f",
  "docs/previews/tablet-ux/after/webkit-details-834.png|47bf59d49335b93db89ff305b0eac20a6d9b9a9e24454867859f766f27386b10",
  "docs/previews/tablet-ux/after/webkit-failure.png|29b0819f962308878e53217cb274dcb926b45e6b606023aacc5315466db721e8",
  "docs/previews/tablet-ux/after/webkit-fresh-2000.png|8ae15b1c458ee247ccdb92a4e57fd1993c67e73c3335a2cc2fd1ec33b24c3ed4",
  "docs/previews/tablet-ux/after/webkit-worksheet-1024.png|bd2dd259d6f4faf551b201c534b4956871ce28a218a3e4f1ee9672175e9443e2",
  "docs/previews/tablet-ux/after/webkit-worksheet-1194.png|15332c0d93b07664e6cd1c395d6c91ce074549a4935574e58ee1c6303e63b757",
  "docs/previews/tablet-ux/after/webkit-worksheet-2000.png|8d92a8f0d83fb76de3fe2a49d47ea7a5856774ddd2ef713d2c470d1fd28805b1",
  "docs/previews/tablet-ux/after/webkit-worksheet-768.png|7b590b4dac60b9a3e5a7f0de56d0d2474d3a5e47317d0187068b0ccfced6891e",
  "docs/previews/tablet-ux/after/webkit-worksheet-834.png|db9749db49d72e7e9c932f059ab4d11bd13f176bf3b0999eb889a88be109523a",
  "docs/previews/tablet-ux/before/edge-sum-guide-off.png|9011171fe828c5344e5a22c7c316a7b77e03b2144d497c0ed37a2230446b7993",
  "docs/previews/tablet-ux/before/edge-unbox-empty-selection.png|a59d7ad7d2896290286c507fd6e22d222be54f0726638527a8776c813ce78b59",
];

const OMIT_DIRS = new Set(['.git', 'node_modules', '.test-tools', 'output',
  'dist', 'build', '.gradle', '.venv', '__pycache__', '.pytest_cache']);
const SOURCE_EXTENSIONS = new Set(['.md', '.js', '.mjs', '.cjs', '.ts', '.tsx',
  '.jsx', '.html', '.css', '.scss', '.py', '.txt', '.json', '.xml']);

async function referenceText() {
  const chunks = [], runtimeChunks = [];
  async function visit(folder) {
    for (const item of await readdir(folder, { withFileTypes: true })) {
      if (item.isDirectory()) {
        if (!OMIT_DIRS.has(item.name)) await visit(join(folder, item.name));
      } else if (item.isFile()) {
        if (!SOURCE_EXTENSIONS.has(extname(item.name).toLowerCase())) continue;
        if (item.name === 'cleanup-unused-previews.mjs') continue; // manifest, not a usage
        if (item.name === 'PREVIEW_CLEANUP.md') continue;
        const p = join(folder, item.name);
        try {
          const s = await stat(p);
          if (s.size > 4_000_000) continue; // reports/data are not image references
          const content = await readFile(p, 'utf8');
          chunks.push(content);
          const rel = p.slice(root.length + 1).replaceAll('\\', '/');
          if (/^(src|styles|worksheet|android)\//.test(rel) || rel === 'index.html')
            runtimeChunks.push(content);
        } catch (e) { console.warn('Could not read reference file:', p, e.message); }
      }
    }
  }
  await visit(root);
  return { allText: chunks.join('\n'), runtimeText: runtimeChunks.join('\n') };
}

async function eligible() {
  const { allText, runtimeText } = await referenceText();
  const matches = [], skipped = { absent: 0, changed: 0, referenced: 0 };
  for (const entry of expected) {
    const [relative, expectedHash] = entry.split('|');
    if (!/^docs\/previews\/[a-zA-Z0-9._\/-]+\.png$/.test(relative))
      throw new Error('Unsafe manifest path: ' + relative);
    const abs = resolve(root, relative);
    if (!abs.startsWith(PREVIEW_DIR + sep))
      throw new Error('Manifest path escaped previews: ' + relative);
    let bytes;
    try { bytes = await readFile(abs); }
    catch (err) {
      if (err.code === 'ENOENT') { skipped.absent++; continue; }
      throw err;
    }
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== expectedHash) { skipped.changed++; continue; }
    const short = relative.slice('docs/'.length);
    // Explicit references in docs or source (including any newly added paths).
    // A filename alone is also treated as a reference to favor preservation.
    if (allText.includes(relative) || allText.includes(short) ||
        runtimeText.includes(basename(relative))) {
      skipped.referenced++; continue;
    }
    matches.push({ absolute: abs, bytes: bytes.length });
  }
  return { matches, skipped };
}

async function addIgnoreRules() {
  const ignore = join(root, '.gitignore');
  let text = await readFile(ignore, 'utf8').catch(e => {
    if (e.code === 'ENOENT') return '';
    throw e;
  });
  const rules = [
    'docs/previews/',  // new generated screenshots; already tracked references stay tracked
    'output/',
    'playwright-report/',
    'test-results/',
    '__pycache__/',
    '.pytest_cache/',
    '*.py[cod]',
    '.gradle/',
    'android/.gradle/',
    'android/**/build/'
  ];
  const existing = new Set(text.split(/\r?\n/).map(s => s.trim()));
  const missing = rules.filter(r => !existing.has(r));
  if (missing.length) {
    const suffix = (text.endsWith('\n') || !text ? '' : '\n') +
      '\n# Generated screenshots and temporary build/test artifacts.\n' +
      missing.join('\n') + '\n';
    await appendFile(ignore, suffix, 'utf8');
  }
  return missing.length;
}

const { matches, skipped } = await eligible();
const mib = (matches.reduce((sum, file) => sum + file.bytes, 0) / 1048576).toFixed(1);
console.log(`Audited: ${expected.length} snapshots. Safe to remove: ${matches.length} (${mib} MiB).`);
console.log(`Preserved: ${skipped.changed} changed, ${skipped.referenced} referenced, ${skipped.absent} already absent.`);
if (process.argv.includes('--dry-run')) process.exit(0);

const arg = process.argv.indexOf('--backup');
if (arg < 0 || !process.argv[arg + 1]) throw new Error('Missing pre-cleanup backup ZIP. Aborting.');
const backup = resolve(process.argv[arg + 1]);
const backupInfo = await stat(backup);
if (!backupInfo.isFile() || backupInfo.size < 1024) throw new Error('Backup ZIP is missing/empty. Aborting.');

let removed = 0;
for (const file of matches) {
  await unlink(file.absolute);
  removed++;
}
const ignored = await addIgnoreRules();
console.log(`Removed ${removed} verified, unreferenced preview screenshots.`);
console.log(`Updated .gitignore (${ignored} new rules).`);
console.log(`Backup: ${backup}`);
console.log('No gameplay/Co-Baker source files or runtime assets were modified.');
