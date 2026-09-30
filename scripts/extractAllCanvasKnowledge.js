// scripts/extractAllCanvasKnowledge.js
// Extracts text from all downloaded Canvas files (.pdf, .docx, .pptx) into markdown knowledge notes

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PDFParse } = require('pdf-parse');

const VAULT_DIR = path.join(__dirname, '..', 'vault');

const COURSES = [
  { dir: 'ANTH-202-Archaeology', code: 'ANTH-202' },
  { dir: 'BUSN-110-Business-Bootcamp', code: 'BUSN-110' },
  { dir: 'BUSN-296-Legal-Environment', code: 'BUSN-296' },
  { dir: 'CTZN-110-Social-Entrepreneurship', code: 'CTZN-110' },
  { dir: 'ECON-217-Microeconomics', code: 'ECON-217' },
  { dir: 'MATH-171-Statistical-Decision-Making', code: 'MATH-171' },
];

function extractDocx(filePath) {
  try {
    const xml = execSync(`unzip -p "${filePath}" word/document.xml 2>/dev/null`, {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
    return xml
      .replace(/<w:p[^>]*>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  } catch (e) {
    return null;
  }
}

function extractPptx(filePath) {
  try {
    const xml = execSync(`unzip -p "${filePath}" "ppt/slides/slide*.xml" 2>/dev/null`, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
    return xml
      .replace(/<a:p[^>]*>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  } catch (e) {
    return null;
  }
}

async function extractPdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse(new Uint8Array(dataBuffer));
    await parser.load();
    const res = await parser.getText();
    const text = typeof res === 'string' ? res : (res?.text || '');
    return text.trim() || null;
  } catch (e) {
    return null;
  }
}

async function processCourse(course) {
  const coursePath = path.join(VAULT_DIR, course.dir);
  const filesPath = path.join(coursePath, 'files');
  const extractedPath = path.join(coursePath, 'canvas-extracted');

  if (!fs.existsSync(filesPath)) return;
  if (!fs.existsSync(extractedPath)) {
    fs.mkdirSync(extractedPath, { recursive: true });
  }

  const files = fs.readdirSync(filesPath);
  console.log(`Processing ${course.code}: ${files.length} files...`);

  let count = 0;
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const fullPath = path.join(filesPath, file);
    const baseName = path.basename(file, ext);
    const targetMd = path.join(extractedPath, `${baseName}.md`);

    if (fs.existsSync(targetMd)) {
      continue;
    }

    let extractedText = null;

    if (ext === '.docx') {
      extractedText = extractDocx(fullPath);
    } else if (ext === '.pptx' || ext === '.ppt') {
      extractedText = extractPptx(fullPath);
    } else if (ext === '.pdf') {
      extractedText = await extractPdf(fullPath);
    }

    if (extractedText && extractedText.length > 50) {
      const mdContent = [
        `# ${baseName}`,
        `**Course:** ${course.code}`,
        `**Source File:** \`${file}\``,
        `**Extracted on:** ${new Date().toISOString()}`,
        '',
        '---',
        '',
        extractedText,
      ].join('\n');

      fs.writeFileSync(targetMd, mdContent, 'utf8');
      count++;
    }
  }

  console.log(`Extracted knowledge from ${count} files for ${course.code}.`);
}

async function main() {
  console.log('Extracting Canvas course materials into searchable Obsidian Vault notes...');
  for (const c of COURSES) {
    await processCourse(c);
  }
  console.log('Knowledge extraction complete!');
}

main().catch(console.error);
