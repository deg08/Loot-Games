import { createWriteStream, existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ZipArchive } from 'archiver';

const distDir = resolve('dist');
const artifactsDir = resolve('artifacts');
const archivePath = resolve(artifactsDir,'fruit-10-plus-yandex.zip');

if (!existsSync(resolve(distDir,'index.html'))) {
  throw new Error('Сначала выполните pnpm run build: в dist нет index.html');
}

await mkdir(artifactsDir,{recursive:true});

await new Promise((resolveArchive,rejectArchive) => {
  const output = createWriteStream(archivePath);
  const archive = new ZipArchive({zlib:{level:9}});
  output.on('close',resolveArchive);
  output.on('error',rejectArchive);
  archive.on('warning',error => error.code === 'ENOENT' ? console.warn(error.message) : rejectArchive(error));
  archive.on('error',rejectArchive);
  archive.pipe(output);
  archive.directory(distDir,false);
  archive.finalize();
});

console.log(`Yandex Games archive: ${archivePath}`);
