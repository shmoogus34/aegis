// scripts/downloadCanvasFiles.js
// Downloads all course files from Canvas LMS and saves them directly into the Obsidian Vault
// for AI knowledge grounding and reference.

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
let baseUrl = 'https://longwood.instructure.com';
let token = '';

envContent.split('\n').forEach((line) => {
  if (line.startsWith('CANVAS_BASE_URL=')) baseUrl = line.split('=')[1].trim();
  if (line.startsWith('CANVAS_API_TOKEN=')) token = line.split('=')[1].trim();
});

if (!token) {
  console.error('CANVAS_API_TOKEN is missing');
  process.exit(1);
}

const VAULT_DIR = path.join(__dirname, '..', 'vault');

const COURSES = [
  { id: 1325550, code: 'ANTH-202', dir: 'ANTH-202-Archaeology', name: 'Archaeology' },
  { id: 1326007, code: 'BUSN-110', dir: 'BUSN-110-Business-Bootcamp', name: 'Business Bootcamp' },
  { id: 1325991, code: 'BUSN-296', dir: 'BUSN-296-Legal-Environment', name: 'Legal Environment' },
  { id: 1326605, code: 'CTZN-110', dir: 'CTZN-110-Social-Entrepreneurship', name: 'Social Entrepreneurship' },
  { id: 1325724, code: 'ECON-217', dir: 'ECON-217-Microeconomics', name: 'Principles of Microeconomics' },
  { id: 1325145, code: 'MATH-171', dir: 'MATH-171-Statistical-Decision-Making', name: 'Statistical Decision Making' },
];

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

async function processCourse(course) {
  console.log(`\n========================================`);
  console.log(`Processing ${course.code}: ${course.name} (ID: ${course.id})`);
  console.log(`========================================`);

  const courseVaultDir = path.join(VAULT_DIR, course.dir);
  const filesDir = path.join(courseVaultDir, 'files');
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }

  const filesToDownload = new Map(); // filename -> { url, size, source }

  // 1. Try direct /files endpoint
  try {
    const files = await fetchJson(`${baseUrl}/api/v1/courses/${course.id}/files?per_page=100`);
    if (Array.isArray(files)) {
      for (const f of files) {
        if (f.display_name && f.url) {
          filesToDownload.set(f.display_name, {
            id: f.id,
            name: f.display_name,
            url: f.url,
            size: f.size,
            contentType: f['content-type'],
            source: 'Files Tab',
          });
        }
      }
    }
  } catch (err) {
    console.log(`Direct /files tab restricted for ${course.code} (trying modules & folders)`);
  }

  // 2. Query Modules for attached files
  try {
    const modules = await fetchJson(`${baseUrl}/api/v1/courses/${course.id}/modules?include[]=items`);
    if (Array.isArray(modules)) {
      for (const mod of modules) {
        if (!mod.items) continue;
        for (const item of mod.items) {
          if (item.type === 'File' && item.url) {
            try {
              const fileDetail = await fetchJson(item.url);
              if (fileDetail && fileDetail.url && fileDetail.display_name) {
                if (!filesToDownload.has(fileDetail.display_name)) {
                  filesToDownload.set(fileDetail.display_name, {
                    id: fileDetail.id,
                    name: fileDetail.display_name,
                    url: fileDetail.url,
                    size: fileDetail.size,
                    contentType: fileDetail['content-type'],
                    source: `Module: ${mod.name}`,
                  });
                }
              }
            } catch (e) {
              console.warn(`  Could not resolve module file item ${item.title}:`, e.message);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Module fetch failed for ${course.code}:`, err.message);
  }

  console.log(`Found ${filesToDownload.size} files for ${course.code}. Downloading...`);

  const downloadedList = [];

  for (const [filename, fileInfo] of filesToDownload.entries()) {
    const safeName = filename.replace(/[/\\?%*:|"<>]/g, '_');
    const targetPath = path.join(filesDir, safeName);

    try {
      if (fs.existsSync(targetPath)) {
        const stats = fs.statSync(targetPath);
        if (stats.size > 0) {
          console.log(`  [Cached] ${safeName} (${(stats.size / 1024).toFixed(1)} KB)`);
          downloadedList.push({ name: safeName, size: stats.size, source: fileInfo.source });
          continue;
        }
      }

      console.log(`  [Downloading] ${safeName}...`);
      await downloadFile(fileInfo.url, targetPath);
      const stats = fs.statSync(targetPath);
      downloadedList.push({ name: safeName, size: stats.size, source: fileInfo.source });
      console.log(`  [Done] Saved ${safeName} (${(stats.size / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error(`  [Failed] Could not download ${safeName}:`, e.message);
    }
  }

  // Create or update markdown index of all course files in the vault
  const indexContent = [
    `# ${course.code} — Canvas Course Files & Knowledge Index`,
    `**Course:** ${course.name} | **Enrolled ID:** ${course.id}`,
    `**Last Synced:** ${new Date().toISOString()}`,
    `**Total Files:** ${downloadedList.length}`,
    '',
    'All files below have been downloaded directly from Canvas LMS into `vault/${course.dir}/files/` for AI context, referencing, study guides, and assignment solutions.',
    '',
    '## Downloaded Course Files',
    '| File Name | Size (KB) | Canvas Source | Local Vault Path |',
    '|---|---|---|---|',
    ...downloadedList.map(
      (f) =>
        `| **${f.name}** | ${(f.size / 1024).toFixed(1)} KB | ${f.source} | \`files/${f.name}\` |`
    ),
    '',
    '## Grounding Instructions for AI',
    `- Use the documents and lecture materials in this directory as the ground truth for ${course.code}.`,
    `- When asked about homework, quizzes, exams, or syllabus policies, refer directly to these files.`,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(courseVaultDir, 'canvas-files-index.md'), indexContent, 'utf8');
  console.log(`Created Canvas files index for ${course.code} with ${downloadedList.length} files.`);
}

async function main() {
  console.log('Starting Canvas Course Files Downloader for Obsidian Vault...');
  for (const c of COURSES) {
    await processCourse(c);
  }
  console.log('\nAll course files downloaded and indexed into Obsidian Vault successfully!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
