/* ============================================================
   SUPABASE PRODUCT LOADER
   Fetches all products from Supabase and merges with local
   products.js as fallback. Populates window.products.
   ============================================================ */

'use strict';

(async function loadSupabaseProducts() {
  const db = window.supabaseClient;
  if (!db) {
    console.warn('[Products] Supabase client not found, using local products.js data.');
    return; // window.products already set by products.js
  }

  try {
    const { data, error } = await db
      .from('products')
      .select('id, name, price, category, stock, description, image_url, slug')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Products] Supabase fetch error:', error);
      return; // fall back to local data
    }

    if (!data || data.length === 0) {
      console.warn('[Products] No products found in Supabase, using local products.js data.');
      return;
    }

    // Map Supabase schema to the shape expected by the UI
    // Supabase fields:  id, name, price, category, stock, description, image_url, slug
    // UI fields needed: id, title, price, category, tag, shortDesc, mainImage, thumbnails, origin, rating, reviews

    const localProducts = window.products || [];
    const localMap = {};
    localProducts.forEach(lp => { localMap[lp.id] = lp; });

    window.supabaseProducts = data.map(p => {
      const slugId = p.slug || String(p.id);
      const localFallback = localMap[slugId] || {};
      return {
        // Preserve Supabase id (uuid string)
        id:          slugId,
        dbId:        p.id,            // raw UUID for cart_items writes
        title:       p.name || localFallback.title || 'Untitled',
        price:       parseFloat(p.price) || localFallback.price || 0,
        oldPrice:    localFallback.oldPrice || null,
        discount:    localFallback.discount || null,
        category:    (p.category || localFallback.category || '').toLowerCase(),
        tag:         p.category || localFallback.tag || 'Craft',
        shortDesc:   p.description || localFallback.shortDesc || '',
        description: p.description || localFallback.description || '',
        origin:      localFallback.origin || '',
        stock:       p.stock || localFallback.stock || 0,
        rating:      localFallback.rating || null,
        reviews:     localFallback.reviews || null,
        mainImage:   p.image_url || localFallback.mainImage || '',
        thumbnails:  p.image_url ? [p.image_url] : (localFallback.thumbnails || []),
      };
    });

    console.log(`[Products] Loaded ${window.supabaseProducts.length} products from Supabase.`);

    // Merge: Supabase rows take priority; local rows fill in anything not in Supabase
    const supabaseIds   = new Set(window.supabaseProducts.map(p => p.id));
    const onlyLocal     = localProducts.filter(p => !supabaseIds.has(p.id));

    window.products = [...window.supabaseProducts, ...onlyLocal];
    console.log(`[Products] Merged catalogue: ${window.products.length} products total.`);

    // Notify any listeners that products have updated
    document.dispatchEvent(new CustomEvent('productsLoaded'));

  } catch (err) {
    console.error('[Products] Unexpected error loading products:', err);
  }
})();
