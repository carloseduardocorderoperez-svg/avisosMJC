const fs = require('fs').promises;
const path = require('path');

async function copyRecursive(src, dest) {
  const stats = await fs.stat(src);
  if (stats.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const items = await fs.readdir(src);
    for (const item of items) {
      await copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    // ensure dest dir
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }
}

async function main() {
  const clientDist = path.join(__dirname, '../client/dist');
  const target = path.join(__dirname, '../dist-public');

  try {
    await copyRecursive(clientDist, target);
    console.log('Client build copied to dist-public');
  } catch (err) {
    console.error('Error copying client build to dist-public:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

if (require.main === module) main();
