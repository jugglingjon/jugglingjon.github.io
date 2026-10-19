#!/usr/bin/env python3
"""Slims a .glb for the web: resizes and re-encodes its textures, can drop
vertex attributes it doesn't need, narrows 32-bit indices to 16-bit where they
fit, and repacks the buffer. Needs Python 3 and Pillow (pip install pillow).

  python3 scripts/slim-glb.py in.glb out.glb --image N:SIZE:FORMAT[:QUALITY] ... [--drop ATTRIBUTE] [--source N:FILE] [--emissive M:FILE]

--image   texture N (its index in the file's images) to SIZE x SIZE pixels, as
          jpeg (with QUALITY, default 88) or png. Textures not listed are kept.
--drop    a vertex attribute to leave out, e.g. TANGENT. Check the result: three
          works tangents out itself without them, but not always the same way.
--source  an image to use in place of texture N (an edited copy of it, the
          same layout), before any --image resizing.
--emissive  an image (PNG or JPEG, laid out like the base colour texture) to
          add as material M's emissive map: what glows, black elsewhere.

The soda can (public/models/can/soda-can.glb, 460 KB -> 96 KB):
  python3 scripts/slim-glb.py soda_can.glb public/models/can/soda-can.glb \
    --image 0:512:jpeg:85 --image 1:256:png --image 2:512:jpeg:92

The clock radio (public/models/radio/clock-radio.glb, 318 KB -> 48 KB), its
tuning dial painted out of the texture (the site puts a level meter in its
window) and its clock digits lit by a hand-painted glow map:
  python3 scripts/slim-glb.py digital_radio_clock.glb public/models/radio/clock-radio.glb \
    --source 0:texture-meter.png --image 0:512:jpeg:88 --emissive 0:clock-glow.png
"""
import argparse, io, json, struct
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--image', action='append', default=[])
ap.add_argument('--drop', action='append', default=[])
ap.add_argument('--source', action='append', default=[])
ap.add_argument('--emissive', action='append', default=[])
args = ap.parse_args()

data = open(args.src, 'rb').read()
jlen = struct.unpack('<I', data[12:16])[0]
gltf = json.loads(data[20:20 + jlen])
off = 20 + jlen
blen = struct.unpack('<I', data[off:off + 4])[0]
binary = data[off + 8:off + 8 + blen]

views = gltf['bufferViews']
accessors = gltf['accessors']
view_bytes = [binary[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']] for v in views]

# Images: swap in edited copies, then resize and re-encode.
for spec in args.source:
    i, path = spec.split(':', 1)
    view_bytes[gltf['images'][int(i)]['bufferView']] = open(path, 'rb').read()
    print(f'image {i}: from {path}')

for spec in args.image:
    parts = spec.split(':')
    i, size, fmt = int(parts[0]), int(parts[1]), parts[2]
    quality = int(parts[3]) if len(parts) > 3 else 88
    img = gltf['images'][i]
    im = Image.open(io.BytesIO(view_bytes[img['bufferView']]))
    im = im.convert('RGBA' if im.mode in ('RGBA', 'LA') or 'transparency' in im.info else 'RGB')
    im = im.resize((size, size), Image.LANCZOS)
    out = io.BytesIO()
    if fmt == 'jpeg':
        im.convert('RGB').save(out, 'JPEG', quality=quality, optimize=True, progressive=True)
        img['mimeType'] = 'image/jpeg'
    else:
        im.save(out, 'PNG', optimize=True)
        img['mimeType'] = 'image/png'
    print(f'image {i}: {len(view_bytes[img["bufferView"]])} -> {len(out.getvalue())} bytes ({size}px {fmt})')
    view_bytes[img['bufferView']] = out.getvalue()
    views[img['bufferView']].pop('name', None)

# Emissive maps: a new image and texture (sampled like the base colour), glowing at full strength.
for spec in args.emissive:
    m, path = spec.split(':', 1)
    mat = gltf['materials'][int(m)]
    views.append({'buffer': 0})
    view_bytes.append(open(path, 'rb').read())
    gltf['images'].append({'bufferView': len(views) - 1, 'mimeType': 'image/png' if path.lower().endswith('.png') else 'image/jpeg'})
    texture = {'source': len(gltf['images']) - 1}
    base = mat.get('pbrMetallicRoughness', {}).get('baseColorTexture')
    if base and 'sampler' in gltf['textures'][base['index']]:
        texture['sampler'] = gltf['textures'][base['index']]['sampler']
    gltf['textures'].append(texture)
    mat['emissiveTexture'] = {'index': len(gltf['textures']) - 1}
    mat['emissiveFactor'] = [1, 1, 1]
    print(f'material {m}: emissive map {path} ({len(view_bytes[-1])} bytes)')

# Drop vertex attributes, and narrow index buffers.
for mesh in gltf['meshes']:
    for prim in mesh['primitives']:
        for name in args.drop:
            if prim['attributes'].pop(name, None) is not None:
                print(f'dropped {name} from {mesh.get("name")}')
        ai = prim.get('indices')
        if ai is not None:
            acc = accessors[ai]
            v = acc['bufferView']
            if acc['componentType'] == 5125 and acc.get('byteOffset', 0) == 0 and sum(a.get('bufferView') == v for a in accessors) == 1:
                vals = struct.unpack(f'<{acc["count"]}I', view_bytes[v][:4 * acc['count']])
                if max(vals) < 65535:
                    view_bytes[v] = struct.pack(f'<{len(vals)}H', *vals)
                    acc['componentType'] = 5123
                    print(f'indices {ai}: 32 -> 16 bit')

# Keep only what's still used, renumbered.
used_acc = sorted({a for m in gltf['meshes'] for p in m['primitives'] for a in [*p['attributes'].values(), p.get('indices')] if a is not None})
acc_map = {old: new for new, old in enumerate(used_acc)}
used_views = sorted({accessors[a]['bufferView'] for a in used_acc if 'bufferView' in accessors[a]} | {im['bufferView'] for im in gltf.get('images', []) if 'bufferView' in im})
view_map = {old: new for new, old in enumerate(used_views)}
for m in gltf['meshes']:
    for p in m['primitives']:
        p['attributes'] = {k: acc_map[a] for k, a in p['attributes'].items()}
        if 'indices' in p: p['indices'] = acc_map[p['indices']]
gltf['accessors'] = [accessors[a] for a in used_acc]
for a in gltf['accessors']:
    if 'bufferView' in a: a['bufferView'] = view_map[a['bufferView']]
for im in gltf.get('images', []):
    if 'bufferView' in im: im['bufferView'] = view_map[im['bufferView']]

# Repack, each view 4-byte aligned.
packed = bytearray()
new_views = []
for old in used_views:
    v = dict(views[old])
    packed += b'\0' * (-len(packed) % 4)
    v['byteOffset'] = len(packed)
    v['byteLength'] = len(view_bytes[old])
    packed += view_bytes[old]
    new_views.append(v)
packed += b'\0' * (-len(packed) % 4)
gltf['bufferViews'] = new_views
gltf['buffers'] = [{'byteLength': len(packed)}]

js = json.dumps(gltf, separators=(',', ':')).encode()
js += b' ' * (-len(js) % 4)
total = 12 + 8 + len(js) + 8 + len(packed)
with open(args.dst, 'wb') as f:
    f.write(struct.pack('<4sII', b'glTF', 2, total))
    f.write(struct.pack('<I4s', len(js), b'JSON')); f.write(js)
    f.write(struct.pack('<I4s', len(packed), b'BIN\0')); f.write(packed)
print(f'{len(data)} -> {total} bytes')
