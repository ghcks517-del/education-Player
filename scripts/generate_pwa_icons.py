import zlib
import struct
import math
import os

def write_png(filename, width, height, rgba_data):
    """Writes an RGBA bytearray to a valid PNG file using pure Python stdlib."""
    png_sig = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    ihdr_chunk = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    raw_scanlines = bytearray()
    row_bytes = width * 4
    for y in range(height):
        raw_scanlines.append(0)  # filter type 0
        raw_scanlines.extend(rgba_data[y * row_bytes : (y + 1) * row_bytes])
        
    compressed_data = zlib.compress(bytes(raw_scanlines), level=9)
    idat_crc = zlib.crc32(b'IDAT' + compressed_data)
    idat_chunk = struct.pack('>I', len(compressed_data)) + b'IDAT' + compressed_data + struct.pack('>I', idat_crc)
    
    iend_crc = zlib.crc32(b'IEND')
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    with open(filename, 'wb') as f:
        f.write(png_sig)
        f.write(ihdr_chunk)
        f.write(idat_chunk)
        f.write(iend_chunk)
    print(f"Generated {filename} ({width}x{height}, {os.path.getsize(filename)} bytes)")

def point_in_triangle(px, py, x1, y1, x2, y2, x3, y3):
    d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2)
    d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3)
    d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1)
    has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (has_neg and has_pos)

def generate_tv_icon(size, is_maskable=False):
    """Renders a TV-shaped app icon for '안전 교육 영상'."""
    w, h = size, size
    buf = bytearray(w * h * 4)

    # Base coordinates scaled to size
    corner_radius = 0.0 if is_maskable else (w * 0.22)
    
    # TV position and dimensions (normalized 0..1)
    scale = 0.72 if is_maskable else 0.88
    # Center of TV
    ctx = 0.5
    cty = 0.52 if not is_maskable else 0.50

    tv_w = 0.78 * scale
    tv_h = 0.58 * scale
    tv_x0 = ctx - tv_w / 2
    tv_x1 = ctx + tv_w / 2
    tv_y0 = cty - tv_h / 2
    tv_y1 = cty + tv_h / 2

    # Screen dimensions inside TV
    screen_w = 0.52 * scale
    screen_h = 0.46 * scale
    screen_x0 = tv_x0 + 0.05 * scale
    screen_x1 = screen_x0 + screen_w
    screen_y0 = cty - screen_h / 2
    screen_y1 = screen_y0 + screen_h

    # Right panel controls inside TV
    ctrl_x = tv_x1 - 0.12 * scale

    for y in range(h):
        ny = (y + 0.5) / h
        for x in range(w):
            nx = (x + 0.5) / w
            idx = (y * w + x) * 4

            # Rounded squircle mask for non-maskable
            if not is_maskable:
                dx = max(0, abs(x - w / 2) - (w / 2 - corner_radius))
                dy = max(0, abs(y - h / 2) - (h / 2 - corner_radius))
                dist_corner = math.sqrt(dx * dx + dy * dy)
                if dist_corner > corner_radius:
                    buf[idx:idx+4] = b'\x00\x00\x00\x00'
                    continue

            # App Background (Deep Slate Blue)
            # Subtle vertical gradient from #1E293B (30, 41, 59) to #0F172A (15, 23, 42)
            bg_factor = ny
            r = int(30 * (1 - bg_factor) + 15 * bg_factor)
            g = int(41 * (1 - bg_factor) + 23 * bg_factor)
            b = int(59 * (1 - bg_factor) + 42 * bg_factor)

            # TV Legs (two slanted pegs at bottom)
            # Left leg
            leg_y_top = tv_y1
            leg_y_bot = tv_y1 + 0.08 * scale
            if leg_y_top <= ny <= leg_y_bot:
                t = (ny - leg_y_top) / (leg_y_bot - leg_y_top)
                left_leg_x = (tv_x0 + 0.10 * scale) - t * (0.04 * scale)
                right_leg_x = (tv_x1 - 0.10 * scale) + t * (0.04 * scale)
                if abs(nx - left_leg_x) < 0.035 * scale or abs(nx - right_leg_x) < 0.035 * scale:
                    r, g, b = 71, 85, 105

            # TV Antennas (V-shape)
            ant_base_x = ctx
            ant_base_y = tv_y0
            ant_tip_left_x = ctx - 0.22 * scale
            ant_tip_left_y = tv_y0 - 0.16 * scale
            ant_tip_right_x = ctx + 0.22 * scale
            ant_tip_right_y = tv_y0 - 0.16 * scale

            # Distance to left antenna line segment
            # Segment 1: (ant_base_x, ant_base_y) to (ant_tip_left_x, ant_tip_left_y)
            for tip_x, tip_y in [(ant_tip_left_x, ant_tip_left_y), (ant_tip_right_x, ant_tip_right_y)]:
                dx = tip_x - ant_base_x
                dy = tip_y - ant_base_y
                l2 = dx*dx + dy*dy
                t = max(0.0, min(1.0, ((nx - ant_base_x)*dx + (ny - ant_base_y)*dy) / l2))
                px = ant_base_x + t*dx
                py = ant_base_y + t*dy
                dist = math.hypot(nx - px, ny - py)
                if dist < 0.015 * scale:
                    r, g, b = 148, 163, 184 # Metallic slate
                # Antenna tip ball
                dist_tip = math.hypot(nx - tip_x, ny - tip_y)
                if dist_tip < 0.026 * scale:
                    r, g, b = 243, 115, 33 # Hanwha orange ball

            # TV Body Frame (Rounded Box)
            if tv_x0 <= nx <= tv_x1 and tv_y0 <= ny <= tv_y1:
                # Body border & fill
                r, g, b = 30, 41, 59 # Slate-800
                # Border highlight
                if nx < tv_x0 + 0.02 or nx > tv_x1 - 0.02 or ny < tv_y0 + 0.02 or ny > tv_y1 - 0.02:
                    r, g, b = 71, 85, 105

            # TV Screen Frame (Inner Bezel)
            if (screen_x0 - 0.015*scale) <= nx <= (screen_x1 + 0.015*scale) and (screen_y0 - 0.015*scale) <= ny <= (screen_y1 + 0.015*scale):
                r, g, b = 10, 15, 26 # Black Bezel

            # TV Screen Display (Vibrant Hanwha Orange Screen with Play Icon)
            if screen_x0 <= nx <= screen_x1 and screen_y0 <= ny <= screen_y1:
                # Screen gradient: vibrant Hanwha orange to warm crimson
                s_factor = (ny - screen_y0) / screen_h
                r = int(255 * (1 - s_factor) + 228 * s_factor) # #FF7A1A to #E4222D
                g = int(122 * (1 - s_factor) + 34 * s_factor)
                b = int(26 * (1 - s_factor) + 45 * s_factor)

                # Diagonal gloss highlight
                if (nx - screen_x0) * 1.5 + (ny - screen_y0) < screen_w * 0.7:
                    r = min(255, r + 45)
                    g = min(255, g + 40)
                    b = min(255, b + 45)

                # Center Play Button (White Triangle ▶)
                play_cx = (screen_x0 + screen_x1) / 2
                play_cy = (screen_y0 + screen_y1) / 2
                tri_w = 0.12 * scale
                tri_h = 0.14 * scale
                x1_tri, y1_tri = play_cx - tri_w/2, play_cy - tri_h/2
                x2_tri, y2_tri = play_cx + tri_w/2, play_cy
                x3_tri, y3_tri = play_cx - tri_w/2, play_cy + tri_h/2

                if point_in_triangle(nx, ny, x1_tri, y1_tri, x2_tri, y2_tri, x3_tri, y3_tri):
                    r, g, b = 255, 255, 255

            # Right TV Panel (Knobs & Speaker)
            if tv_x1 - 0.17 * scale <= nx <= tv_x1 - 0.04 * scale and tv_y0 + 0.06 * scale <= ny <= tv_y1 - 0.06 * scale:
                # Knob 1
                k1_y = tv_y0 + 0.12 * scale
                k1_dist = math.hypot(nx - ctrl_x, ny - k1_y)
                if k1_dist < 0.038 * scale:
                    r, g, b = 51, 65, 85
                    if k1_dist < 0.015 * scale:
                        r, g, b = 243, 115, 33

                # Knob 2
                k2_y = tv_y0 + 0.22 * scale
                k2_dist = math.hypot(nx - ctrl_x, ny - k2_y)
                if k2_dist < 0.038 * scale:
                    r, g, b = 51, 65, 85
                    if k2_dist < 0.015 * scale:
                        r, g, b = 243, 115, 33

                # Speaker Grilles
                for slot_idx in range(4):
                    slot_y = tv_y0 + (0.33 + slot_idx * 0.05) * scale
                    if abs(ny - slot_y) < 0.008 * scale and abs(nx - ctrl_x) < 0.038 * scale:
                        r, g, b = 15, 23, 42

            buf[idx] = min(255, max(0, r))
            buf[idx+1] = min(255, max(0, g))
            buf[idx+2] = min(255, max(0, b))
            buf[idx+3] = 255

    return bytes(buf)

os.makedirs('public', exist_ok=True)

# 1. 192x192
write_png('public/pwa-192x192.png', 192, 192, generate_tv_icon(192, is_maskable=False))

# 2. 512x512
write_png('public/pwa-512x512.png', 512, 512, generate_tv_icon(512, is_maskable=False))

# 3. 512x512 maskable (padded safe zone for Android squircle crop)
write_png('public/pwa-maskable-512x512.png', 512, 512, generate_tv_icon(512, is_maskable=True))

# 4. 180x180 Apple touch icon for iPad / iPhone
write_png('public/apple-touch-icon.png', 180, 180, generate_tv_icon(180, is_maskable=False))

# 5. favicon-32x32.png
write_png('public/favicon-32x32.png', 32, 32, generate_tv_icon(32, is_maskable=False))

print("All TV-shaped PWA icons generated successfully!")
