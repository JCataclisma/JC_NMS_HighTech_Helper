(function (root) {
  function calculate(productId, amount, inventory, recipes, items) {
    const available = { ...inventory }, covered = {}, requirements = {}, missing = {};
    const nameOf = id => (items.find(item => item.id === id) || { name: id }).name;
    function addRequirement(id, quantity) { requirements[id] = (requirements[id] || 0) + quantity; }
    function resolve(id, quantity, depth) {
      addRequirement(id, quantity);
      const have = available[id] || 0;
      const used = Math.min(have, quantity);
      if (used) { available[id] -= used; covered[id] = (covered[id] || 0) + used; }
      const remaining = quantity - used;
      if (!remaining) return;
      const recipe = recipes[id];
      if (!recipe) { missing[id] = (missing[id] || 0) + remaining; return; }
      const batches = Math.ceil(remaining / recipe.output);
      Object.entries(recipe.ingredients).forEach(([ingredient, qty]) => resolve(ingredient, qty * batches, depth + 1));
    }
    resolve(productId, amount, 0);
    const intermediateIds = Object.keys(requirements).filter(id => recipes[id] && id !== productId);
    const rawIds = Object.keys(requirements).filter(id => !recipes[id]);
    const makeRows = ids => ids.map(id => ({ id, name: nameOf(id), required: requirements[id] || 0, available: inventory[id] || 0, covered: covered[id] || 0, missing: missing[id] || 0 })).sort((a, b) => a.name.localeCompare(b.name));
    return { productId, amount, possible: Object.keys(missing).length === 0, final: { id: productId, name: nameOf(productId), required: amount, available: inventory[productId] || 0, missing: missing[productId] || 0 }, intermediate: makeRows(intermediateIds), raw: makeRows(rawIds), missing: { ...missing } };
  }
  root.NMS_ENGINE = { calculate };
  if (typeof module !== "undefined") module.exports = { calculate };
})(typeof window !== "undefined" ? window : globalThis);
