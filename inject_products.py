import re

html_content = """    <button class="filter-btn active" data-filter="all" id="filter-all">All Crafts</button>
    <button class="filter-btn" data-filter="painting" id="filter-painting">Paintings</button>
    <button class="filter-btn" data-filter="marble" id="filter-marble">Marble & Decor</button>
    <button class="filter-btn" data-filter="wooden" id="filter-wooden">Wooden Items</button>
    <button class="filter-btn" data-filter="crochet" id="filter-crochet">Crochet</button>
    <button class="filter-btn" data-filter="textile" id="filter-textile">Textile & Pouches</button>
    <button class="filter-btn" data-filter="zardozi" id="filter-zardozi">Zardozi</button>"""

with open("handicrafts.html", "r", encoding="utf-8") as f:
    text = f.read()

# Replace filters
text = re.sub(r'<div class="filter-inner">.*?</div>', f'<div class="filter-inner">\n{html_content}\n  </div>', text, flags=re.DOTALL)

# Replace hero image
text = re.sub(
    r'<img src="https://images.unsplash.com/photo-1597131628048-f4699d48e5e3\?w=1400&q=80".*?/>',
    r'<img src="images/gimini_generated.png" alt="Handcrafted India" />',
    text, flags=re.DOTALL
)

products = [
    # Paintings
    ("Taj Mahal Watercolour (A5)", "₹600", "painting", "Exquisite hand-painted Taj Mahal watercolour on A5 archival paper, bringing the monument of love to life.", "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=600&q=80"),
    ("Pichwai Art (A5)", "₹650", "painting", "Devotional paintings depicting Lord Krishna's life, crafted on handwoven cotton cloth with natural pigments.", "https://images.unsplash.com/photo-1617791160536-598cf32026fb?w=600&q=80"),
    ("Watercolour Mini (2.5×6 inch)", "₹300", "painting", "Delicate miniature-inspired watercolours, perfect for elegant home decor and gifting.", "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=600&q=80"),

    # Marble & Decor
    ("Marble Tortoise (Inlay Work, 2.5\")", "₹430", "marble", "Finely carved Makrana marble tortoise with authentic pietra dura stone inlay work.", "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&q=80"),
    ("Marble Coaster Plates (5\")", "₹750", "marble", "Set of elegant 5-inch Makrana marble coasters featuring intricate floral inlay patterns.", "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&q=80"),

    # Wooden Items
    ("Wooden Dice", "₹370", "wooden", "Hand-carved premium wooden dice set, polished to a smooth, natural finish.", "https://images.unsplash.com/photo-1577083165350-14b4f5146bd2?w=600&q=80"),
    ("Wooden Ganesha (2\")", "₹310", "wooden", "A beautifully detailed 2-inch wooden carving of Lord Ganesha, perfect for your altar or desk.", "https://images.unsplash.com/photo-1577083165350-14b4f5146bd2?w=600&q=80"),

    # Crochet Items
    ("Crochet Doll (Multicolour)", "₹750", "crochet", "Lovingly handcrafted multicolour crochet doll, made from pure cotton yarn.", "https://images.unsplash.com/photo-1606722590583-6951b5ea92ad?w=600&q=80"),
    ("Crochet Turtle (Multicolour)", "₹350", "crochet", "A vibrant, soft multicolour crochet turtle, showcasing intricate thread artistry.", "https://images.unsplash.com/photo-1606722590583-6951b5ea92ad?w=600&q=80"),
    ("Crochet Sunflower Keyring", "₹250", "crochet", "A bright and cheerful sunflower crochet keyring, perfect as an everyday accessory.", "https://images.unsplash.com/photo-1606722590583-6951b5ea92ad?w=600&q=80"),

    # Textile & Pouches
    ("Hand-painted Elephant Pouch", "₹550", "textile", "A premium fabric pouch featuring delicate hand-painted elephant motifs and fine stitching.", "https://images.unsplash.com/photo-1605367067838-8e657c93cb66?w=600&q=80"),

    # Zardozi Collection
    ("Double Side Elephant (Mehroon)", "₹480", "zardozi", "Mehroon Zardozi elephant ornament with traditional metallic embroidery on both sides.", "https://images.unsplash.com/photo-1602410769352-7e0aade607d7?w=600&q=80"),
    ("Single Side Elephant", "₹380", "zardozi", "Intricately embroidered Zardozi elephant, available in vibrant Red, Green, or Blue.", "https://images.unsplash.com/photo-1602410769352-7e0aade607d7?w=600&q=80"),
    ("Single Side Camel", "₹360", "zardozi", "Classic Rajasthani camel motif, rendered in shimmering Zardozi metallic threads.", "https://images.unsplash.com/photo-1602410769352-7e0aade607d7?w=600&q=80"),
    ("Single Side Carrot", "₹360", "zardozi", "Playful carrot design brought to life with intricate and sparkling Zardozi craft.", "https://images.unsplash.com/photo-1602410769352-7e0aade607d7?w=600&q=80"),
    ("Elephant with Trunk", "₹360", "zardozi", "Detailed elephant with raised trunk, heavily embroidered with authentic gold threads.", "https://images.unsplash.com/photo-1602410769352-7e0aade607d7?w=600&q=80"),
    ("Tiger (Orange)", "₹430", "zardozi", "A fierce orange tiger motif, capturing the spirit of India's wildlife in Zardozi.", "https://images.unsplash.com/photo-1602410769352-7e0aade607d7?w=600&q=80"),
    ("Tuk-tuk", "₹380", "zardozi", "A charming Indian auto rickshaw (Tuk-tuk) in yellow or sky blue, hand-embroidered.", "https://images.unsplash.com/photo-1602410769352-7e0aade607d7?w=600&q=80"),
    ("Coin Purse", "₹660", "zardozi", "Premium Zardozi coin purse adorned with majestic elephant or peacock embroidery.", "https://images.unsplash.com/photo-1605367067838-8e657c93cb66?w=600&q=80"),
    ("Halloween Design", "₹360", "zardozi", "A unique fusion of traditional Zardozi embroidery with a playful Halloween motif.", "https://images.unsplash.com/photo-1602410769352-7e0aade607d7?w=600&q=80"),
]

cards_html = ""
for i, p in enumerate(products):
    name, price, cat, desc, img = p
    cards_html += f'''
    <article class="product-card card reveal" data-category="{cat}" style="animation-delay: {(i%3)*0.1}s">
      <div class="card-image-wrap product-img-wrap">
        <img src="{img}" alt="{name}" loading="lazy" />
        <div class="product-tag">
          <span class="badge badge-gold">{cat.capitalize()}</span>
        </div>
      </div>
      <div class="product-body">
        <h2 class="product-name" style="font-size:1.15rem;">{name}</h2>
        <p class="product-desc" style="font-size:0.85rem;line-height:1.5;">{desc}</p>
        <div class="product-footer">
          <div class="product-pricing">
            <span class="product-price">{price}</span>
          </div>
          <a href="https://wa.me/918871872924?text=I'd%20like%20to%20order%20the%20{name.replace(' ', '%20')}" target="_blank" class="btn btn-outline btn-sm product-btn" style="padding:6px 14px;font-size:0.7rem;">
            Order on WA
          </a>
        </div>
      </div>
    </article>
'''

text = re.sub(r'<div class="products-grid" id="products-grid">.*?</div>\s*</section>', f'<div class="products-grid" id="products-grid">\n{cards_html}\n</div>\n</section>', text, flags=re.DOTALL)

with open("handicrafts.html", "w", encoding="utf-8") as f:
    f.write(text)
