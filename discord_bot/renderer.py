"""Render tile maps to PNG images using Pillow."""
from __future__ import annotations
import io
from PIL import Image, ImageDraw, ImageFont

# Tile colour palette matching the web app's CSS variables
TILE_COLOURS = {
    0:  (18, 18, 24),      # wall/void — near-black
    1:  (44, 40, 34),      # floor — warm dark brown
    2:  (120, 80, 40),     # door — oak brown
    3:  (30, 60, 120),     # water — deep blue
    4:  (180, 60, 10),     # lava — orange-red
    5:  (20, 70, 20),      # tree/vegetation — dark green
    6:  (80, 70, 55),      # road/path — sandy grey-brown
    7:  (65, 58, 50),      # rubble — dark grey-brown
    8:  (50, 45, 45),      # pillar — dark stone
    9:  (180, 140, 20),    # chest — gold
    10: (100, 90, 110),    # stairs — muted purple-grey
    11: (180, 30, 30),     # trap — red warning
    12: (30, 90, 30),      # grass — mid green
    13: (160, 130, 80),    # sand/dirt — tan
    14: (180, 200, 220),   # snow/ice — pale blue-white
}

TILE_ICONS = {
    2:  "D",   # door
    9:  "C",   # chest
    10: "↑",   # stairs
    11: "!",   # trap
}

TILE_SIZE = 16  # pixels per tile
ROOM_LABEL_MIN_SIZE = 4  # rooms smaller than this don't get a label


def render(map_data: dict, tile_px: int = TILE_SIZE) -> io.BytesIO:
    """Render map_data dict (from MapResult.to_dict()) to a PNG BytesIO."""
    tiles = map_data["tiles"]
    h = len(tiles)
    w = len(tiles[0]) if h else 0
    img_w = w * tile_px
    img_h = h * tile_px

    img = Image.new("RGB", (img_w, img_h), TILE_COLOURS[0])
    draw = ImageDraw.Draw(img)

    # Draw tiles
    for row_i, row in enumerate(tiles):
        for col_i, tile_id in enumerate(row):
            colour = TILE_COLOURS.get(tile_id, TILE_COLOURS[0])
            x0, y0 = col_i * tile_px, row_i * tile_px
            x1, y1 = x0 + tile_px - 1, y0 + tile_px - 1
            draw.rectangle([x0, y0, x1, y1], fill=colour)

            icon = TILE_ICONS.get(tile_id)
            if icon and tile_px >= 12:
                tx = x0 + tile_px // 2
                ty = y0 + tile_px // 2
                draw.text((tx, ty), icon, fill=(240, 220, 180), anchor="mm")

    # Draw room labels if tiles are large enough
    if tile_px >= 12:
        for room in map_data.get("rooms", []):
            rw, rh = room.get("w", 0), room.get("h", 0)
            if rw < ROOM_LABEL_MIN_SIZE or rh < ROOM_LABEL_MIN_SIZE:
                continue
            cx = (room["x"] + rw // 2) * tile_px
            cy = (room["y"] + rh // 2) * tile_px
            label = room.get("room_type", "")[:8]
            draw.text((cx, cy), label, fill=(200, 180, 140), anchor="mm")

    # Thin grid lines for readability
    grid_colour = (0, 0, 0, 80)
    if tile_px >= 8:
        for col_i in range(w + 1):
            x = col_i * tile_px
            draw.line([(x, 0), (x, img_h)], fill=(0, 0, 0), width=1)
        for row_i in range(h + 1):
            y = row_i * tile_px
            draw.line([(0, y), (img_w, y)], fill=(0, 0, 0), width=1)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def scale_for_discord(map_data: dict, max_px: int = 1024) -> io.BytesIO:
    """Render at a tile size that keeps the image under max_px in each dimension."""
    w = len(map_data["tiles"][0]) if map_data["tiles"] else 1
    h = len(map_data["tiles"])
    tile_px = min(max_px // max(w, 1), max_px // max(h, 1), TILE_SIZE)
    tile_px = max(tile_px, 4)
    return render(map_data, tile_px=tile_px)
