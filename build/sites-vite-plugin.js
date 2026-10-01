import { access, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, join, relative, resolve } from 'node:path';

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function walkFiles(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await walkFiles(absolute));
    else results.push(absolute);
  }
  return results;
}

export function sites() {
  let root = process.cwd();
  return {
    name: 'macroflow-sites',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      root = config.root;
    },
    async closeBundle() {
      if (this.environment?.name !== 'client') return;
      const dist = resolve(root, 'dist');
      const openaiOutput = resolve(dist, '.openai');
      const hostingConfig = resolve(root, '.openai', 'hosting.json');
      await rm(openaiOutput, { recursive: true, force: true });
      await mkdir(openaiOutput, { recursive: true });
      if (await exists(hostingConfig)) {
        await cp(hostingConfig, resolve(openaiOutput, 'hosting.json'));
      }

      const clientDirectory = await exists(resolve(dist, 'client'))
        ? resolve(dist, 'client')
        : dist;

      const cacheable = new Set(['.html', '.js', '.css', '.woff2', '.png', '.webp', '.jpg', '.jpeg', '.ico', '.webmanifest']);
      const assets = (await walkFiles(clientDirectory))
        .filter(file => cacheable.has(extname(file).toLowerCase()))
        .map(file => `/${relative(clientDirectory, file).replaceAll('\\', '/')}`)
        .filter(path => path !== '/sw-template.js' && path !== '/sw.js');
      const templatePath = resolve(root, 'public', 'sw-template.js');
      if (await exists(templatePath)) {
        const template = await readFile(templatePath, 'utf8');
        const precacheAssets = [...new Set(['/', '/index.html', ...assets])];
        const hash = createHash('sha256');
        for (const asset of precacheAssets.filter(path => path !== '/')) {
          hash.update(asset);
          hash.update(await readFile(resolve(clientDirectory, `.${asset}`)));
        }
        const rendered = template
          .replace('__BUILD__', hash.digest('hex').slice(0, 16))
          .replace('__PRECACHE_ASSETS__', JSON.stringify(precacheAssets));
        await writeFile(resolve(clientDirectory, 'sw.js'), rendered, 'utf8');
        await rm(resolve(clientDirectory, 'sw-template.js'), { force: true });
      }
    }
  };
}
