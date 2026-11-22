/**
 * Android-only, non-destructive staging optimization for My Panaderya.
 * Original assets are never modified. Changed game source uses strictly
 * limited exclusions, with verified boot scripts and reference scanning.
 * No external binaries or libraries are required beyond Node.js 22+.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLAN_FILE = path.join(ROOT, 'tools/android-asset-optimization-plan.json');
const SHA = content => crypto.createHash('sha256').update(content).digest('hex');
function sourcePaths(folder = ROOT) {
  const result = ['index.html'];
  for (const dir of ['src', 'styles', 'worksheet']) {
    const walk = (p, rel) => {
      for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
        const next = path.join(p, entry.name), relative = `${rel}/${entry.name}`;
        if (entry.isDirectory()) walk(next, relative);
        else if (entry.isFile() && /\.(?:js|mjs|css|html)$/i.test(entry.name)) result.push(relative);
      }
    };
    walk(path.join(folder, dir), dir);
  }
  return result.sort();
}
function sourceDigest(folder = ROOT) {
  const h = crypto.createHash('sha256');
  for (const rel of sourcePaths(folder)) {
    h.update(rel + '\0');
    // Git for Windows may check out CRLF; compare source *content*, not line endings.
    h.update(SHA(fs.readFileSync(path.join(folder, rel),'utf8').replace(/\r\n/g,'\n')));
    h.update('\n');
  }
  return h.digest('hex');
}
function isSafeRelative(rel) {
  return typeof rel === 'string' && rel.startsWith('assets/') && !rel.includes('\\') &&
    !rel.includes('\0') && rel.split('/').every(piece => piece && piece !== '.' && piece !== '..');
}
function safeFile(root, rel) {
  if (!isSafeRelative(rel)) throw new Error(`Unsafe asset plan path: ${rel}`);
  const file = path.join(root, ...rel.split('/'));
  if (!path.resolve(file).startsWith(path.resolve(root) + path.sep)) throw new Error(`Escaped stage: ${rel}`);
  if (fs.existsSync(file) && !fs.lstatSync(file).isFile()) throw new Error(`Not a regular file: ${rel}`);
  return file;
}
function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let b = 0; b < 8; b++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (~crc) >>> 0;
}
function makeChunk(type, data) {
  const name = Buffer.from(type, 'ascii'), result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0); name.copy(result, 4); data.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, 8 + data.length)), 8 + data.length);
  return result;
}
/** Same PNG chunks and identical inflated filtered scanlines: same exact RGBA pixels. */
function recompressPng(input) {
  if (input.length < 32 || !input.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a','hex'))) return null;
  const chunks = []; let pos = 8, sawIend = false;
  while (pos + 12 <= input.length) {
    const len = input.readUInt32BE(pos);
    if (len > input.length - pos - 12) return null;
    const type = input.toString('ascii', pos + 4, pos + 8);
    const data = input.subarray(pos + 8, pos + 8 + len);
    if (crc32(input.subarray(pos + 4, pos + 8 + len)) !== input.readUInt32BE(pos + 8 + len)) return null;
    chunks.push({type, data, raw: input.subarray(pos, pos + 12 + len)});
    pos += 12 + len;
    if (type === 'IEND') {sawIend = true; break;}
  }
  if (!sawIend || pos !== input.length || chunks.some(c => c.type === 'CgBI' || c.type === 'acTL')) return null;
  const idats = chunks.filter(c => c.type === 'IDAT');
  if (!idats.length || !chunks.some(c => c.type === 'IHDR')) return null;
  const originals = Buffer.concat(idats.map(c => c.data));
  let inflated, recompressed;
  try {
    inflated = zlib.inflateSync(originals, {maxOutputLength: 512 * 1024 * 1024});
    recompressed = zlib.deflateSync(inflated, {level: 9});
    if (!zlib.inflateSync(recompressed).equals(inflated)) throw new Error('PNG raw pixel data changed');
  } catch {return null;}
  if (recompressed.length >= originals.length - 512) return null;
  const rebuilt = [input.subarray(0, 8)]; let emitted = false;
  for (const chunk of chunks) {
    if (chunk.type === 'IDAT') {
      if (!emitted) {rebuilt.push(makeChunk('IDAT', recompressed)); emitted = true;}
    } else rebuilt.push(chunk.raw);
  }
  const output = Buffer.concat(rebuilt);
  if (output.length >= input.length - 512) return null;
  // A second parse confirms the replacement's exact payload and valid chunk CRCs.
  let offset = 8; const after = [];
  while (offset < output.length) {
    const n = output.readUInt32BE(offset), kind = output.toString('ascii', offset+4, offset+8);
    if (crc32(output.subarray(offset+4, offset+8+n)) !== output.readUInt32BE(offset+8+n)) throw new Error('Optimized PNG checksum mismatch');
    if (kind === 'IDAT') after.push(output.subarray(offset+8, offset+8+n));
    offset += n+12;
  }
  if (!zlib.inflateSync(Buffer.concat(after)).equals(inflated)) throw new Error('Optimized PNG content mismatch');
  return output;
}
/** Remove metadata/embedded cover only; never decode or transcode the MP3 audio. */
function stripMp3Metadata(input) {
  if (input.subarray(0, 3).toString('ascii') !== 'ID3' || input.length < 10) return null;
  const v = input[3], flags = input[5];
  if (v < 2 || v > 4) return null;
  for (let i=6; i<10; i++) if (input[i] & 0x80) return null;
  const size = ((input[6] & 0x7f)<<21) | ((input[7] & 0x7f)<<14) | ((input[8] & 0x7f)<<7) | (input[9] & 0x7f);
  const skip = 10 + size + (v===4 && (flags & 0x10) ? 10 : 0);
  if (skip >= input.length - 10) return null;
  const body = input.subarray(skip);
  // Only strip if frames begin with a valid MP3 sync word; keep audio frames byte-for-byte.
  if (body[0] !== 0xff || (body[1] & 0xe0) !== 0xe0) return null;
  return {output:body, bytesRemoved:skip, frameHash:SHA(body)};
}
const NORMALIZE_SOURCE = text => text.replace(/\r\n/g,'\n');
/**
 * Partial optimization when other source files have changed. Only two isolated
 * historical art directories are eligible, and only if their known runtime
 * fallback, asset manifest and startup chain still match the audited release.
 * Any new reference to either directory blocks pruning that directory.
 * Ambiguous modifications fall back to packaging original files.
 */
function conservativeRoots(plan, auditRoot = ROOT, stage = auditRoot) {
  const guard = plan.fallbackGuard;
  const verdict = {roots:[], blocked:[], guardsMatch:false};
  if (!guard || !guard.sourceFiles || !Array.isArray(guard.legacyRoots)) {
    verdict.blocked.push('No audited fallback guard in manifest');
    return verdict;
  }
  for (const [rel, expected] of Object.entries(guard.sourceFiles)) {
    const file=path.join(auditRoot, ...rel.split('/'));
    if (!fs.existsSync(file) || SHA(NORMALIZE_SOURCE(fs.readFileSync(file,'utf8'))) !== expected) {
      verdict.blocked.push(`Audited loader changed: ${rel}`);
    }
  }
  if (verdict.blocked.length) return verdict;
  verdict.guardsMatch = true;
  // Inspect all staged source and embedded text content as well as new files
  // under the source roots, not just the earlier manifest's filenames.
  const files = sourcePaths(auditRoot).filter(rel =>
    !(guard.allowedFallbackReferences || []).includes(rel));
  const stagedAssets=path.join(stage,'assets');
  const walkText = (folder, prefix = 'assets') => {
    if (!fs.existsSync(folder)) return;
    for (const d of fs.readdirSync(folder,{withFileTypes:true})) {
      const rel = `${prefix}/${d.name}`, next = path.join(folder,d.name);
      if (d.isDirectory()) walkText(next,rel);
      else if (d.isFile() && /\.(?:svg|css|js|mjs|html|txt|xml)$/i.test(d.name) &&
          !(guard.legacyRoots || []).some(root=>rel.startsWith(root))) files.push(rel);
    }
  };
  walkText(stagedAssets);
  for (const prefix of guard.legacyRoots) {
    const dirname = prefix.split('/')[1];
    let reason = null;
    for (const rel of files) {
      const file = rel.startsWith('assets/') ? path.join(stage,...rel.split('/')) : path.join(auditRoot,...rel.split('/'));
      let txt;
      try {txt = NORMALIZE_SOURCE(fs.readFileSync(file,'utf8'));} catch {reason = `Unreadable source: ${rel}`; break;}
      // Catch direct and concatenated string references. False positives merely
      // retain extra artwork; they never remove it.
      const joined = txt.replace(/[\s+`'"]/g,'');
      if (txt.includes(dirname) || joined.includes(dirname)) {reason = `Reference to ${dirname} in ${rel}`; break;}
    }
    if (reason) verdict.blocked.push(reason);
    else verdict.roots.push(prefix);
  }
  return verdict;
}
function optimizeStage(stage, {planFile=PLAN_FILE, verifyOnly=false, auditRoot=ROOT}={}) {
  const plan = JSON.parse(fs.readFileSync(planFile,'utf8'));
  if (plan.version !== 1 || !Array.isArray(plan.exclude) || typeof plan.sourceDigest !== 'string') throw new Error('Invalid optimization plan');
  const sourceMatches = sourceDigest(auditRoot) === plan.sourceDigest;
  const guard = sourceMatches ? null : conservativeRoots(plan,auditRoot,stage);
  const allowedRoots=sourceMatches?null:guard.roots;
  const report = {sourceMatches, mode:sourceMatches?'full-audit':allowedRoots.length?'conservative-legacy':'metadata-only',
    safeFallback:!sourceMatches, protectedRoots:guard?.blocked||[],
    excluded:[], changedAssetsKept:[], missing:[], pngOptimized:[], music:null, beforeBytes:0, afterBytes:0};
  function totalSize(root) {
    let sum=0;
    const walk=p=>{for(const d of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,d.name);if(d.isDirectory())walk(f);else if(d.isFile())sum+=fs.statSync(f).size;}};
    walk(path.join(root,'assets')); return sum;
  }
  report.beforeBytes = totalSize(stage);
  const seen = new Set();
  for (const item of plan.exclude) {
    const rel = item.path;
    if (seen.has(rel)) throw new Error(`Duplicate asset in optimization plan: ${rel}`);
    seen.add(rel);
    if (!sourceMatches && !allowedRoots.some(root=>rel.startsWith(root))) continue;
    const file = safeFile(stage, rel);
    if (!fs.existsSync(file)) {report.missing.push(rel);continue;}
    if (SHA(fs.readFileSync(file)) !== item.sha256) {report.changedAssetsKept.push(rel);continue;}
    report.excluded.push({path:rel, bytes:fs.statSync(file).size});
    if (!verifyOnly) fs.unlinkSync(file);
  }
  const musicRel = 'assets/music/My Panaderya - Background Music.mp3';
  const mp3 = safeFile(stage, musicRel);
  if (fs.existsSync(mp3)) {
    const input = fs.readFileSync(mp3);
    if (SHA(input) === plan.musicSha256) {
      const stripped = stripMp3Metadata(input);
      if (stripped) {
        if (!stripped.output.equals(input.subarray(stripped.bytesRemoved))) throw new Error('Audio frames changed');
        report.music = {bytesSaved:stripped.bytesRemoved, unchangedAudioSha256:stripped.frameHash};
        if (!verifyOnly) fs.writeFileSync(mp3, stripped.output);
      }
    }
  }
  // Re-encode PNGs only after a complete source audit and only for explicitly
  // allowlisted images. In this release the allowlist is empty.
  if (sourceMatches) for (const rel of plan.pngCandidates || []) {
    const file = safeFile(stage, rel);
    if (!fs.existsSync(file)) continue;
    const input = fs.readFileSync(file);
    const smaller = recompressPng(input);
    if (!smaller) continue;
    report.pngOptimized.push({path:rel,before:input.length,after:smaller.length});
    if (!verifyOnly) fs.writeFileSync(file, smaller);
  }
  report.afterBytes = verifyOnly ? report.beforeBytes-report.excluded.reduce((s,f)=>s+f.bytes,0)-(report.music?.bytesSaved||0)-report.pngOptimized.reduce((s,f)=>s+f.before-f.after,0) : totalSize(stage);
  return report;
}
export {sourceDigest,sourcePaths,recompressPng,stripMp3Metadata,optimizeStage,conservativeRoots};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const stage = path.resolve(process.argv[2] || '');
  if (!process.argv[2] || !fs.existsSync(path.join(stage,'assets'))) throw new Error('Usage: node tools/android-optimize-stage.mjs <staged game root>');
  const report=optimizeStage(stage);
  const reportFile=path.join(ROOT,'android/app/build/asset-optimization-report.json');
  fs.mkdirSync(path.dirname(reportFile),{recursive:true});
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
  const mib=n=>(n/2**20).toFixed(2);
  console.log(`Android staged assets (${report.mode}): ${mib(report.beforeBytes)} MiB -> ${mib(report.afterBytes)} MiB; ${report.excluded.length} files omitted, ${report.pngOptimized.length} PNGs recompressed, ${report.music?.bytesSaved||0} cover-art bytes removed.`);
  if(report.protectedRoots.length)console.warn(`Conservative asset guards: ${report.protectedRoots.join("; ")}`);
  console.log(`Full report: ${reportFile}`);
}
