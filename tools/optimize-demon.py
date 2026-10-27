"""Build the game-ready hunter from demon.glb with gltfpack 1.3 and Pillow.

Usage: python tools/optimize-demon.py --gltfpack /path/to/gltfpack
gltfpack source: https://github.com/zeux/meshoptimizer/tree/v1.3 (MIT).
The source GLB is kept intact. No simplification runs on the player's device.
"""
import argparse
import hashlib
import io
import json
import pathlib
import shutil
import struct
import subprocess
import tempfile
from PIL import Image


def document(data):
    size = struct.unpack_from('<I', data, 12)[0]
    return json.loads(data[20:20 + size]), data[28 + size:]


def triangles(doc):
    return sum(doc['accessors'][p['indices']]['count'] // 3
               for m in doc['meshes'] for p in m['primitives'])


def build(source, dest, gltfpack, ratio=0.03, error_limit=0.015, texture_limit=1024, max_triangles=30000):
    version = subprocess.check_output([gltfpack, '-v'], text=True).strip()
    if version != 'gltfpack 1.3':
        raise RuntimeError('Use gltfpack 1.3 for the validated derivative')
    original = source.read_bytes()
    original_doc, _ = document(original)
    with tempfile.TemporaryDirectory(prefix='facility-hunter-') as temporary:
        intermediate = pathlib.Path(temporary) / 'hunter.glb'
        subprocess.run([gltfpack, '-i', str(source), '-o', str(intermediate),
                        '-si', str(ratio), '-se', str(error_limit), '-noq', '-kn', '-km',
                        '-ke', '-af', '0', '-ac'], check=True)
        doc, raw = document(intermediate.read_bytes())
    if triangles(doc) > max_triangles:
        raise RuntimeError(f'Hunter exceeds the {max_triangles:,}-triangle runtime budget')
    if len(doc['skins'][0]['joints']) != len(original_doc['skins'][0]['joints']):
        raise RuntimeError('The native skeleton must survive simplification')
    images = {im['bufferView']: im for im in doc.get('images', [])}
    parts, offset = [], 0
    for i, view in enumerate(doc['bufferViews']):
        start = view.get('byteOffset', 0)
        data = raw[start:start + view['byteLength']]
        if i in images:
            image = Image.open(io.BytesIO(data)).convert('RGB')
            image.thumbnail((texture_limit, texture_limit), Image.Resampling.LANCZOS)
            encoded = io.BytesIO()
            image.save(encoded, format='JPEG', quality=88, optimize=True)
            data = encoded.getvalue()
            images[i]['mimeType'] = 'image/jpeg'
        padding = (-offset) % 4
        parts.append(b'\0' * padding)
        offset += padding
        view.update(buffer=0, byteOffset=offset, byteLength=len(data))
        parts.append(data)
        offset += len(data)
    binary = b''.join(parts)
    binary += b'\0' * ((-len(binary)) % 4)
    doc['buffers'] = [{'byteLength': len(binary)}]
    doc['asset'].setdefault('extras', {})['facility_optimization'] = {
        'tool': version, 'source_sha256': hashlib.sha256(original).hexdigest(),
        'source_triangles': triangles(original_doc), 'runtime_triangles': triangles(doc),
        'ratio': ratio, 'error_limit': error_limit, 'texture_limit': texture_limit,
        'changes': 'Simplified skinned geometry; native joints, named nodes and animation retained. Texture encoded as JPEG.'}
    text = json.dumps(doc, separators=(',', ':')).encode()
    text += b' ' * ((-len(text)) % 4)
    result = (struct.pack('<III', 0x46546c67, 2, 28 + len(text) + len(binary))
              + struct.pack('<II', len(text), 0x4e4f534a) + text
              + struct.pack('<II', len(binary), 0x004e4942) + binary)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(result)
    print(json.dumps({'triangles_before': triangles(original_doc), 'triangles_after': triangles(doc),
                      'bytes_before': len(original), 'bytes_after': len(result)}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gltfpack', default=shutil.which('gltfpack'))
    parser.add_argument('--source', type=pathlib.Path, default=pathlib.Path('assets/horror/demon.glb'))
    parser.add_argument('--dest', type=pathlib.Path, default=pathlib.Path('assets/horror/demon-runtime.glb'))
    parser.add_argument('--ratio', type=float, default=0.03)
    parser.add_argument('--error-limit', type=float, default=0.015)
    parser.add_argument('--texture-limit', type=int, default=1024)
    parser.add_argument('--max-triangles', type=int, default=30000)
    args = parser.parse_args()
    if not args.gltfpack:
        parser.error('Provide --gltfpack pointing to gltfpack 1.3')
    build(args.source, args.dest, args.gltfpack, args.ratio, args.error_limit, args.texture_limit, args.max_triangles)
