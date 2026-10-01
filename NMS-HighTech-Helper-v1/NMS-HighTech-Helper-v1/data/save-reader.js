/* Dependency-free reader for the Windows/Steam/GOG NMS streaming save format. */
(function (global) {
  "use strict";

  const MAGIC = [0xe5, 0xa1, 0xed, 0xfe];
  const KEY = { version: "F2P", platform: "8>q", context: "XTp", baseContext: "vLc", player: "6f=", inventory: ";l5", slots: ":No", id: "b2n", amount: "1o9" };
  const NAME_KEYS = new Set(["NKm"]);
  const NAME_WORDS = /(?:stasis|device|fusion|ignitor)/i;

  function u32(bytes, offset) { return (bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16 | bytes[offset + 3] << 24) >>> 0; }

  function lz4Block(source, expected) {
    const output = new Uint8Array(expected), view = new DataView(source.buffer, source.byteOffset, source.byteLength);
    let input = 0, out = 0;
    while (input < source.length && out < expected) {
      const token = source[input++];
      let literalLength = token >>> 4;
      if (literalLength === 15) { let value; do { value = source[input++]; literalLength += value; } while (value === 255); }
      output.set(source.subarray(input, input + literalLength), out); input += literalLength; out += literalLength;
      if (input >= source.length || out >= expected) break;
      const matchOffset = view.getUint16(input, true); input += 2;
      let matchLength = (token & 15) + 4;
      if ((token & 15) === 15) { let value; do { value = source[input++]; matchLength += value; } while (value === 255); }
      for (let i = 0; i < matchLength; i++) { output[out] = output[out - matchOffset]; out++; }
    }
    if (out !== expected) throw new Error(`LZ4 block size mismatch (${out}/${expected}).`);
    return output;
  }

  function decodeBytes(buffer) {
    const bytes = new Uint8Array(buffer), blocks = [], isStreaming = MAGIC.every((value, index) => bytes[index] === value);
    if (!isStreaming) throw new Error("Unsupported save header; choose a normal save*.hg file.");
    let offset = 0, total = 0;
    while (offset + 16 <= bytes.length) {
      if (!MAGIC.every((value, index) => bytes[offset + index] === value)) break;
      const compressed = u32(bytes, offset + 4), expanded = u32(bytes, offset + 8);
      if (!compressed || !expanded || offset + 16 + compressed > bytes.length) throw new Error("Invalid NMS save block header.");
      const block = lz4Block(bytes.subarray(offset + 16, offset + 16 + compressed), expanded);
      blocks.push(block); total += block.length; offset += 16 + compressed;
    }
    const jsonBytes = new Uint8Array(total); let cursor = 0;
    for (const block of blocks) { jsonBytes.set(block, cursor); cursor += block.length; }
    return JSON.parse(new TextDecoder("latin1").decode(jsonBytes).replace(/\0+$/, ""));
  }

  function eachObject(value, visit, path = "$") {
    if (!value || typeof value !== "object") return;
    visit(value, path);
    if (Array.isArray(value)) value.forEach((item, index) => eachObject(item, visit, `${path}[${index}]`));
    else Object.entries(value).forEach(([key, child]) => eachObject(child, visit, `${path}.${key}`));
  }

  function slotItems(value) {
    if (!value || typeof value !== "object" || !Array.isArray(value[KEY.slots])) return [];
    return value[KEY.slots].filter(slot => slot && typeof slot === "object" && typeof slot[KEY.id] === "string")
      .map(slot => ({ id: slot[KEY.id].replace(/^\^/, ""), amount: Number(slot[KEY.amount]) || 0 }));
  }

  function inventoryMap(items) {
    return items.reduce((map, item) => { if (item.amount > 0) map[item.id] = (map[item.id] || 0) + item.amount; return map; }, {});
  }

  function findNamedContainers(root) {
    const found = [];
    eachObject(root, (object, path) => {
      const nameEntry = Object.entries(object).find(([key, value]) => NAME_KEYS.has(key) && typeof value === "string" && NAME_WORDS.test(value));
      const name = nameEntry?.[1];
      const items = slotItems(object);
      if (name && items.length) found.push({ name, nameKey: nameEntry[0], path, items, inventory: inventoryMap(items) });
    });
    return found;
  }

  function parse(file, buffer) {
    const root = decodeBytes(buffer);

    // The save contains several contexts.  In particular, the expedition
    // context also has a player object and inventories.  The old fallback
    // walked the whole document and silently merged those inventories with
    // the main save.  vLc is the normal/base player context in the format
    // described by the editor's jsonmap.txt; use only its cargo inventory.
    const context = root[KEY.baseContext] && typeof root[KEY.baseContext] === "object"
      ? root[KEY.baseContext]
      : null;
    const player = context?.[KEY.player] && typeof context[KEY.player] === "object"
      ? context[KEY.player]
      : null;
    const playerInventory = player?.[KEY.inventory] && typeof player[KEY.inventory] === "object"
      ? player[KEY.inventory]
      : null;
    const playerItems = slotItems(playerInventory);
    const containers = context ? findNamedContainers(context) : [];
    return { fileName: file.name, size: file.size, lastModified: file.lastModified, version: root[KEY.version] ?? "unknown", platform: root[KEY.platform] ?? "unknown", context: root[KEY.context] ?? "unknown", playerInventory: inventoryMap(playerItems), playerInventorySlots: playerItems.length, matchingContainers: containers };
  }

  global.NMS_SAVE_READER = { parse };
})(window);
