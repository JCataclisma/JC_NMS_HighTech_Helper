"use strict";

const STORAGE_KEY = "nms-hightech-helper-v2";
const LANGUAGE_KEY = "nms-hightech-helper-language";
const THEME_KEY = "nms-hightech-helper-theme";
let language = localStorage.getItem(LANGUAGE_KEY) === "pt-BR" ? "pt-BR" : "en";
let theme = localStorage.getItem(THEME_KEY) === "purple" ? "purple" : "green";
const TEST_INVENTORY = {
  geodesite: 2, fusion_accelerant: 29, mordite: 7868, fungal_mould: 500, cactus_flesh: 791,
  nitrogen: 750, condensed_carbon: 7653, frost_crystal: 400, sulphurine: 1000, radon: 0,
  solanium: 0, star_bulb: 0, dirty_bronze: 5, herox: 10, lemmium: 0, pyrite: 225,
  pure_ferrite: 799, ammonia: 5535, ionized_cobalt: 0, uranium: 0, lubricant: 12,
  glass: 278, faecium: 6865, gamma_root: 1555, paraffinium: 2001, phosphorus: 0, dioxite: 4928
};
const itemById = Object.fromEntries(NMS_ITEMS.map(item => [item.id, item]));
let inventory = loadInventory();
let screenshots = [];
let saveCandidates = [];
let inventorySources = loadInventorySources();
let lastCalculation = null;
let inventoryFilter = "relevant";
let inventorySearch = "";
let corvetteParts = { player: {}, container: {}, cache: {}, saveFile: "", cacheSlots: 0 };
let showAllCorvetteParts = false;
let baseOperations = { bases: [], saveFile: "" };
let baseSearch = "";
let baseTypeFilter = "all";
let showOnlyExtractors = true;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function t(text) { return language === "pt-BR" ? (NMS_I18N.ui[text] || NMS_I18N.corvetteUi?.[text] || text) : text; }
function localizedName(id, englishName) { return language === "pt-BR" ? (NMS_I18N.items[englishName] || englishName) : englishName; }
function applyTheme() { const purple = theme === "purple"; document.body.dataset.theme = theme; document.body.classList.toggle("theme-purple", purple); document.documentElement.dataset.theme = theme; const button = $("#themeToggle"); if (button) { button.setAttribute("aria-pressed", String(purple)); button.title = language === "pt-BR" ? (purple ? "Mudar para o tema verde" : "Mudar para o tema roxo") : (purple ? "Switch to dark-green theme" : "Switch to dark-purple theme"); $("#themeToggleLabel").textContent = language === "pt-BR" ? (purple ? "Verde" : "Roxo") : (purple ? "Green" : "Purple"); } }
function applyLanguage() {
  document.documentElement.lang = language === "pt-BR" ? "pt-BR" : "en";
  document.title = language === "pt-BR" ? "NMS HighTech Helper · Português" : "NMS HighTech Helper";
  const languageLabel = $("#languageLabel"); if (languageLabel) languageLabel.textContent = language === "pt-BR" ? "Idioma" : "Language";
  applyTheme();
  const staticText = {
    ".topbar p": "Offline crafting calculator", ".offline": "OFFLINE", ".context-card .eyebrow": "LOCAL UTILITY", ".context-card strong": "Crafting calculator", ".context-card span": "Inventory stays in this browser",
    '[data-view="workspace"]': "Workspace", '[data-view="data"]': "Recipe data", '[data-view="bases"]': "Base operations", ".mini-status strong": "Browser storage", ".mini-status small": "No uploads or network calls",
    "#workspaceView .view-heading .eyebrow": "CRAFTING WORKSPACE", "#workspaceView h2": "What are you building?", "#workspaceView .view-heading p": "Load a savegame or enter inventory, then calculate.",
    "label[for=saveInput]": "＋ Load savegame", "#loadTest": "Load test inventory", ".step-card:nth-child(1) .eyebrow": "INVENTORY INPUT", ".step-card:nth-child(1) h3": "Inventory screenshots", ".step-card:nth-child(1) p": "Temporarily paused while savegame reading is explored.", "#addScreenshot": "＋ Add screenshot",
    ".step-card:nth-child(2) .eyebrow": "VERIFICATION", ".step-card:nth-child(2) h3": "Detected inventory", ".step-card:nth-child(2) p": "No entries yet", ".step-card:nth-child(3) .eyebrow": "CALCULATION", ".step-card:nth-child(3) h3": "Crafting target", ".step-card:nth-child(3) p": "Choose a product and quantity below.",
    "#savePanel .eyebrow": "SAVEGAME INPUT", "#savePanel h3": "Choose a save candidate", ".verification-panel .notice p": "Screenshot input is temporarily disabled. Inventory can still be entered manually while savegame reading is explored.",
    ".verification-panel .eyebrow": "CHECK BEFORE CALCULATING", ".verification-panel h3": "Detected inventory", "#addManual": "＋ Add item manually", ".target-panel .eyebrow": "CRAFTING TARGET", ".target-panel h3": "Choose what to build", "#calculateButton": "Calculate requirements",
    "#resultsPanel h3": "Your result will appear here", "#resultsPanel p": "The calculator will separate craftable components from raw resources and show every missing amount.", "#dataView .eyebrow": "REFERENCE", "#dataView h2": "Recipe data", "#dataView p": "Local, editable data powers the dependency engine."
  };
  Object.entries(staticText).forEach(([selector, text]) => { const node = $(selector); if (node) node.textContent = t(text); });
  const saveNotice = $("#savePanel .notice p"); if (saveNotice) saveNotice.innerHTML = `${t("Select one or more save*.hg files manually. The reader ignores metadata files and does not access any folder automatically.")}`;
  const product = $("#productSelect"); if (product) [...product.options].forEach(option => { option.textContent = localizedName(option.value, option.value === "fusion_ignitor" ? "Fusion Ignitor" : "Stasis Device"); });
  const selector = $("#languageSelect"); if (selector) selector.value = language;
  const source = $("#sourceSummary"); const hasPlayer = Object.keys(inventorySources.player || {}).length > 0; const hasContainer = Object.keys(inventorySources.container || {}).length > 0;
  if (source && (hasPlayer || hasContainer)) source.innerHTML = hasContainer ? `<strong>${language === "pt-BR" ? "Fontes do inventário" : "Inventory sources"}:</strong> ${language === "pt-BR" ? "inventário do jogador + contêiner fixo" : "player inventory + fixed container"} <b>${escapeHtml(inventorySources.containerName)}</b>. ${language === "pt-BR" ? "Cada linha mostra sua origem." : "Each row below shows its source breakdown."}` : `<strong>${language === "pt-BR" ? "Fonte do inventário" : "Inventory source"}:</strong> ${language === "pt-BR" ? "somente inventário do jogador. Nenhum contêiner correspondente foi encontrado, então nenhum inventário de contêiner foi incluído." : "player inventory only. No matching fixed container was found, so no container inventory was included."}`;
  const filter = $("#inventoryFilter"); if (filter) { filter.options[0].textContent = t("Needed for selected device"); filter.options[1].textContent = t("Friendly names only"); filter.options[2].textContent = t("All detected items"); filter.options[3].textContent = t("Unmapped save codes"); }
  const search = $("#inventorySearch"); if (search) search.placeholder = t("Name or save code");
  renderShots(); renderInventory(); renderRecipeSummary(); renderSaveCandidates(); renderCorvetteParts(); renderBaseOperations();
  const renderedFilter = $("#inventoryFilter"); if (renderedFilter) { renderedFilter.options[0].textContent = t("Needed for selected device"); renderedFilter.options[1].textContent = t("Friendly names only"); renderedFilter.options[2].textContent = t("All detected items"); renderedFilter.options[3].textContent = t("Unmapped save codes"); }
  const renderedSearch = $("#inventorySearch"); if (renderedSearch) renderedSearch.placeholder = t("Name or save code");
  const detected = $("#detectedSummary"); if (detected && language === "pt-BR") detected.textContent = detected.textContent.replace("item(s) detected", "item(ns) detectado(s)").replace("No entries yet", "Nenhum item ainda");
  if (lastCalculation) renderResults(lastCalculation);
}

function loadInventory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } }
function loadInventorySources() { try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY}-sources`)) || { player: {}, container: {}, containerName: "" }; } catch { return { player: {}, container: {}, containerName: "" }; } }
function saveInventory() { localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory)); localStorage.setItem(`${STORAGE_KEY}-sources`, JSON.stringify(inventorySources)); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character])); }
function canonicalId(name) { const clean = name.trim().toLowerCase().replace(/\s+/g, " "); const translated = Object.entries(NMS_I18N.items).find(([, value]) => value.toLowerCase() === clean)?.[0]; const itemId = NMS_ITEMS.find(item => item.name.toLowerCase() === clean)?.id; return NMS_ALIASES[clean] || (translated && itemId) || clean.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }
function catalogueItem(id) { const raw = String(id || "").replace(/^\^/, ""); const base = raw.split("#", 1)[0]; return NMS_SAVE_CATALOGUE[raw] || NMS_SAVE_CATALOGUE[raw.toUpperCase()] || NMS_SAVE_CATALOGUE[base] || NMS_SAVE_CATALOGUE[base.toUpperCase()] || null; }
function saveItemInfo(id) { const mapped = NMS_SAVE_ITEM_MAP[id]; const catalogue = catalogueItem(id); return mapped || catalogue ? (mapped || { id, ...catalogue }) : { id: id.toLowerCase(), name: id, unknown: true }; }
function mappedInventory(source) { return Object.entries(source).reduce((map, [rawId, quantity]) => { const item = saveItemInfo(rawId); map[item.id] = (map[item.id] || 0) + quantity; return map; }, {}); }
function isCorvettePart(id) { const raw = String(id || "").toUpperCase(); return raw === "B_MAG_1X1" || /^B_(ALK|COK|CON|CON2|DECO|GEN|HAB|HAB1|LND|MAG|SHL|STR|TRU|TUR|WNG)(?:_|$)/.test(raw); }
function corvetteUniverse() { const parts = Object.entries(NMS_SAVE_CATALOGUE).filter(([id, item]) => isCorvettePart(id) && item?.category === "BUILDING_PART"); if (!parts.some(([id]) => id === "B_MAG_1X1")) parts.push(["B_MAG_1X1", { name: "Tractor Beam", category: "BUILDING_PART" }]); return parts; }
function corvetteItemName(id) { return id === "B_MAG_1X1" ? localizedName(id, "Tractor Beam") : itemDisplay(id); }
function renderCorvetteParts() { const node = $("#corvettePartsRows"); if (!node) return; const player = corvetteParts.player || {}, container = corvetteParts.container || {}, cache = corvetteParts.cache || {}; const ids = new Set([...Object.keys(player), ...Object.keys(container), ...Object.keys(cache), ...corvetteUniverse().map(([id]) => id)]); const rows = [...ids].filter(isCorvettePart).map(id => ({ id, name: corvetteItemName(id), player: player[id] || 0, container: container[id] || 0, cache: cache[id] || 0 })).filter(row => showAllCorvetteParts || row.player || row.container).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)); const ownedCount = [...ids].filter(id => (player[id] || 0) > 0 || (container[id] || 0) > 0).length; const summary = $("#corvetteSummary"); if (summary) summary.textContent = corvetteParts.saveFile ? `${ownedCount} owned part${ownedCount === 1 ? "" : "s"} detected · ${corvetteParts.cacheSlots} station-cache slots read` : "Load a savegame to inspect Corvette parts."; const toggle = $("#toggleCorvetteParts"); if (toggle) toggle.textContent = showAllCorvetteParts ? "Show owned only" : "Show all parts (including 0)"; node.innerHTML = rows.length ? `<div class="corvette-list-head"><span>Part</span><span>Player</span><span>Stasis</span><span>Cache</span></div>${rows.map(row => `<div class="corvette-row ${row.player || row.container ? "owned" : "zero"}"><div><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.id)}</small></div><b>${row.player.toLocaleString()}</b><b>${row.container.toLocaleString()}</b><b>${row.cache.toLocaleString()}</b></div>`).join("")}` : `<div class="empty-state">${corvetteParts.saveFile ? "No Corvette parts are in the player inventory or detected fixed container." : "Load a savegame to inspect Corvette parts."}</div>`; }
function sourceLabel(id) { const player = inventorySources.player[id] || 0, container = inventorySources.container[id] || 0; if (!player && !container) return language === "pt-BR" ? "entrada manual/local" : "manual/local entry"; const parts = []; if (player) parts.push(`${language === "pt-BR" ? "jogador" : "player"} ${player.toLocaleString()}`); if (container) parts.push(`${inventorySources.containerName || (language === "pt-BR" ? "contêiner fixo" : "fixed container")} ${container.toLocaleString()}`); return parts.join(" + "); }
function itemDisplay(id) { const mapped = NMS_SAVE_ITEM_MAP[id.toUpperCase()]; const english = mapped?.name || itemById[id]?.name || catalogueItem(id)?.name || id; return localizedName(id, english); }
function showView(view) { $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === view)); $$(".view").forEach(section => section.classList.toggle("active", section.id === `${view}View`)); }
function inferredBaseResource(name) {
  const text = String(name || "");
  const known = ["phosphorus", "indium", "gold", "copper", "activated copper", "uranium", "radon", "dioxite", "cobalt", "paraffinium", "oxygen", "pyrite", "sulphurine", "cadmium", "emeril", "ammonia", "sodium", "sulphurine", "methane", "helium", "silver", "salt", "magnetised ferrite", "ferrite dust"];
  return known.filter((value, index, values) => values.indexOf(value) === index && text.toLowerCase().includes(value)).map(value => value.replace(/\b\w/g, character => character.toUpperCase())).join(" + ") || "Resource unresolved";
}
function baseAddressHex(base) { return String(base.addressHex || "").replace(/^0x/i, "").toUpperCase(); }
function basePortalCode(base) { const hex = baseAddressHex(base); if (hex.length === 12) return hex; return hex.length > 12 ? `${hex.slice(0, 4)}${hex.slice(6)}` : hex.padStart(12, "0"); }
function baseKindLabel(base) { if (base.isSpaceStation) return "Player-owned space station"; if (base.baseType === "PlayerSpaceBase") return "Player orbital/space base"; if (base.baseType === "FreighterBase") return "Freighter base"; if (base.baseType === "PlayerShipBase") return "Corvette / ship base"; return "Planetary base"; }
function estimatedBaseCapacity(base) { return ((Number(base.counts?.mineral) || 0) + (Number(base.counts?.gas) || 0)) * 250 + (Number(base.counts?.silos) || 0) * 1000; }
function estimatedNetworkCapacity(network) { return ((Number(network.mineral) || 0) + (Number(network.gas) || 0)) * 250 + (Number(network.silos) || 0) * 1000; }
function networkTypeLabel(network) { if ((network.mineral || 0) > 0 && (network.gas || 0) > 0) return "Mixed candidate network"; if ((network.mineral || 0) > 0) return "Mineral candidate network"; if ((network.gas || 0) > 0) return "Gas candidate network"; return "Silo-only / unverified"; }
function networkCapacityMarkup(base) { const groups = Array.isArray(base.networkGroups) ? base.networkGroups : []; if (!groups.length) return ""; return `<div class="base-network-estimates"><small>Separated potential capacity · candidate networks</small>${groups.map(network => { const capacity = estimatedNetworkCapacity(network); const label = networkTypeLabel(network); return `<div class="base-network-row"><span><b>Key ${network.key.toString(16).toUpperCase()}</b> · ${label}</span><strong>${capacity.toLocaleString()} units</strong><small>${network.mineral} mineral extractors · ${network.gas} gas extractors · ${network.silos} silos · ${network.pipelines} pipelines${network.mineral + network.gas === 0 ? " · not linked to an extractor in this save" : ""}</small></div>`; }).join("")}<small class="base-capacity-note">Estimated only: 250 units per extractor and 1,000 per silo; not current storage.</small></div>`; }
function portalGlyphPreview(code) { return [...String(code || "")].map((digit, index) => `<span class="portal-glyph-tile" title="Glyph ${index + 1}: ${digit}"><i class="portal-glyph-shape shape-${digit}"></i><b>${digit}</b></span>`).join(""); }
function portalCodeMarkup(base) { const code = basePortalCode(base); return code ? `<div class="portal-code-wrap"><button class="portal-code-trigger" type="button" aria-label="Show portal glyphs for ${escapeHtml(code)}">Portal code: <b>${escapeHtml(code)}</b><span>⌄</span></button><div class="portal-glyph-popover" role="tooltip"><div class="portal-glyph-grid">${portalGlyphPreview(code)}</div><small>Hover, focus, or tap the code to preview its 12 glyph positions.</small></div></div>` : "<small>Portal code: unavailable</small>"; }
function capacityMarkup(base) { const capacity = estimatedBaseCapacity(base); const basic = capacity ? `<small class="base-capacity-note">Estimated potential capacity: <b>${capacity.toLocaleString()} units</b> · not current storage</small>` : ""; return `${basic}${networkCapacityMarkup(base)}`; }
function renderBaseOperations() {
  const node = $("#baseOperationsRows"); if (!node) return;
  const bases = baseOperations.bases || [];
  const filtered = bases.filter(base => {
    const matchesType = baseTypeFilter === "all" || (baseTypeFilter === "mineral" && base.counts.mineral) || (baseTypeFilter === "gas" && base.counts.gas) || (baseTypeFilter === "storage" && base.counts.silos) || (baseTypeFilter === "station" && base.isSpaceStation);
    const haystack = `${base.name} ${base.system} ${base.planet} ${base.baseType} ${baseAddressHex(base)} ${basePortalCode(base)} ${inferredBaseResource(base.name)}`.toLowerCase();
    return matchesType && (!showOnlyExtractors || base.hasExtractor || (baseTypeFilter === "station" && base.isSpaceStation)) && (!baseSearch || haystack.includes(baseSearch));
  });
  const summary = $("#baseOperationsSummary");
  if (summary) summary.textContent = baseOperations.saveFile ? `${filtered.length} shown of ${bases.length} bases · ${bases.filter(base => base.hasExtractor).length} with extractors · ${bases.filter(base => base.isSpaceStation).length} owned stations` : "Load a savegame to inspect player bases.";
  node.innerHTML = filtered.length ? filtered.map(base => `<article class="base-operation-row"><div class="base-operation-title"><strong>${escapeHtml(base.name)}</strong><small>${escapeHtml(baseKindLabel(base))} · record ${base.index + 1}</small><small>${base.isSpaceStation ? "Galaxy/system names require discovery-name mapping" : escapeHtml(inferredBaseResource(base.name))}</small><small>Address: ${escapeHtml(baseAddressHex(base) || "unavailable")}</small>${portalCodeMarkup(base)}${capacityMarkup(base)}</div><div class="base-operation-counts"><span><b>${base.counts.mineral}</b><small>Mineral extractors</small></span><span><b>${base.counts.gas}</b><small>Gas extractors</small></span><span><b>${base.counts.silos}</b><small>Silos</small></span><span><b>${base.counts.pipelines}</b><small>Pipelines</small></span></div></article>`).join("") : `<div class="empty-state">${baseOperations.saveFile ? "No bases match the current filters." : "Load a savegame to inspect player-owned bases and extractors."}</div>`;
}
function toast(message) { const node = $("#toast"); node.textContent = message; node.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove("show"), 2600); }
function renderShots() { $("#screenshotGrid").innerHTML = Array.from({ length: 3 }, (_, index) => screenshots[index] ? `<div class="screenshot-slot"><img src="${screenshots[index].url}" alt="Inventory screenshot ${index + 1}"><div class="slot-caption">Screenshot ${index + 1} - local only</div><button class="remove-shot" data-remove-shot="${index}" title="Remove" disabled>x</button></div>` : `<div class="screenshot-slot empty"><button data-add-slot="${index}" disabled><strong>+ Screenshot ${index + 1}</strong><br><small>Paused</small></button></div>`).join(""); }
function addImages(files) { [...files].slice(0, 3 - screenshots.length).forEach(file => { if (file.type.startsWith("image/")) screenshots.push({ name: file.name, url: URL.createObjectURL(file) }); }); renderShots(); if (files.length) toast("Image loaded locally. Verify inventory rows below."); }
function formatSaveDate(timestamp) { return timestamp ? new Date(timestamp).toLocaleString() : "date unavailable"; }
function renderSaveCandidates() { const node = $("#saveCandidates"); if (!saveCandidates.length) { node.innerHTML = `<div class="empty-state">Choose a savegame to inspect its inventory and named storage containers.</div>`; return; } node.innerHTML = saveCandidates.map((result, index) => { const matches = result.matchingContainers; const status = result.error ? `Read error: ${escapeHtml(result.error)}` : matches.length === 1 ? `Player inventory: found (${result.playerInventorySlots} slots) · Fixed container: found — ${escapeHtml(matches[0].name)}` : matches.length ? `Player inventory: found (${result.playerInventorySlots} slots) · ${matches.length} matching fixed containers — selection blocked` : `Player inventory: found (${result.playerInventorySlots} slots) · Fixed container: not found`; return `<article class="save-candidate"><div><strong>${escapeHtml(result.fileName)}</strong><small>${result.size.toLocaleString()} bytes · ${escapeHtml(formatSaveDate(result.lastModified))} · version ${escapeHtml(result.version)}</small><small>Platform: ${escapeHtml(result.platform)} · ${escapeHtml(status)}</small></div><button class="secondary-button" data-select-save="${index}" ${matches.length <= 1 && !result.error ? "" : "disabled"}>Use this save</button></article>`; }).join(""); }
function useSaveCandidate(index) { const result = saveCandidates[index]; if (!result || result.matchingContainers.length > 1 || result.error) return; const container = result.matchingContainers[0] || null; inventorySources = { player: mappedInventory(result.playerInventory), container: container ? mappedInventory(container.inventory) : {}, containerName: container ? container.name : "" }; inventory = { ...inventorySources.player }; Object.entries(inventorySources.container).forEach(([id, quantity]) => { inventory[id] = (inventory[id] || 0) + quantity; }); saveInventory(); renderInventory(); if (!container) { $("#saveStatus").textContent = `${result.fileName} · player inventory only`; $("#sourceSummary").innerHTML = `<strong>Inventory source:</strong> player inventory only. No matching fixed container was found, so no container inventory was included.`; toast("Save loaded with player inventory only. No fixed container was included."); return; } $("#saveStatus").textContent = `${result.fileName} · ${container.name}`; $("#sourceSummary").innerHTML = `<strong>Inventory sources:</strong> player inventory + fixed container <b>${escapeHtml(container.name)}</b>. Each row below shows its source breakdown.`; toast(`Save loaded with ${container.name}. Verify the inventory rows.`); }
async function inspectSaveFiles(files) { saveCandidates = []; $("#saveStatus").textContent = "Reading save..."; renderSaveCandidates(); const selected = [...files].filter(file => /^save\d*\.hg$/i.test(file.name)); if (!selected.length) { $("#saveStatus").textContent = "No save*.hg selected"; toast("Choose save.hg, save2.hg, save3.hg, and so on. Metadata files are ignored."); return; } for (const file of selected) { try { saveCandidates.push(await NMS_SAVE_READER.parse(file, await file.arrayBuffer())); } catch (error) { saveCandidates.push({ fileName: file.name, size: file.size, lastModified: file.lastModified, version: "unreadable", platform: "-", playerInventorySlots: 0, matchingContainers: [], error: error.message, playerInventory: {} }); } } $("#saveStatus").textContent = `${saveCandidates.length} save candidate${saveCandidates.length === 1 ? "" : "s"}`; renderSaveCandidates(); }
function useSaveCandidate(index) { const result = saveCandidates[index]; if (!result || result.matchingContainers.length > 1 || result.error) return; const container = result.matchingContainers[0] || null; corvetteParts = { player: result.playerInventory || {}, container: container ? container.inventory : {}, cache: result.corvetteCache || {}, saveFile: result.fileName, cacheSlots: result.corvetteCacheSlots || 0 }; renderCorvetteParts(); inventorySources = { player: mappedInventory(result.playerInventory), container: container ? mappedInventory(container.inventory) : {}, containerName: container ? container.name : "" }; inventory = { ...inventorySources.player }; Object.entries(inventorySources.container).forEach(([id, quantity]) => { inventory[id] = (inventory[id] || 0) + quantity; }); saveInventory(); renderInventory(); if (!container) { $("#saveStatus").textContent = `${result.fileName} · player inventory only`; $("#sourceSummary").innerHTML = `<strong>Inventory source:</strong> player inventory only. No matching fixed container was found, so no container inventory was included.`; toast("Save loaded with player inventory only. No fixed container was included."); return; } $("#saveStatus").textContent = `${result.fileName} · ${container.name}`; $("#sourceSummary").innerHTML = `<strong>Inventory sources:</strong> player inventory + fixed container <b>${escapeHtml(container.name)}</b>. Each row below shows its source breakdown.`; toast(`Save loaded with ${container.name}. Verify the inventory rows.`); }
function recipeDependencyIds(productId) { const ids = new Set(); const visit = id => { if (ids.has(id)) return; ids.add(id); Object.keys(NMS_RECIPES[id]?.ingredients || {}).forEach(visit); }; visit(productId); return ids; }
function ensureInventoryToolbar() { if ($("#inventoryToolbar")) return; $("#inventoryRows").insertAdjacentHTML("beforebegin", `<div class="inventory-toolbar" id="inventoryToolbar"><label>Filter<select id="inventoryFilter"><option value="relevant">Needed for selected device</option><option value="named">Friendly names only</option><option value="all">All detected items</option><option value="unknown">Unmapped save codes</option></select></label><label class="inventory-search">Search<input id="inventorySearch" type="search" placeholder="Name or save code"></label><span id="inventorySummary">No entries yet</span></div>`); $("#inventoryFilter").value = inventoryFilter; $("#inventoryFilter").addEventListener("change", event => { inventoryFilter = event.target.value; renderInventory(); }); $("#inventorySearch").addEventListener("input", event => { inventorySearch = event.target.value.trim().toLowerCase(); renderInventory(); }); }
function renderInventory() { ensureInventoryToolbar(); const allRows = Object.entries(inventory).filter(([, quantity]) => Number(quantity) >= 0).sort(([a], [b]) => itemDisplay(a).localeCompare(itemDisplay(b))); const relevant = recipeDependencyIds($("#productSelect")?.value || "fusion_ignitor"); const rows = allRows.filter(([id]) => { const name = itemDisplay(id), named = Boolean(NMS_SAVE_ITEM_MAP[id.toUpperCase()] || itemById[id] || catalogueItem(id)); const filterMatch = inventoryFilter === "all" || (inventoryFilter === "relevant" && relevant.has(id)) || (inventoryFilter === "named" && named) || (inventoryFilter === "unknown" && !named); return filterMatch && (!inventorySearch || `${name} ${id}`.toLowerCase().includes(inventorySearch)); }); $("#detectedSummary").textContent = allRows.length ? `${allRows.length} item(s) detected` : "No entries yet"; $("#inventorySummary").textContent = `${rows.length} shown of ${allRows.length}`; $("#inventoryRows").innerHTML = rows.length ? rows.map(([id, quantity]) => `<div class="inventory-row" data-row-id="${escapeHtml(id)}"><div><input class="item-name" value="${escapeHtml(itemDisplay(id))}" aria-label="Item name"><span class="row-confidence">${escapeHtml(sourceLabel(id))} · save code: ${escapeHtml(id)}${catalogueItem(id) ? ` · ${escapeHtml(catalogueItem(id).kind)}` : " · unrecognized save object"}</span></div><div class="qty"><input class="item-quantity" type="number" min="0" step="1" value="${Number(quantity)}" aria-label="Quantity"></div><button class="remove-row" data-remove-row="${escapeHtml(id)}" title="Remove item">x</button></div>`).join("") : `<div class="empty-state">No items match this view. Try “All detected items” or clear the search.</div>`; }
function syncInventoryFromDom() { const next = {}; $$(".inventory-row").forEach(row => { const name = row.querySelector(".item-name").value; const quantity = Math.max(0, Math.floor(Number(row.querySelector(".item-quantity").value) || 0)); const id = canonicalId(name); if (id) next[id] = (next[id] || 0) + quantity; }); inventory = next; saveInventory(); renderInventory(); }
function addManualRow() { const id = `new_item_${Date.now()}`; inventory[id] = 0; renderInventory(); const input = $(".inventory-row:last-child .item-name"); if (input) { input.value = ""; input.focus(); } }
function loadTestInventory() { inventory = { ...TEST_INVENTORY }; inventorySources = { player: {}, container: {}, containerName: "" }; saveInventory(); renderInventory(); $("#sourceSummary").textContent = "Inventory source: built-in test fixture. No savegame or fixed container is active."; toast("Test inventory loaded. Recipe requirements were not added to it."); }
function renderResults(result) { const row = item => `<div class="result-row"><div><strong>${escapeHtml(itemDisplay(item.id))}</strong><small>${t("Required")} ${item.required.toLocaleString()} - ${t("Available")} ${item.available.toLocaleString()}</small></div><span class="result-values"><b>${item.covered.toLocaleString()}</b><small>${t("covered")}</small></span><span class="result-values"><b>${item.required.toLocaleString()}</b><small>${t("required")}</small></span><span class="result-missing ${item.missing ? "bad" : ""}">${item.missing ? `-${item.missing.toLocaleString()}` : t("OK")}</span></div>`; const section = (title, rows, empty) => `<div class="result-section"><h4>${t(title)}</h4>${rows.length ? rows.map(row).join("") : `<div class="empty-state">${t(empty)}</div>`}</div>`; $("#resultsPanel").innerHTML = `<div class="result-head"><div><div class="eyebrow">CALCULATION RESULT</div><h3>${escapeHtml(itemDisplay(result.final.id))} x ${result.amount}</h3><p>${result.possible ? t("Every requirement is covered by this inventory.") : t("Gather the missing amounts before crafting.")}</p></div><span class="result-status ${result.possible ? "good" : ""}">${result.possible ? t("READY TO CRAFT") : t("NOT ENOUGH RESOURCES")}</span></div><div class="result-grid">${section("INTERMEDIATE COMPONENTS", result.intermediate, "No intermediate components.")}${section("RAW RESOURCES", result.raw, "No raw resources.")}</div>`; }
function calculate() { syncInventoryFromDom(); const amount = Math.max(1, Math.min(999, Math.floor(Number($("#quantityInput").value) || 1))); $("#quantityInput").value = amount; lastCalculation = NMS_ENGINE.calculate($("#productSelect").value, amount, inventory, NMS_RECIPES, NMS_ITEMS); renderResults(lastCalculation); }
function renderRecipeSummary() { $("#recipeSummary").innerHTML = Object.entries(NMS_RECIPES).map(([id, recipe]) => `<div class="recipe-chip"><strong>${escapeHtml(itemDisplay(id))}</strong><small>${Object.entries(recipe.ingredients).map(([ingredient, quantity]) => `${quantity} x ${escapeHtml(itemDisplay(ingredient))}`).join(" + ")}</small></div>`).join(""); }

document.addEventListener("click", event => { const nav = event.target.closest("[data-view]"); if (nav) showView(nav.dataset.view); const saveButton = event.target.closest("[data-select-save]"); if (saveButton) useSaveCandidate(Number(saveButton.dataset.selectSave)); const slot = event.target.closest("[data-add-slot]"); if (slot && !slot.disabled) $("#screenshotInput").click(); const removeShot = event.target.closest("[data-remove-shot]"); if (removeShot && !removeShot.disabled) { const removed = screenshots.splice(Number(removeShot.dataset.removeShot), 1)[0]; if (removed) URL.revokeObjectURL(removed.url); renderShots(); } const removeRow = event.target.closest("[data-remove-row]"); if (removeRow) { syncInventoryFromDom(); delete inventory[removeRow.dataset.removeRow]; saveInventory(); renderInventory(); } if (event.target.closest("#addManual")) addManualRow(); const testButton = event.target.closest("#loadTest"); if (testButton && !testButton.disabled) loadTestInventory(); if (event.target.closest("#calculateButton")) calculate(); if (event.target.closest("#resetApp")) { inventory = {}; inventorySources = { player: {}, container: {}, containerName: "" }; lastCalculation = null; screenshots.forEach(item => URL.revokeObjectURL(item.url)); screenshots = []; saveInventory(); renderShots(); renderInventory(); $("#sourceSummary").textContent = "No save or fixed container is currently contributing to the inventory."; $("#saveStatus").textContent = "No save selected"; $("#resultsPanel").innerHTML = `<div class="results-placeholder"><span>*</span><h3>Your result will appear here</h3><p>The calculator will separate craftable components from raw resources and show every missing amount.</p></div>`; toast("Local session reset."); } });
document.addEventListener("click", event => {
  const saveButton = event.target.closest("[data-select-save]");
  if (saveButton) {
    const selected = saveCandidates[Number(saveButton.dataset.selectSave)];
    if (selected) { baseOperations = { bases: selected.baseExtractors || [], saveFile: selected.fileName }; renderBaseOperations(); }
  }
});
$("#addScreenshot").addEventListener("click", () => $("#screenshotInput").click());
$("#screenshotInput").addEventListener("change", event => { addImages(event.target.files); event.target.value = ""; });
$("#saveInput").addEventListener("change", event => { inspectSaveFiles(event.target.files); event.target.value = ""; });
$("#inventoryRows").addEventListener("change", syncInventoryFromDom);
$("#productSelect").addEventListener("change", renderInventory);
$("#languageSelect").addEventListener("change", event => { language = event.target.value === "pt-BR" ? "pt-BR" : "en"; localStorage.setItem(LANGUAGE_KEY, language); applyLanguage(); });
document.addEventListener("click", event => { if (event.target.closest("#themeToggle")) { theme = theme === "purple" ? "green" : "purple"; localStorage.setItem(THEME_KEY, theme); applyTheme(); } });
// Accept every observed B_ item as a Corvette candidate, including future IDs
// that are not yet present in the friendly-name catalogue.
function isCorvettePart(id) { return /^B_[A-Z0-9_]+$/i.test(String(id || "")); }
function corvetteUniverse() { return Object.entries(NMS_SAVE_CATALOGUE).filter(([id, item]) => /^B_[A-Z0-9_]+$/i.test(id) && item?.category === "BUILDING_PART"); }
function corvetteItemName(id) { if (id === "B_MAG_1X1") return localizedName(id, "Tractor Beam"); const known = itemDisplay(id); return known === id ? `${t("Unknown Corvette part")} (${id})` : known; }

function applyCorvetteLanguage() {
  const nav = $(".main-nav [data-view=corvette]"), view = $("#corvetteView");
  if (nav) nav.innerHTML = `<span>◈</span> ${escapeHtml(t("Corvette parts"))}`;
  if (view) {
    const eyebrow = view.querySelector(".view-heading .eyebrow");
    const title = view.querySelector(".view-heading h2");
    const description = view.querySelector(".view-heading p");
    if (eyebrow) eyebrow.textContent = t("CORVETTE PARTS");
    if (title) title.textContent = t("Owned Corvette parts");
    if (description) description.textContent = t("Parts detected in the selected savegame, including the player inventory, stasis container, and Corvette cache.");
  }
  const panel = $("#corvettePanel");
  if (panel) {
    const eyebrow = panel.querySelector(".eyebrow");
    const title = panel.querySelector("h3");
    if (eyebrow) eyebrow.textContent = t("PART INVENTORY");
    if (title) title.textContent = t("Detected Corvette parts");
  }
  renderCorvetteParts();
  const toggle = $("#toggleCorvetteParts");
  if (toggle) toggle.textContent = showAllCorvetteParts ? t("Show available only") : t("Show also unavailable parts");
  const summary = $("#corvetteSummary");
  if (summary && !corvetteParts.saveFile) summary.textContent = t("Load a savegame to inspect Corvette parts.");
  if (summary && corvetteParts.saveFile) { const player = corvetteParts.player || {}, container = corvetteParts.container || {}, cache = corvetteParts.cache || {}; const count = new Set([...Object.keys(player), ...Object.keys(container), ...Object.keys(cache)].filter(isCorvettePart)).size; summary.textContent = `${count} ${t(count === 1 ? "available part" : "available parts")} · ${corvetteParts.cacheSlots} ${t("station-cache slots read")}`; }
  const headings = $("#corvettePartsRows .corvette-list-head");
  if (headings) [...headings.children].forEach((node, index) => { node.textContent = t(["Part", "Player", "Stasis", "Cache"][index]); });
  const empty = $("#corvettePartsRows .empty-state");
  if (empty && corvetteParts.saveFile) empty.textContent = t("No Corvette parts were detected in the player inventory, fixed container, or Corvette cache.");
}

function setupCorvetteView() {
  const nav = $(".main-nav"), recipeNav = nav?.querySelector('[data-view="data"]'), content = $(".content"), panel = $("#corvettePanel");
  if (!nav || !recipeNav || !content || !panel || $("#corvetteView")) return;
  const button = document.createElement("button");
  button.className = "nav-item";
  button.dataset.view = "corvette";
  button.innerHTML = "<span>◈</span> Corvette parts";
  nav.insertBefore(button, recipeNav);
  const view = document.createElement("section");
  view.className = "view";
  view.id = "corvetteView";
  view.innerHTML = `<div class="view-heading"><div><div class="eyebrow">CORVETTE PARTS</div><h2>Owned Corvette parts</h2><p>Parts detected in the selected savegame, including the player inventory, stasis container, and Corvette cache.</p></div></div>`;
  view.appendChild(panel);
  content.insertBefore(view, $("#dataView"));
}

setupCorvetteView();
function setupBaseOperationsView() {
  const nav = $(".main-nav"), recipeNav = nav?.querySelector('[data-view="data"]'), content = $(".content");
  if (!nav || !recipeNav || !content || $("#basesView")) return;
  const button = document.createElement("button"); button.className = "nav-item"; button.dataset.view = "bases"; button.innerHTML = "<span>⌁</span> Base operations"; nav.insertBefore(button, recipeNav);
  const view = document.createElement("section"); view.className = "view"; view.id = "basesView";
  view.innerHTML = `<div class="view-heading"><div><div class="eyebrow">BASE OPERATIONS</div><h2>Player base extraction</h2><p>Read-only overview of extractor, storage, orbital-base, and station records found in the selected savegame.</p></div></div><section class="panel-card base-operations-panel"><div class="card-heading"><div><div class="eyebrow">FILTERS</div><h3>Choose what to show</h3><p class="panel-subtitle" id="baseOperationsSummary">Load a savegame to inspect player bases.</p></div></div><div class="notice"><span>i</span><p>Estimated potential capacity uses 250 units per extractor and 1,000 units per silo. It is not the current stored amount, and mixed network totals are not separated.</p></div><div class="base-operations-toolbar"><label>Type<select id="baseTypeFilter"><option value="all">All bases</option><option value="mineral">Mineral extractors</option><option value="gas">Gas extractors</option><option value="storage">Bases with silos</option><option value="station">Player-owned stations</option></select></label><label class="base-search">Search<input id="baseSearch" type="search" placeholder="Base, address or resource"></label><label class="base-check"><input id="showOnlyExtractors" type="checkbox" checked> Only bases with extractors</label></div><div id="baseOperationsRows"><div class="empty-state">Load a savegame to inspect player-owned bases and extractors.</div></div></section>`;
  content.insertBefore(view, $("#dataView"));
  $("#baseTypeFilter").addEventListener("change", event => { baseTypeFilter = event.target.value; renderBaseOperations(); });
  $("#baseSearch").addEventListener("input", event => { baseSearch = event.target.value.trim().toLowerCase(); renderBaseOperations(); });
  $("#showOnlyExtractors").addEventListener("change", event => { showOnlyExtractors = event.target.checked; renderBaseOperations(); });
}
setupBaseOperationsView();
applyLanguage();
applyCorvetteLanguage();

document.addEventListener("click", event => {
  if (event.target.closest("#toggleCorvetteParts")) { showAllCorvetteParts = !showAllCorvetteParts; applyCorvetteLanguage(); }
  if (event.target.closest("#resetApp")) { corvetteParts = { player: {}, container: {}, cache: {}, saveFile: "", cacheSlots: 0 }; showAllCorvetteParts = false; renderCorvetteParts(); }
});
$("#languageSelect").addEventListener("change", applyCorvetteLanguage);

// Corvette display ordering: positive quantity in any source is owned/available.
function renderCorvetteParts() {
  const node = $("#corvettePartsRows");
  if (!node) return;
  const player = corvetteParts.player || {}, container = corvetteParts.container || {}, cache = corvetteParts.cache || {};
  const ids = new Set([...Object.keys(player), ...Object.keys(container), ...Object.keys(cache), ...corvetteUniverse().map(([id]) => id)]);
  const rows = [...ids].filter(isCorvettePart).map(id => ({ id, name: corvetteItemName(id), player: player[id] || 0, container: container[id] || 0, cache: cache[id] || 0 }))
    .filter(row => showAllCorvetteParts || row.player || row.container || row.cache)
    .sort((a, b) => {
      const aOwned = a.player > 0 || a.container > 0 || a.cache > 0;
      const bOwned = b.player > 0 || b.container > 0 || b.cache > 0;
      return Number(bOwned) - Number(aOwned) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
  const ownedCount = [...ids].filter(id => (player[id] || 0) > 0 || (container[id] || 0) > 0 || (cache[id] || 0) > 0).length;
  const summary = $("#corvetteSummary");
  if (summary) summary.textContent = corvetteParts.saveFile ? `${ownedCount} available part${ownedCount === 1 ? "" : "s"} detected · ${corvetteParts.cacheSlots} station-cache slots read` : "Load a savegame to inspect Corvette parts.";
  const toggle = $("#toggleCorvetteParts");
  if (toggle) toggle.textContent = showAllCorvetteParts ? "Show available only" : "Show all parts (including 0)";
  node.innerHTML = rows.length ? `<div class="corvette-list-head"><span>Part</span><span>Player</span><span>Stasis</span><span>Cache</span></div>${rows.map(row => `<div class="corvette-row ${row.player || row.container || row.cache ? "owned" : "zero"}"><div><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.id)}</small></div><b>${row.player.toLocaleString()}</b><b>${row.container.toLocaleString()}</b><b>${row.cache.toLocaleString()}</b></div>`).join("")}` : `<div class="empty-state">${corvetteParts.saveFile ? "No Corvette parts were detected in the player inventory, fixed container, or Corvette cache." : "Load a savegame to inspect Corvette parts."}</div>`;
}
const baseOperationsNotice = $(".base-operations-panel .notice p");
if (baseOperationsNotice) baseOperationsNotice.textContent = "Estimates use 250 units per extractor and 1,000 units per silo. Candidate networks are separated by encoded CVX key; values are not current storage.";
