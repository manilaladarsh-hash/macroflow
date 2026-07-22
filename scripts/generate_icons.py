from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)


def font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        Path(r"C:\Windows\Fonts\seguisb.ttf"),
        Path(r"C:\Windows\Fonts\arialbd.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def build_icon(size: int) -> None:
    image = Image.new("RGB", (size, size), "#081019")
    draw = ImageDraw.Draw(image)
    inset = round(size * 0.09)
    radius = round(size * 0.23)
    draw.rounded_rectangle((inset, inset, size - inset, size - inset), radius=radius, fill="#11905d")

    label_font = font(round(size * 0.43))
    bbox = draw.textbbox((0, 0), "M", font=label_font)
    width, height = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - width) / 2, size * 0.12), "M", font=label_font, fill="#f4fff9")

    points = [
        (size * 0.22, size * 0.72),
        (size * 0.36, size * 0.62),
        (size * 0.49, size * 0.68),
        (size * 0.64, size * 0.48),
        (size * 0.79, size * 0.55),
    ]
    draw.line(points, fill="#a7f3d0", width=max(3, round(size * 0.025)), joint="curve")
    dot = round(size * 0.026)
    for x, y in points:
        draw.ellipse((x - dot, y - dot, x + dot, y + dot), fill="#f4fff9")

    image.save(OUT / f"icon-{size}.png", optimize=True)


for icon_size in (192, 512):
    build_icon(icon_size)
