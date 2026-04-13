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
    ("Taj Mahal Watercolour (A5)", "₹600", "painting", "Exquisite hand-painted Taj Mahal watercolour on A5 archival paper, bringing the monument of love to life.", "images/items/watercolourtajmahal1.jpeg"),
    ("Pichwai Art (A5)", "₹650", "painting", "Devotional paintings depicting Lord Krishna's life, crafted on handwoven cotton cloth with natural pigments.", "images/items/pichwai art3.jpeg"),
    ("Watercolour Mini (2.5×6 inch)", "₹300", "painting", "Delicate miniature-inspired watercolours, perfect for elegant home decor and gifting.", "images/items/watercolourpaint3.jpeg"),

    # Marble & Decor
    ("Marble Tortoise (Inlay Work, 2.5\")", "₹430", "marble", "Finely carved Makrana marble tortoise with authentic pietra dura stone inlay work.", "images/items/Handcrafted marble plates with floral design (1).png"),
    ("Marble Coaster Plates (5\")", "₹750", "marble", "Set of elegant 5-inch Makrana marble coasters featuring intricate floral inlay patterns.", "images/items/Handcrafted marble plates with floral design (1).png"),

    # Wooden Items
    ("Wooden Dice", "₹370", "wooden", "Hand-carved premium wooden dice set, polished to a smooth, natural finish.", "images/items/Wooden dice and wooden die holder.jpg.jpeg"),
    ("Wooden Ganesha (2\")", "₹310", "wooden", "A beautifully detailed 2-inch wooden carving of Lord Ganesha, perfect for your altar or desk.", "images/items/Handcrafted Ganesha idol on white background.png"),

    # Crochet Items
    ("Crochet Doll (Multicolour)", "₹750", "crochet", "Lovingly handcrafted multicolour crochet doll, made from pure cotton yarn.", "images/items/Handmade crochet doll with vibrant yarn details.png"),
    ("Crochet Turtle (Multicolour)", "₹350", "crochet", "A vibrant, soft multicolour crochet turtle, showcasing intricate thread artistry.", "images/items/Crochet turtles side by side.png"),
    ("Crochet Sunflower Keyring", "₹250", "crochet", "A bright and cheerful sunflower crochet keyring, perfect as an everyday accessory.", "images/items/Sunflower.jpg.jpeg"),

    # Textile & Pouches
    ("Hand-painted Elephant Pouch", "₹550", "textile", "A premium fabric pouch featuring delicate hand-painted elephant motifs and fine stitching.", "images/items/Vibrant folk-art elephant pouch design.png"),

    # Zardozi Collection
    ("Double Side Elephant (Mehroon)", "₹480", "zardozi", "Mehroon Zardozi elephant ornament with traditional metallic embroidery on both sides.", "images/items/Intricate Zardozi elephant ornament on velvet.png"),
    ("Single Side Elephant", "₹380", "zardozi", "Intricately embroidered Zardozi elephant, available in vibrant Red, Green, or Blue.", "images/items/Red Elephant( Zardozi).png"),
    ("Single Side Camel", "₹360", "zardozi", "Classic Rajasthani camel motif, rendered in shimmering Zardozi metallic threads.", "images/items/Green and gold camel ornament.png"),
    ("Single Side Carrot", "₹360", "zardozi", "Playful carrot design brought to life with intricate and sparkling Zardozi craft.", "images/items/Beaded carrot ornament close-up.png"),
    ("Elephant with Trunk", "₹360", "zardozi", "Detailed elephant with raised trunk, heavily embroidered with authentic gold threads.", "images/items/Green and gold elephant ornament.png"),
    ("Tiger (Orange)", "₹430", "zardozi", "A fierce orange tiger motif, capturing the spirit of India's wildlife in Zardozi.", "images/items/Intricate Zardozi embroidered elephant pouches.png"),
    ("Tuk-tuk", "₹380", "zardozi", "A charming Indian auto rickshaw (Tuk-tuk) in yellow or sky blue, hand-embroidered.", "images/items/Beaded auto-rickshaw ornaments in vibrant colours.png"),
    ("Coin Purse", "₹660", "zardozi", "Premium Zardozi coin purse adorned with majestic elephant embroidery.", "images/items/Intricate Zardozi embroidered elephant pouches.png"),
    ("Halloween Design", "₹360", "zardozi", "A unique fusion of traditional Zardozi embroidery with a playful Halloween motif.", "images/items/halloween pumpkin.png"),
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
