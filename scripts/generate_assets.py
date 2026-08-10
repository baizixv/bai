"""Generate the site's local logo, favicon, hero illustration, and project artwork.

Run with: python3 scripts/generate_assets.py
The source is intentionally small and deterministic so the visual system can be
updated without relying on an external image service.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets"
OUT.mkdir(parents=True, exist_ok=True)
SCALE = 3

COLORS = {
    "ink": "#17191c",
    "paper": "#f4f1eb",
    "blue": "#4264f5",
    "yellow": "#f3ca51",
    "pink": "#ed9b9f",
    "green": "#9ec7ae",
    "lavender": "#d9d0f2",
    "sky": "#d9e3ee",
    "mint": "#b8d1ce",
}

FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_CJK = "/System/Library/Fonts/Hiragino Sans GB.ttc"


def font(size: int, bold: bool = False, cjk: bool = False):
    path = FONT_CJK if cjk else (FONT_BOLD if bold else FONT_REGULAR)
    return ImageFont.truetype(path, size * SCALE)


def canvas(width: int, height: int, color):
    return Image.new("RGB", (width * SCALE, height * SCALE), color)


def draw_text(draw, xy, text, size, fill, bold=False, cjk=False, anchor=None):
    draw.text((xy[0] * SCALE, xy[1] * SCALE), text, font=font(size, bold, cjk), fill=fill, anchor=anchor)


def line(draw, points, fill, width=1):
    draw.line([(x * SCALE, y * SCALE) for x, y in points], fill=fill, width=width * SCALE)


def rect(draw, box, fill, outline=None, width=1, radius=0):
    draw.rounded_rectangle(tuple(v * SCALE for v in box), radius=radius * SCALE, fill=fill, outline=outline, width=width * SCALE)


def save(image, name, size=None):
    if size:
        image = image.resize((size[0] * SCALE, size[1] * SCALE), Image.Resampling.LANCZOS)
    image = image.resize((image.width // SCALE, image.height // SCALE), Image.Resampling.LANCZOS)
    image.save(OUT / name, optimize=True)


def logo():
    image = Image.new("RGBA", (512 * SCALE, 512 * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.ellipse((18 * SCALE, 18 * SCALE, 494 * SCALE, 494 * SCALE), fill=COLORS["ink"])
    draw.ellipse((51 * SCALE, 51 * SCALE, 461 * SCALE, 461 * SCALE), outline=COLORS["blue"], width=12 * SCALE)
    draw_text(draw, (256, 238), "bzx", 132, COLORS["paper"], bold=True, anchor="mm")
    line(draw, [(145, 361), (367, 361)], COLORS["yellow"], 10)
    draw.ellipse((385 * SCALE, 346 * SCALE, 405 * SCALE, 366 * SCALE), fill=COLORS["yellow"])
    final = image.resize((512, 512), Image.Resampling.LANCZOS)
    final.save(OUT / "logo-mark.png", optimize=True)
    final.resize((180, 180), Image.Resampling.LANCZOS).save(OUT / "apple-touch-icon.png", optimize=True)
    pwa = Image.new("RGBA", (512, 512), COLORS["paper"])
    pwa_logo = final.resize((388, 388), Image.Resampling.LANCZOS)
    pwa.alpha_composite(pwa_logo, (62, 62))
    pwa.convert("RGB").save(OUT / "pwa-512.png", optimize=True)
    pwa.resize((192, 192), Image.Resampling.LANCZOS).save(OUT / "pwa-192.png", optimize=True)
    maskable = Image.new("RGB", (512, 512), COLORS["ink"])
    maskable_logo = final.resize((330, 330), Image.Resampling.LANCZOS)
    maskable.paste(maskable_logo, (91, 91), maskable_logo)
    maskable.save(OUT / "pwa-512-maskable.png", optimize=True)
    final.resize((64, 64), Image.Resampling.LANCZOS).save(OUT / "favicon.png", optimize=True)
    final.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])


def hero_workbench():
    image = canvas(900, 620, COLORS["dark"] if "dark" in COLORS else "#202428")
    draw = ImageDraw.Draw(image)
    # Abstract workbench: local, editorial, and intentionally not a stock photo.
    for x in range(0, 900, 42):
        line(draw, [(x, 0), (x - 180, 620)], "#292e33", 1)
    for y in range(70, 620, 48):
        line(draw, [(0, y), (900, y + 120)], "#292e33", 1)
    rect(draw, (84, 92, 816, 492), "#293139", outline="#4a555d", width=2, radius=10)
    rect(draw, (120, 126, 620, 410), "#101417", outline="#66737b", width=2, radius=5)
    rect(draw, (151, 158, 589, 388), "#1b2830", radius=3)
    # Window and code-like marks.
    draw.ellipse((169 * SCALE, 176 * SCALE, 181 * SCALE, 188 * SCALE), fill=COLORS["pink"])
    draw.ellipse((190 * SCALE, 176 * SCALE, 202 * SCALE, 188 * SCALE), fill=COLORS["yellow"])
    draw.ellipse((211 * SCALE, 176 * SCALE, 223 * SCALE, 188 * SCALE), fill=COLORS["green"])
    for i, length in enumerate([220, 170, 275, 130, 235, 190]):
        line(draw, [(180, 220 + i * 25), (180 + length, 220 + i * 25)], COLORS["blue"] if i == 2 else "#52636d", 4)
    rect(draw, (660, 183, 755, 292), COLORS["blue"], radius=8)
    draw_text(draw, (707, 238), "B", 56, COLORS["paper"], bold=True, anchor="mm")
    rect(draw, (669, 330, 790, 358), COLORS["yellow"], radius=5)
    draw_text(draw, (729, 344), "BUILD", 10, COLORS["ink"], bold=True, anchor="mm")
    line(draw, [(650, 404), (774, 404)], "#78868c", 3)
    line(draw, [(650, 427), (720, 427)], "#53636b", 3)
    draw_text(draw, (84, 560), "A PERSONAL SYSTEM FOR CURIOUS THINGS", 15, "#aeb8bd", bold=True)
    save(image, "hero-workbench.png")


def project_art(name, background, accent, title, subtitle, mark):
    image = canvas(900, 600, background)
    draw = ImageDraw.Draw(image)
    # Offset blocks create the site's paper-cut visual language.
    rect(draw, (52, 50, 848, 550), background, outline=accent, width=3, radius=8)
    line(draw, [(70, 462), (830, 462)], accent, 2)
    line(draw, [(70, 122), (830, 122)], accent, 2)
    draw_text(draw, (78, 90), subtitle.upper(), 15, accent, bold=True)
    draw_text(draw, (78, 508), title, 24, COLORS["ink"], bold=True, cjk=any("\u4e00" <= char <= "\u9fff" for char in title))
    draw_text(draw, (780, 512), mark, 32, accent, bold=True, anchor="mm")
    return image


def project_artworks():
    xiaoman = project_art("xiaoman", COLORS["sky"], COLORS["blue"], "小满 / Xiaoman", "A quiet reading app", "01")
    draw = ImageDraw.Draw(xiaoman)
    draw_text(draw, (450, 240), "小", 104, COLORS["ink"], bold=True, cjk=True, anchor="mm")
    draw_text(draw, (450, 345), "满", 104, COLORS["ink"], bold=True, cjk=True, anchor="mm")
    save(xiaoman, "project-xiaoman.png")

    extension = project_art("extension", COLORS["lavender"], "#655a99", "书签快存", "Chrome extension / MV3", "02")
    draw = ImageDraw.Draw(extension)
    rect(draw, (310, 165, 590, 370), COLORS["paper"], outline="#655a99", width=3, radius=12)
    for x, color in [(335, COLORS["pink"]), (357, COLORS["yellow"]), (379, COLORS["green"])]:
        draw.ellipse((x * SCALE, 187 * SCALE, (x + 12) * SCALE, 199 * SCALE), fill=color)
    line(draw, [(360, 240), (540, 240)], COLORS["blue"], 6)
    line(draw, [(360, 276), (505, 276)], "#a69ec8", 6)
    line(draw, [(360, 312), (530, 312)], "#a69ec8", 6)
    save(extension, "project-bookmark-extension.png")

    benchmark = project_art("benchmark", "#e5e2f4", COLORS["blue"], "人类基准测试", "Cognitive games / online benchmark", "05")
    draw = ImageDraw.Draw(benchmark)
    rect(draw, (228, 158, 672, 370), COLORS["paper"], outline=COLORS["blue"], width=3, radius=10)
    draw_text(draw, (450, 190), "HUMAN", 18, COLORS["blue"], bold=True, anchor="mm")
    draw_text(draw, (450, 218), "BENCHMARK", 18, COLORS["ink"], bold=True, anchor="mm")
    tiles = [(278, 270, COLORS["blue"]), (354, 270, COLORS["yellow"]), (430, 270, COLORS["pink"]), (506, 270, COLORS["green"]), (582, 270, "#9a8ed0")]
    for x, y, color in tiles:
        rect(draw, (x, y, x + 48, y + 48), color, radius=7)
    line(draw, [(278, 350), (622, 350)], "#c5c1d8", 3)
    save(benchmark, "project-human-benchmark.png")

    tiny = project_art("tiny", COLORS["yellow"], COLORS["ink"], "Tiny Tools", "Small tools, low friction", "03")
    draw = ImageDraw.Draw(tiny)
    for x in [350, 425, 500]:
        for y in [210, 285, 360]:
            rect(draw, (x, y, x + 48, y + 48), COLORS["paper"], outline=COLORS["ink"], width=2, radius=5)
    save(tiny, "project-tiny-tools.png")

    chicken = project_art("chicken", "#f2e4d1", "#e87971", "一百万只鸡", "A probability simulation", "05")
    draw = ImageDraw.Draw(chicken)
    for x, y in [(350, 205), (450, 170), (550, 205)]:
        draw.ellipse((x * SCALE, y * SCALE, (x + 70) * SCALE, (y + 70) * SCALE), fill="#fffaf0", outline="#e87971", width=3 * SCALE)
        draw.ellipse(((x + 47) * SCALE, (y + 18) * SCALE, (x + 58) * SCALE, (y + 29) * SCALE), fill="#253a40")
        line(draw, [(x + 12, y + 62), (x + 5, y + 92)], "#e87971", 4)
        line(draw, [(x + 48, y + 62), (x + 55, y + 92)], "#e87971", 4)
    line(draw, [(345, 300), (605, 300)], "#e87971", 3)
    draw_text(draw, (450, 350), "N → N 次随机操作", 17, COLORS["ink"], bold=True, anchor="mm")
    save(chicken, "game-chicken-legs.png")

    rain = project_art("rain", COLORS["mint"], "#e87971", "Rainy Day", "A five minute game", "04")
    draw = ImageDraw.Draw(rain)
    rect(draw, (340, 165, 560, 355), "#253a40", radius=8)
    rect(draw, (360, 185, 540, 335), "#b8d1ce", radius=3)
    for x in range(380, 530, 28):
        line(draw, [(x, 210), (x - 18, 305)], "#779c9b", 3)
    draw.ellipse((430 * SCALE, 274 * SCALE, 468 * SCALE, 312 * SCALE), fill="#e87971")
    save(rain, "game-rainy-day.png")


if __name__ == "__main__":
    logo()
    hero_workbench()
    project_artworks()
    print(f"Generated assets in {OUT}")
