import { access, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
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
    configResolved(config) {
      root = config.root;
    },
    async closeBundle() {
      const dist = resolve(root, 'dist');
      const openaiOutput = resolve(dist, '.openai');
      const hostingConfig = resolve(root, '.openai', 'hosting.json');
      await rm(openaiOutput, { recursive: true, force: true });
      await mkdir(openaiOutput, { recursive: true });
      if (await exists(hostingConfig)) {
        await cp(hostingConfig, resolve(openaiOutput, 'hosting.json'));
      }

      const serverDirectory = resolve(dist, 'server');
      await mkdir(serverDirectory, { recursive: true });
      await writeFile(resolve(serverDirectory, 'index.js'),
        "export default { async fetch(request, env) { return env.ASSETS.fetch(request); } };\n",
        'utf8');

      const cacheable = new Set(['.html', '.js', '.css', '.woff2', '.png', '.webp', '.jpg', '.jpeg', '.ico', '.webmanifest']);
      const assets = (await walkFiles(dist))
        .filter(file => cacheable.has(extname(file).toLowerCase()))
        .map(file => `/${relative(dist, file).replaceAll('\\', '/')}`)
        .filter(path => !path.startsWith('/server/') && !path.startsWith('/.openai/') && path !== '/sw-template.js' && path !== '/sw.js');
      const templatePath = resolve(root, 'public', 'sw-template.js');
      if (await exists(templatePath)) {
        const template = await readFile(templatePath, 'utf8');
        const rendered = template
          .replace('__BUILD__', '3.0.0')
          .replace('__PRECACHE_ASSETS__', JSON.stringify([...new Set(['/', '/index.html', ...assets])]));
        await writeFile(resolve(dist, 'sw.js'), rendered, 'utf8');
        await rm(resolve(dist, 'sw-template.js'), { force: true });
      }
    }
  };
}
