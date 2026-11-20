/**
 * AXIOM INVENTORY INTELLIGENCE - ROBUST STORAGE SERVICE
 * Provides thread-safe, atomic, asynchronous JSON persistence with per-file write queues
 * and automatic corruption recovery.
 */

const fs = require('fs');
const path = require('path');

// Per-file serialization queues
const writeQueues = new Map();

const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

function resolvePath(filePath) {
  if (isServerless && filePath && typeof filePath === 'string' && !filePath.startsWith('/tmp')) {
    const filename = path.basename(filePath);
    if (filePath.includes('documents')) {
      return path.join('/tmp', 'storage', 'documents', filename);
    }
    return path.join('/tmp', 'storage', filename);
  }
  return filePath;
}

/**
 * Ensures a directory exists
 */
function ensureDir(dirPath) {
  const targetDir = isServerless && dirPath && !dirPath.startsWith('/tmp')
    ? (dirPath.includes('documents') ? path.join('/tmp', 'storage', 'documents') : path.join('/tmp', 'storage'))
    : dirPath;
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {
      console.warn('[StorageService] ensureDir warning:', e.message);
    }
  }
}

/**
 * Asynchronously read and parse JSON file safely
 */
async function readJSON(filePath, defaultVal = null) {
  const target = resolvePath(filePath);
  try {
    if (!fs.existsSync(target)) {
      return defaultVal;
    }
    const raw = await fs.promises.readFile(target, 'utf8');
    if (!raw || raw.trim() === '') return defaultVal;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[StorageService] Warning reading ${path.basename(target)}:`, err.message);
    // Check if a backup exists
    const bakFile = `${target}.bak`;
    if (fs.existsSync(bakFile)) {
      try {
        const bakRaw = await fs.promises.readFile(bakFile, 'utf8');
        return JSON.parse(bakRaw);
      } catch (bakErr) {
        // ignore
      }
    }
    return defaultVal;
  }
}

/**
 * Synchronously read and parse JSON file safely
 */
function readJSONSync(filePath, defaultVal = null) {
  const target = resolvePath(filePath);
  try {
    if (!fs.existsSync(target)) return defaultVal;
    const raw = fs.readFileSync(target, 'utf8');
    if (!raw || raw.trim() === '') return defaultVal;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[StorageService] Warning reading sync ${path.basename(target)}:`, err.message);
    return defaultVal;
  }
}

/**
 * Atomically write JSON data to file with serialized queue and retries
 */
async function writeJSON(filePath, data) {
  const target = resolvePath(filePath);
  ensureDir(path.dirname(target));

  // Enqueue write operation to prevent race conditions
  let queue = writeQueues.get(target);
  if (!queue) {
    queue = Promise.resolve();
    writeQueues.set(target, queue);
  }

  const writeOperation = queue.then(async () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const tempFile = `${target}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`;

    // 1. Write to temp file
    await fs.promises.writeFile(tempFile, jsonStr, 'utf8');

    // 2. Atomically rename temp file to target file with retries (Windows safety)
    let retries = 5;
    let delayMs = 25;
    while (retries > 0) {
      try {
        // Keep a backup of existing file if it exists
        if (fs.existsSync(target)) {
          try {
            await fs.promises.copyFile(target, `${target}.bak`);
          } catch (e) {
            // non-fatal backup error
          }
        }
        await fs.promises.rename(tempFile, target);
        break;
      } catch (err) {
        retries--;
        if (retries === 0) {
          // If rename still failed, try direct write as fallback
          try {
            await fs.promises.writeFile(target, jsonStr, 'utf8');
            if (fs.existsSync(tempFile)) await fs.promises.unlink(tempFile);
          } catch (directErr) {
            throw new Error(`Failed to atomically save ${target}: ${err.message}`);
          }
        } else {
          await new Promise(r => setTimeout(r, delayMs));
          delayMs *= 2;
        }
      }
    }
  });

  writeQueues.set(target, writeOperation.catch(() => {}));
  return writeOperation;
}

/**
 * Synchronously write JSON data atomically
 */
function writeJSONSync(filePath, data) {
  const target = resolvePath(filePath);
  ensureDir(path.dirname(target));
  const jsonStr = JSON.stringify(data, null, 2);
  const tempFile = `${target}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempFile, jsonStr, 'utf8');
    if (fs.existsSync(target)) {
      try { fs.copyFileSync(target, `${target}.bak`); } catch (e) {}
    }
    fs.renameSync(tempFile, target);
  } catch (err) {
    // Fallback direct write
    fs.writeFileSync(target, jsonStr, 'utf8');
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
  }
}

module.exports = {
  readJSON,
  readJSONSync,
  writeJSON,
  writeJSONSync,
  ensureDir
};
