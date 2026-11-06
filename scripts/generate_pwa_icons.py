import zlib
import struct
import math
import os

def write_png(filename, width, height, rgba_data):
    """Writes an RGBA bytearray to a valid PNG file using pure Python stdlib."""
    # PNG signature
    png_sig = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    ihdr_chunk = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # Scanlines with filter byte 0 (None)
    raw_scanlines = bytearray()
    row_bytes = width * 4
    for y in range(height):
        raw_scanlines.append(0)  # filter type 0
        raw_scanlines.extend(rgba_data[y * row_bytes : (y + 1) * row_bytes])
        
    compressed_data = zlib.compress(bytes(raw_scanlines), level=9)
    idat_crc = zlib.crc32(b'IDAT' + compressed_data)
    idat_chunk = struct.pack('>I', len(compressed_data)) + b'IDAT' + compressed_data + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    with open(filename, 'wb') as f:
        f.write(png_sig)
        f.write(ihdr_chunk)
        f.write(idat_chunk)
        f.write(iend_chunk)
    print(f"Generated {filename} ({width}x{height}, {os.path.getsize(filename)} bytes)")

def generate_hanwha_icon(size, is_maskable=False):
    """Renders a Hanwha Momentum branded app icon at specified size."""
    w, h = size, size
    buf = bytearray(w * h * 4)

    # Colors
    c_ring1 = (243, 115, 33)   # Hanwha Core Orange #F37321
    c_ring2 = (248, 155, 108)  # Warm orange #F89B6C
    c_ring3 = (251, 181, 132)  # Soft apricot #FBB584
    c_white = (255, 255, 255)
    c_bg_dark = (248, 250, 252)

    # Ellipse ring definitions (center_x, center_y, rx, ry, angle_rad, thickness, color)
    # Scaled to fit within 0..1 coordinate system
    # Authentic Hanwha 3-ring arrangement:
    # Scale factor depending on maskable safe zone
    scale = 0.55 if is_maskable else 0.68
    offset_x = 0.5
    offset_y = 0.5

    # Ring 1: Dominant core ring (slanted ~-30 deg)
    # Ring 2: Bottom-right ring (slanted ~+35 deg)
    # Ring 3: Top-right ring (horizontal/slightly tilted ~+5 deg)
    rings = [
        # (cx, cy, rx, ry, angle, thick, color)
        # Ring 3 (background ring):
        (0.04, -0.06, 0.26, 0.17, math.radians(5), 0.052, c_ring3),
        # Ring 2 (bottom-right ring):
        (0.06, 0.12, 0.23, 0.19, math.radians(40), 0.054, c_ring2),
        # Ring 1 (dominant center ring):
        (-0.07, -0.04, 0.30, 0.22, math.radians(-32), 0.062, c_ring1),
    ]

    corner_radius = 0.0 if is_maskable else (w * 0.22)

    for y in range(h):
        ny = (y + 0.5) / h
        for x in range(w):
            nx = (x + 0.5) / w
            idx = (y * w + x) * 4

            # Rounded rect mask for non-maskable
            if not is_maskable:
                # Distance to edge for squircle
                dx = max(0, abs(x - w / 2) - (w / 2 - corner_radius))
                dy = max(0, abs(y - h / 2) - (h / 2 - corner_radius))
                dist_corner = math.sqrt(dx * dx + dy * dy)
                if dist_corner > corner_radius:
                    # Transparent outside corner
                    buf[idx:idx+4] = b'\x00\x00\x00\x00'
                    continue

            # Base background: subtle bright warm gradient
            # from pure white at top to soft slate #F8FAFC
            grad = y / h
            bg_r = int(255 * (1 - grad) + 248 * grad)
            bg_g = int(255 * (1 - grad) + 250 * grad)
            bg_b = int(255 * (1 - grad) + 252 * grad)
            
            # Start with background
            cur_r, cur_g, cur_b, cur_a = bg_r, bg_g, bg_b, 1.0

            # Subtle top border/accent
            if y < int(h * 0.035) and not is_maskable:
                # Hanwha orange top edge
                edge_a = 0.8
                cur_r = int(cur_r * (1 - edge_a) + c_ring1[0] * edge_a)
                cur_g = int(cur_g * (1 - edge_a) + c_ring1[1] * edge_a)
                cur_b = int(cur_b * (1 - edge_a) + c_ring1[2] * edge_a)

            # Draw the 3 rings with smooth anti-aliasing
            # Test point in ring coordinate space
            px = (nx - offset_x) / scale
            py = (ny - offset_y) / scale

            for (cx, cy, rx, ry, ang, thick, (rr, rg, rb)) in rings:
                # Rotate point back
                cos_a = math.cos(-ang)
                sin_a = math.sin(-ang)
                dx = px - cx
                dy = py - cy
                rx_rot = dx * cos_a - dy * sin_a
                ry_rot = dx * sin_a + dy * cos_a

                # Normalized ellipse distance: d = sqrt((rx_rot/rx)^2 + (ry_rot/ry)^2)
                d_ellipse = math.sqrt((rx_rot / rx) ** 2 + (ry_rot / ry) ** 2)
                # Distance to the ellipse boundary (1.0)
                # We want a ring centered on 1.0 with half-thickness (thick / 2)
                half_t = thick / (2.0 * math.sqrt(rx * ry))
                dist_to_centerline = abs(d_ellipse - 1.0)
                
                # Smooth edge in pixel space
                pixel_scale = 1.0 / (scale * size * math.sqrt(rx * ry))
                edge_width = 1.6 * pixel_scale
                
                if dist_to_centerline < half_t + edge_width:
                    if dist_to_centerline < half_t - edge_width:
                        alpha = 1.0
                    else:
                        alpha = (half_t + edge_width - dist_to_centerline) / (2.0 * edge_width)
                        alpha = max(0.0, min(1.0, alpha))
                    
                    # Blend with current pixel
                    cur_r = int(cur_r * (1 - alpha) + rr * alpha)
                    cur_g = int(cur_g * (1 - alpha) + rg * alpha)
                    cur_b = int(cur_b * (1 - alpha) + rb * alpha)

            buf[idx] = min(255, max(0, cur_r))
            buf[idx+1] = min(255, max(0, cur_g))
            buf[idx+2] = min(255, max(0, cur_b))
            buf[idx+3] = 255

    return bytes(buf)

os.makedirs('public', exist_ok=True)

# 1. 192x192
write_png('public/pwa-192x192.png', 192, 192, generate_hanwha_icon(192, is_maskable=False))

# 2. 512x512
write_png('public/pwa-512x512.png', 512, 512, generate_hanwha_icon(512, is_maskable=False))

# 3. 512x512 maskable (padded safe zone for Android squircle crop)
write_png('public/pwa-maskable-512x512.png', 512, 512, generate_hanwha_icon(512, is_maskable=True))

# 4. 180x180 Apple touch icon for iPad / iPhone
write_png('public/apple-touch-icon.png', 180, 180, generate_hanwha_icon(180, is_maskable=False))

# 5. favicon.ico / favicon-32x32.png
write_png('public/favicon-32x32.png', 32, 32, generate_hanwha_icon(32, is_maskable=False))

print("All PWA icons generated successfully!")
