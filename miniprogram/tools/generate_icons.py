from pathlib import Path
from PIL import Image, ImageDraw

SIZE = 256
OUT = Path(__file__).resolve().parent.parent / "assets" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

INK = "#25221d"
CREAM = "#fbf7f0"
ACCENT = "#d95b33"
MUTED = "#a89e90"
ACTIVE = "#b8461f"


def base():
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def save(image, name, pixels):
    image.resize((pixels, pixels), Image.LANCZOS).save(OUT / f"{name}.png")


def icon_today(color):
    image, draw = base()
    draw.ellipse((76, 76, 180, 180), outline=color, width=18)
    for x1, y1, x2, y2 in [
        (128, 20, 128, 46),
        (128, 210, 128, 236),
        (20, 128, 46, 128),
        (210, 128, 236, 128),
        (51, 51, 69, 69),
        (187, 187, 205, 205),
        (51, 205, 69, 187),
        (187, 69, 205, 51),
    ]:
        draw.line((x1, y1, x2, y2), fill=color, width=18)
    return image


def icon_collect(color):
    image, draw = base()
    draw.rounded_rectangle((38, 58, 218, 198), radius=18, outline=color, width=18)
    draw.line((38, 148, 86, 148), fill=color, width=18, joint="curve")
    draw.line((86, 148, 108, 180), fill=color, width=18, joint="curve")
    draw.line((108, 180, 148, 180), fill=color, width=18, joint="curve")
    draw.line((148, 180, 170, 148), fill=color, width=18, joint="curve")
    draw.line((170, 148, 218, 148), fill=color, width=18, joint="curve")
    return image


def icon_review(color):
    image, draw = base()
    draw.rounded_rectangle((62, 38, 194, 218), radius=18, outline=color, width=18)
    draw.line((94, 92, 162, 92), fill=color, width=16)
    draw.line((94, 128, 162, 128), fill=color, width=16)
    draw.line((94, 164, 142, 164), fill=color, width=16)
    return image


def icon_stats(color):
    image, draw = base()
    draw.line((66, 208, 66, 148), fill=color, width=24)
    draw.line((128, 208, 128, 72), fill=color, width=24)
    draw.line((190, 208, 190, 120), fill=color, width=24)
    return image


def icon_settings(color):
    image, draw = base()
    draw.ellipse((86, 86, 170, 170), outline=color, width=18)
    for x1, y1, x2, y2 in [
        (128, 24, 128, 54),
        (128, 202, 128, 232),
        (24, 128, 54, 128),
        (202, 128, 232, 128),
        (55, 55, 77, 77),
        (179, 179, 201, 201),
        (55, 201, 77, 179),
        (179, 77, 201, 55),
    ]:
        draw.line((x1, y1, x2, y2), fill=color, width=18)
    return image


def icon_back(color):
    image, draw = base()
    draw.line((160, 46, 84, 128, 160, 210), fill=color, width=24, joint="curve")
    return image


def icon_close(color):
    image, draw = base()
    draw.line((72, 72, 184, 184), fill=color, width=24)
    draw.line((184, 72, 72, 184), fill=color, width=24)
    return image


def icon_plus(color):
    image, draw = base()
    draw.line((128, 52, 128, 204), fill=color, width=24)
    draw.line((52, 128, 204, 128), fill=color, width=24)
    return image


def icon_play(color):
    image, draw = base()
    draw.polygon([(86, 54), (206, 128), (86, 202)], fill=color)
    return image


def icon_pause(color):
    image, draw = base()
    draw.rounded_rectangle((72, 54, 112, 202), radius=8, fill=color)
    draw.rounded_rectangle((144, 54, 184, 202), radius=8, fill=color)
    return image


def icon_check(color):
    image, draw = base()
    draw.line((52, 132, 104, 184, 204, 72), fill=color, width=26, joint="curve")
    return image


def icon_refresh(color):
    image, draw = base()
    draw.arc((58, 58, 198, 198), start=38, end=326, fill=color, width=22)
    draw.polygon([(196, 48), (224, 92), (172, 98)], fill=color)
    return image


def icon_trash(color):
    image, draw = base()
    draw.line((48, 82, 208, 82), fill=color, width=18)
    draw.line((104, 54, 152, 54), fill=color, width=18)
    draw.line((104, 54, 104, 82), fill=color, width=18)
    draw.line((152, 54, 152, 82), fill=color, width=18)
    draw.rounded_rectangle((72, 82, 184, 214), radius=14, outline=color, width=18)
    draw.line((112, 116, 112, 180), fill=color, width=14)
    draw.line((144, 116, 144, 180), fill=color, width=14)
    return image


def icon_edit(color):
    image, draw = base()
    draw.line((64, 192, 84, 146, 164, 66), fill=color, width=24, joint="curve")
    draw.line((84, 146, 122, 184), fill=color, width=24, joint="curve")
    draw.line((156, 58, 198, 100), fill=color, width=24, joint="curve")
    draw.line((64, 192, 116, 180), fill=color, width=18)
    return image


def icon_arrow_right(color):
    image, draw = base()
    draw.line((48, 128, 198, 128), fill=color, width=22)
    draw.line((142, 72, 198, 128, 142, 184), fill=color, width=22, joint="curve")
    return image


def icon_clock(color):
    image, draw = base()
    draw.ellipse((44, 44, 212, 212), outline=color, width=20)
    draw.line((128, 128, 128, 78), fill=color, width=18)
    draw.line((128, 128, 174, 152), fill=color, width=18)
    return image


def icon_spark(color):
    image, draw = base()
    draw.polygon(
        [
            (128, 34),
            (148, 108),
            (222, 128),
            (148, 148),
            (128, 222),
            (108, 148),
            (34, 128),
            (108, 108),
        ],
        fill=color,
    )
    return image


def icon_calendar(color):
    image, draw = base()
    draw.rounded_rectangle((46, 64, 210, 212), radius=18, outline=color, width=18)
    draw.line((46, 112, 210, 112), fill=color, width=16)
    draw.line((88, 42, 88, 82), fill=color, width=18)
    draw.line((168, 42, 168, 82), fill=color, width=18)
    return image


def icon_target(color):
    image, draw = base()
    draw.ellipse((44, 44, 212, 212), outline=color, width=18)
    draw.ellipse((88, 88, 168, 168), outline=color, width=18)
    draw.ellipse((118, 118, 138, 138), fill=color)
    return image


def main():
    for name, renderer in [
        ("today", icon_today),
        ("collect", icon_collect),
        ("review", icon_review),
        ("stats", icon_stats),
    ]:
        save(renderer(MUTED), f"tab-{name}", 81)
        save(renderer(ACTIVE), f"tab-{name}-active", 81)

    variants = [
        ("back", icon_back, [("ink", INK), ("cream", CREAM)]),
        ("close", icon_close, [("ink", INK), ("cream", CREAM)]),
        ("plus", icon_plus, [("ink", INK), ("cream", CREAM)]),
        ("play", icon_play, [("ink", INK), ("cream", CREAM)]),
        ("pause", icon_pause, [("ink", INK), ("cream", CREAM)]),
        ("check", icon_check, [("ink", INK), ("cream", CREAM)]),
        ("settings", icon_settings, [("ink", INK)]),
        ("refresh", icon_refresh, [("ink", INK), ("cream", CREAM)]),
        ("trash", icon_trash, [("ink", INK)]),
        ("edit", icon_edit, [("ink", INK)]),
        ("arrow-right", icon_arrow_right, [("ink", INK), ("cream", CREAM)]),
        ("clock", icon_clock, [("muted", MUTED), ("accent", ACCENT)]),
        ("spark", icon_spark, [("accent", ACCENT)]),
        ("calendar", icon_calendar, [("ink", INK)]),
        ("target", icon_target, [("accent", ACCENT)]),
    ]
    for name, renderer, colors in variants:
        for suffix, color in colors:
            save(renderer(color), f"{name}-{suffix}", 64)


if __name__ == "__main__":
    main()
