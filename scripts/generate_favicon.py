from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = Path('/home/ubuntu/boutique-pos/client/public')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

size = 256
img = Image.new('RGBA', (size, size), '#231815')
draw = ImageDraw.Draw(img)

for y in range(size):
    if y < size // 2:
        color = (35, 24, 21, 255)
    else:
        color = (121, 81, 74, 255)
    draw.line([(0, y), (size, y)], fill=color)

margin = 16
accent = '#e7c9bf'
draw.rounded_rectangle(
    [(margin, margin), (size - margin, size - margin)],
    radius=54,
    outline=accent,
    width=10,
)

font_candidates = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
    '/usr/share/fonts/truetype/liberation2/LiberationSerif-Bold.ttf',
]
font = None
for candidate in font_candidates:
    if Path(candidate).exists():
        font = ImageFont.truetype(candidate, 120)
        break

if font is None:
    font = ImageFont.load_default()

text = 'BP'
bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]
text_x = (size - text_width) / 2
text_y = (size - text_height) / 2 - 10

draw.text((text_x + 4, text_y + 4), text, font=font, fill=(0, 0, 0, 90))
draw.text((text_x, text_y), text, font=font, fill='#fff6f2')

png_path = OUTPUT_DIR / 'favicon-512.png'
icon_png_path = OUTPUT_DIR / 'favicon.png'
ico_path = OUTPUT_DIR / 'favicon.ico'

img.resize((512, 512), Image.LANCZOS).save(png_path, format='PNG', optimize=True)
img.resize((64, 64), Image.LANCZOS).save(icon_png_path, format='PNG', optimize=True)
img.save(ico_path, format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

print(f'Generated {ico_path}')
print(f'Generated {png_path}')
print(f'Generated {icon_png_path}')
