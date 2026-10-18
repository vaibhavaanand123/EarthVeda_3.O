/** Product ranges. Products themselves live in the database (managed in the admin). */
export const RANGES = Object.freeze({
  foxnuts: {
    id: 'foxnuts',
    label: { de: 'Geröstete Fuchsnüsse', en: 'Roasted Foxnuts' },
    short: { de: 'Fuchsnüsse', en: 'Foxnuts' },
  },
  protein: {
    id: 'protein',
    label: { de: 'Plant Protein', en: 'Plant Protein' },
    short: { de: 'Protein', en: 'Protein' },
  },
});

/** Flatten a product's translations for one language. */
export function localiseProduct(product, lang) {
  if (!product) return null;
  const t = product.i18n?.[lang] || product.i18n?.en || {};
  return {
    ...product,
    name: t.name || product.id,
    fullName: t.fullName || t.name || product.id,
    description: t.description || '',
    ingredients: t.ingredients || '',
    allergens: t.allergens || '',
    storage: t.storage || '',
    howToEnjoy: t.howToEnjoy || '',
    highlights: t.highlights || [],
    rangeLabel: RANGES[product.range]?.label[lang] || product.range,
  };
}

/** Short flavour name, e.g. "Mango" for "Mango Plant Protein". */
export const flavourName = (product, lang) =>
  (product?.i18n?.[lang]?.name || '').replace(/^Plant Protein /, '').replace(/ Plant Protein$/, '');
