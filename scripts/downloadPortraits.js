const fs = require('fs');
const path = require('path');
const https = require('https');

const portraitsFile = path.join(__dirname, '..', 'src', 'data', 'portraits.ts');
const content = fs.readFileSync(portraitsFile, 'utf8');

const outputDir = path.join(__dirname, '..', 'public', 'portraits');
fs.mkdirSync(outputDir, { recursive: true });

// Extract ID and URL
const regex = /(\d+):\s*["'](https:[^"']+)["']/g;
const items = [];
let match;
while ((match = regex.exec(content)) !== null) {
  items.push({ id: parseInt(match[1], 10), url: match[2] });
}

console.log(`Starting download for ${items.length} portraits into ${outputDir}...`);

function downloadFile(item) {
  return new Promise((resolve) => {
    const dest = path.join(outputDir, `${item.id}.webp`);
    
    // Check if already downloaded and has content (> 1KB)
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
      resolve({ id: item.id, success: true, cached: true });
      return;
    }

    const req = https.get(
      item.url,
      {
        headers: {
          'Referer': 'https://totalwarwarhammer.fandom.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow redirect
          https.get(
            res.headers.location,
            {
              headers: {
                'Referer': 'https://totalwarwarhammer.fandom.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              },
              timeout: 10000,
            },
            (redirectRes) => {
              if (redirectRes.statusCode !== 200) {
                console.warn(`[WARN] Lord #${item.id} redirect HTTP ${redirectRes.statusCode}`);
                resolve({ id: item.id, success: false });
                return;
              }
              const fileStream = fs.createWriteStream(dest);
              redirectRes.pipe(fileStream);
              fileStream.on('finish', () => {
                fileStream.close();
                resolve({ id: item.id, success: true });
              });
            }
          ).on('error', (err) => {
            console.error(`[ERR] Lord #${item.id} redirect error:`, err.message);
            resolve({ id: item.id, success: false });
          });
          return;
        }

        if (res.statusCode !== 200) {
          console.warn(`[WARN] Lord #${item.id} HTTP ${res.statusCode} from ${item.url}`);
          resolve({ id: item.id, success: false });
          return;
        }

        const fileStream = fs.createWriteStream(dest);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve({ id: item.id, success: true });
        });
      }
    );

    req.on('error', (err) => {
      console.error(`[ERR] Lord #${item.id} download error:`, err.message);
      resolve({ id: item.id, success: false });
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn(`[TIMEOUT] Lord #${item.id}`);
      resolve({ id: item.id, success: false });
    });
  });
}

async function run() {
  // Run with concurrency limit of 10
  const concurrency = 10;
  let index = 0;
  let successCount = 0;
  let failCount = 0;

  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      const result = await downloadFile(item);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  console.log(`\nDownload completed: ${successCount} succeeded, ${failCount} failed.`);
}

run();
