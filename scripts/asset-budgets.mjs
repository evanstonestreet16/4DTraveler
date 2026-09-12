import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import process from 'node:process';
import console from 'node:console';
import { pathToFileURL } from 'node:url';

export function assetKind(path) {
  if (path.split('?')[0].toLowerCase().endsWith('.glb.gz')) return 'models';
  const extension = extname(path).toLowerCase();
  if (extension === '.js') return 'javascript';
  if (extension === '.css') return 'styles';
  if (extension === '.glb') return 'models';
  if (['.png', '.jpg', '.jpeg', '.webp', '.avif', '.ktx2'].includes(extension))
    return 'texturesAndImages';
  if (['.wav', '.mp3', '.ogg', '.m4a'].includes(extension)) return 'audio';
  if (extension === '.html') return 'html';
  return 'other';
}

/** On-disk production payloads, never confused with measured HTTP transfer size. */
export async function measureBuild(directory) {
  const root = resolve(directory);
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const fullPath = resolve(path, entry.name);
      if (entry.isDirectory()) await walk(fullPath);
      else if (entry.isFile()) {
        const bytes = await readFile(fullPath);
        files.push({
          path: `/${relative(root, fullPath).split('\\').join('/')}`,
          kind: assetKind(fullPath),
          rawBytes: bytes.byteLength,
          gzipBytes: gzipSync(bytes, { level: 9 }).byteLength,
          brotliBytes: brotliCompressSync(bytes, {
            params: { [constants.BROTLI_PARAM_QUALITY]: 9 },
          }).byteLength,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        });
      }
    }
  }
  await walk(root);
  files.sort((a, b) => a.path.localeCompare(b.path));
  const totals = {};
  for (const file of files) {
    const bucket = (totals[file.kind] ??= {
      files: 0,
      rawBytes: 0,
      gzipBytes: 0,
      brotliBytes: 0,
    });
    bucket.files++;
    bucket.rawBytes += file.rawBytes;
    bucket.gzipBytes += file.gzipBytes;
    bucket.brotliBytes += file.brotliBytes;
  }
  return {
    directory: root,
    compressionNote:
      'gzip level 9 and Brotli quality 9 compressed production-file sizes; actual server encoding/network transfer is measured separately',
    files,
    totals,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const build = await measureBuild(
    process.env.PROFILE_DIST || process.argv[2] || 'dist',
  );
  console.log(JSON.stringify(build, null, 2));
}
