/**
 * Algoritmo de Balanceo Inteligente de Costos para DesayunApp
 * Agrupa productos de desayuno en tickets equilibrados minimizando la diferencia de gasto entre compañeros.
 */

export function balanceItems(items, targetCount) {
  if (!items || items.length === 0) return [];
  if (targetCount <= 0) targetCount = 1;

  // Clone and sanitize items
  const cleanItems = items.map(item => ({
    name: item.name.trim(),
    qty: item.qty ? item.qty.trim() : '1 unidad',
    cost: Math.max(0.1, Number(item.cost) || 1.0),
    category: item.category || 'Ingrediente'
  }));

  // Sort by cost descending (LPT heuristic)
  cleanItems.sort((a, b) => b.cost - a.cost);

  // Initialize buckets
  const buckets = Array.from({ length: targetCount }, (_, i) => ({
    id: i + 1,
    items: [],
    totalCost: 0
  }));

  // Greedy distribution to the currently lightest bucket
  for (const item of cleanItems) {
    // Find bucket with minimal total cost
    let minBucket = buckets[0];
    for (let i = 1; i < buckets.length; i++) {
      if (buckets[i].totalCost < minBucket.totalCost) {
        minBucket = buckets[i];
      }
    }
    minBucket.items.push(item);
    minBucket.totalCost = Number((minBucket.totalCost + item.cost).toFixed(2));
  }

  // Refinement phase: pairwise item swaps to reduce variance
  let improved = true;
  let iterations = 0;
  while (improved && iterations < 50) {
    improved = false;
    iterations++;

    // Find heaviest and lightest buckets
    let maxIdx = 0;
    let minIdx = 0;
    for (let i = 1; i < buckets.length; i++) {
      if (buckets[i].totalCost > buckets[maxIdx].totalCost) maxIdx = i;
      if (buckets[i].totalCost < buckets[minIdx].totalCost) minIdx = i;
    }

    const currentDiff = buckets[maxIdx].totalCost - buckets[minIdx].totalCost;
    if (currentDiff <= 0.30) break; // Close enough ($0.30 difference is negligible)

    // Try single item move from max to min
    let bestMove = null;
    let bestMoveDiff = currentDiff;

    for (let i = 0; i < buckets[maxIdx].items.length; i++) {
      const item = buckets[maxIdx].items[i];
      const newMaxCost = buckets[maxIdx].totalCost - item.cost;
      const newMinCost = buckets[minIdx].totalCost + item.cost;
      const newDiff = Math.abs(newMaxCost - newMinCost);
      if (newDiff < bestMoveDiff) {
        bestMoveDiff = newDiff;
        bestMove = { itemIdx: i };
      }
    }

    if (bestMove && bestMoveDiff < currentDiff - 0.1) {
      const [movedItem] = buckets[maxIdx].items.splice(bestMove.itemIdx, 1);
      buckets[minIdx].items.push(movedItem);
      buckets[maxIdx].totalCost = Number((buckets[maxIdx].totalCost - movedItem.cost).toFixed(2));
      buckets[minIdx].totalCost = Number((buckets[minIdx].totalCost + movedItem.cost).toFixed(2));
      improved = true;
    }
  }

  // Generate titles and summarize
  return buckets.map(b => {
    let title = '';
    if (b.items.length === 1) {
      title = `${b.items[0].qty} de ${b.items[0].name}`;
    } else if (b.items.length === 2) {
      title = `${b.items[0].name} + ${b.items[1].name}`;
    } else {
      title = `${b.items[0].name} + ${b.items[1].name} y ${b.items.length - 2} más`;
    }

    // Determine representative category
    const category = b.items[0]?.category || 'General';

    return {
      title,
      items: b.items,
      category,
      estimated_cost: Number(b.totalCost.toFixed(2)),
      notes: b.items.map(it => `• ${it.qty} ${it.name} (~$${it.cost.toFixed(2)})`).join('\n')
    };
  });
}

export const PRESETS = {
  oficina15: {
    name: 'Desayuno Oficial de la Oficina (15 Personas)',
    targetCount: 15,
    items: [
      { name: 'Combos de Pan Canilla', qty: '4 combos', cost: 10.40, category: 'Pan' },
      { name: 'Paquete de Vasos', qty: '1 paquete', cost: 3.00, category: 'Desechables' },
      { name: 'Aceite de Oliva Extra Virgen', qty: '1 botella', cost: 15.00, category: 'Aceites' },
      { name: 'Jamón de Pavo', qty: '1 kg', cost: 10.85, category: 'Proteína' },
      { name: 'Vinagre', qty: '1 botella', cost: 2.32, category: 'Condimentos' },
      { name: 'Mortadela rebanada', qty: '900g', cost: 12.05, category: 'Proteína' },
      { name: 'Bolsa de Lechuga', qty: '3 bolsas (1 para cada grupo)', cost: 3.60, category: 'Vegetales' },
      { name: 'Salamis de 150g', qty: '4 unidades', cost: 24.00, category: 'Proteína' },
      { name: 'Pepperoni rebanado', qty: '600g', cost: 10.92, category: 'Proteína' },
      { name: 'Queso Crema 250g', qty: '2 tarrinas', cost: 3.00, category: 'Lácteos' },
      { name: 'Queso Amarillo', qty: '1.1 kg rebanado', cost: 22.00, category: 'Lácteos' },
      { name: 'Tomate fresco', qty: '1.5 kg', cost: 6.00, category: 'Vegetales' },
      { name: 'Jugos grandes', qty: '6 botellas', cost: 30.00, category: 'Bebidas' },
      { name: 'Platos desechables', qty: '2 paquetes', cost: 6.00, category: 'Desechables' },
      { name: 'Servilletas', qty: '2 paquetes', cost: 4.80, category: 'Desechables' },
      { name: 'Aderezos César o Ranch', qty: '2 frascos', cost: 11.00, category: 'Salsas' },
      { name: 'Aderezos Tata', qty: '2 frascos', cost: 9.00, category: 'Salsas' },
      { name: 'Cebolla fresca', qty: '1.1 kg', cost: 3.62, category: 'Vegetales' },
      { name: 'Frascos Aceitunas', qty: '2 frascos', cost: 7.80, category: 'Acompañamiento' },
      { name: 'Paquete de Fajitas', qty: '1 paquete', cost: 3.80, category: 'Acompañamiento' }
    ]
  },
  arepas: {
    name: 'Desayuno de Arepas & Perico Venezolano',
    targetCount: 8,
    items: [
      { name: 'Harina de Maíz P.A.N. (1kg)', qty: '2 paquetes', cost: 3.20, category: 'Base' },
      { name: 'Mantequilla con sal (250g)', qty: '1 barra', cost: 1.50, category: 'Acompañamiento' },
      { name: 'Queso Blanco Llanero / Paisa', qty: '500g', cost: 4.80, category: 'Proteína' },
      { name: 'Cartón de Huevos frescos', qty: '15 unidades', cost: 3.50, category: 'Proteína' },
      { name: 'Jamón de Pierna o Pavo', qty: '400g', cost: 4.20, category: 'Proteína' },
      { name: 'Tomates maduros para guiso', qty: '1 kg', cost: 2.20, category: 'Vegetales' },
      { name: 'Cebolla blanca y Cilantro', qty: '500g + 1 manojo', cost: 1.80, category: 'Vegetales' },
      { name: 'Aguacates maduros', qty: '3 grandes', cost: 4.50, category: 'Vegetales' },
      { name: 'Café tostado y molido', qty: '250g', cost: 3.20, category: 'Bebidas' },
      { name: 'Azúcar blanca / morena', qty: '500g', cost: 1.00, category: 'Bebidas' },
      { name: 'Leche líquida entera', qty: '2 litros', cost: 3.40, category: 'Bebidas' },
      { name: 'Jugo pasteurizado de Naranja', qty: '2 litros', cost: 3.80, category: 'Bebidas' },
      { name: 'Platos y cubiertos desechables', qty: 'Paquete de 20', cost: 2.50, category: 'Desechables' },
      { name: 'Servilletas y toallas de cocina', qty: '1 pqte + 1 rollo', cost: 1.90, category: 'Desechables' }
    ]
  },
  tacos: {
    name: 'Desayuno de Tacos & Huevos a la Mexicana',
    targetCount: 7,
    items: [
      { name: 'Tortillas de Maíz y Harina', qty: '2 paquetes grandes', cost: 3.60, category: 'Base' },
      { name: 'Frijoles refritos listos', qty: '2 latas / sobres', cost: 2.80, category: 'Base' },
      { name: 'Huevos de granja', qty: '18 unidades', cost: 4.20, category: 'Proteína' },
      { name: 'Queso Oaxaca / Panela', qty: '450g', cost: 4.50, category: 'Proteína' },
      { name: 'Chorizo o Jamón picado', qty: '350g', cost: 3.90, category: 'Proteína' },
      { name: 'Jitomates, Cebolla y Chiles', qty: '1 kg surtido', cost: 3.00, category: 'Vegetales' },
      { name: 'Aguacates y Limones', qty: '3 aguacates + 5 limones', cost: 4.50, category: 'Vegetales' },
      { name: 'Salsas picantes y Totopos', qty: '2 frascos + 1 bolsa', cost: 3.80, category: 'Acompañamiento' },
      { name: 'Café de Olla o Tradicional', qty: '250g', cost: 3.50, category: 'Bebidas' },
      { name: 'Jugos naturales y Platos desechables', qty: '2L jugo + platos', cost: 4.50, category: 'Bebidas & Desechables' }
    ]
  },
  brunch: {
    name: 'Brunch Continental (Huevos, Tostadas & Fruta)',
    targetCount: 6,
    items: [
      { name: 'Pan de Molde Artesanal / Baguettes', qty: '2 paquetes', cost: 3.80, category: 'Base' },
      { name: 'Huevos y Mantequilla', qty: '12 huevos + 1 mantequilla', cost: 4.20, category: 'Proteína & Base' },
      { name: 'Tocineta / Bacon ahumado', qty: '300g', cost: 4.50, category: 'Proteína' },
      { name: 'Queso Gouda o Mozzarella en lonchas', qty: '400g', cost: 4.20, category: 'Proteína' },
      { name: 'Frutas frescas (Fresas, Cambur/Plátano, Melón)', qty: 'Bandeja surtida', cost: 4.50, category: 'Frutas' },
      { name: 'Café premium + Leche', qty: '250g café + 1L leche', cost: 4.30, category: 'Bebidas' },
      { name: 'Mermeladas surtidas + Servilletas y Vasos', qty: '2 frasquitos + desechables', cost: 4.00, category: 'Acompañamiento' }
    ]
  }
};
