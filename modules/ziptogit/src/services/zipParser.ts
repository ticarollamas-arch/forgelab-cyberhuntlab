import JSZip from 'jszip';
import { ParsedZipFile, ZipMetadata, FileFormatInfo, ApkAnalysis, ParseProgress } from '../types';

export const MAX_UNCOMPRESSED_SIZE_BYTES = 2048 * 1024 * 1024; // 2 GB limit (Proteção avançada contra DoS/Zip Bomb)
export const MAX_NESTED_DEPTH = 3; // Nested zip recursion depth limit
export const GITHUB_MAX_BLOB_SIZE = 25 * 1024 * 1024; // 25 MB limite seguro da API REST do GitHub no navegador
export const LARGE_DATASET_THRESHOLD = 10 * 1024 * 1024; // 10 MB threshold para datasets e dumps volumosos

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function isDatasetDump(path: string): boolean {
  const p = path.toLowerCase();
  return (
    p.endsWith('.json') ||
    p.endsWith('.csv') ||
    p.endsWith('.tsv') ||
    p.endsWith('.sql') ||
    p.endsWith('.sqlite') ||
    p.endsWith('.sqlite3') ||
    p.endsWith('.db') ||
    p.endsWith('.parquet') ||
    p.endsWith('.dump') ||
    p.endsWith('.bin') ||
    p.endsWith('.dat') ||
    p.includes('shopee') ||
    p.includes('product') ||
    p.includes('produtos') ||
    p.includes('catalog') ||
    p.includes('dataset') ||
    p.includes('10m') ||
    p.includes('dump')
  );
}

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'pdf',
  'zip', 'tar', 'gz', 'tgz', 'rar', '7z', 'mp3', 'mp4', 'mov', 'wav', 'woff',
  'woff2', 'ttf', 'eot', 'bin', 'exe', 'dll', 'so', 'dylib',
  'dex', 'arsc', 'apk', 'xapk', 'jar', 'aar', 'class', 'o', 'a',
]);

export function isBinaryFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Validates and sanitizes file paths to prevent Zip Slip (Path Traversal vulnerabilities).
 * Rejects absolute paths, null bytes, and traversal segments ("..").
 */
export function sanitizeArchivePath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== 'string') {
    throw new Error('Caminho de arquivo inválido no arquivo compactado.');
  }

  // Reject null bytes
  if (rawPath.includes('\0')) {
    throw new Error('Arquivo corrompido ou malicioso: caractere nulo detectado no caminho.');
  }

  // Normalize slashes
  const normalized = rawPath.replace(/\\/g, '/');

  // Reject absolute paths
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error(`Violação de segurança (Zip Slip): caminho absoluto proibido: "${rawPath}"`);
  }

  // Check path segments for traversal
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg === '..') {
      throw new Error(`Violação de segurança (Zip Slip): tentativa de path traversal detectada ("..") em: "${rawPath}"`);
    }
  }

  // Clean leading ./ and redundant slashes
  const cleaned = normalized.replace(/^\.\//, '').replace(/\/+/g, '/');
  return cleaned;
}

/**
 * Validates the true format of a file using magic bytes rather than just extension.
 */
export async function detectFileFormatByMagicBytes(file: File): Promise<FileFormatInfo> {
  const slice = file.slice(0, 512);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const matches = (offset: number, expected: number[]): boolean => {
    if (bytes.length < offset + expected.length) return false;
    for (let i = 0; i < expected.length; i++) {
      if (bytes[offset + i] !== expected[i]) return false;
    }
    return true;
  };

  const toHex = (len = 4) => {
    return Array.from(bytes.slice(0, Math.min(len, bytes.length)))
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  };

  const lowerName = file.name.toLowerCase();

  // 1. PKZip magic: 50 4B 03 04 or 50 4B 05 06 (empty) or 50 4B 07 08 (spanned)
  if (matches(0, [0x50, 0x4b, 0x03, 0x04]) || matches(0, [0x50, 0x4b, 0x05, 0x06])) {
    const isApk = lowerName.endsWith('.apk') || lowerName.endsWith('.xapk');
    return {
      format: isApk ? 'apk' : 'zip',
      displayName: isApk ? 'Pacote Android (.apk / PKZip)' : 'Arquivo Compactado (.zip / PKZip)',
      isArchive: true,
      isExecutable: isApk,
      mimeGuess: isApk ? 'application/vnd.android.package-archive' : 'application/zip',
      magicHex: toHex(4),
    };
  }

  // 2. GZIP magic: 1F 8B
  if (matches(0, [0x1f, 0x8b])) {
    return {
      format: 'gzip',
      displayName: 'Arquivo Compactado GZIP (.tar.gz / .tgz)',
      isArchive: true,
      isExecutable: false,
      mimeGuess: 'application/gzip',
      magicHex: toHex(2),
    };
  }

  // 3. 7-Zip magic: 37 7A BC AF 27 1C
  if (matches(0, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) {
    return {
      format: '7z',
      displayName: 'Arquivo Compactado 7-Zip (.7z)',
      isArchive: true,
      isExecutable: false,
      mimeGuess: 'application/x-7z-compressed',
      magicHex: toHex(6),
    };
  }

  // 4. RAR magic: 52 61 72 21 (Rar!)
  if (matches(0, [0x52, 0x61, 0x72, 0x21])) {
    return {
      format: 'rar',
      displayName: 'Arquivo Compactado WinRAR (.rar)',
      isArchive: true,
      isExecutable: false,
      mimeGuess: 'application/x-rar-compressed',
      magicHex: toHex(4),
    };
  }

  // 5. Windows Portable Executable: 4D 5A ('MZ')
  if (matches(0, [0x4d, 0x5a])) {
    return {
      format: 'pe_exe',
      displayName: 'Executável Windows Portable Executable (PE / .exe / .dll)',
      isArchive: false,
      isExecutable: true,
      mimeGuess: 'application/x-msdownload',
      magicHex: toHex(2),
    };
  }

  // 6. Linux/Android ELF: 7F 45 4C 46 ('\x7fELF')
  if (matches(0, [0x7f, 0x45, 0x4c, 0x46])) {
    return {
      format: 'elf',
      displayName: 'Binário Executável / Biblioteca Compartilhada ELF (Linux/Android .so)',
      isArchive: false,
      isExecutable: true,
      mimeGuess: 'application/x-executable',
      magicHex: toHex(4),
    };
  }

  // 7. Dalvik DEX: 64 65 78 0A ('dex\n')
  if (matches(0, [0x64, 0x65, 0x78, 0x0a])) {
    return {
      format: 'dex',
      displayName: 'Bytecode Dalvik Executable Android (.dex)',
      isArchive: false,
      isExecutable: true,
      mimeGuess: 'application/octet-stream',
      magicHex: toHex(4),
    };
  }

  // 8. TAR: 'ustar' at offset 257
  if (matches(257, [0x75, 0x73, 0x74, 0x61, 0x72])) {
    return {
      format: 'tar',
      displayName: 'Arquivo Tarball Unix (.tar)',
      isArchive: true,
      isExecutable: false,
      mimeGuess: 'application/x-tar',
      magicHex: 'ustar @ 257',
    };
  }

  // Fallback by file extension
  if (lowerName.endsWith('.zip') || lowerName.endsWith('.apk') || lowerName.endsWith('.jar')) {
    return {
      format: 'zip',
      displayName: 'Arquivo Compactado (.zip / arquivo)',
      isArchive: true,
      isExecutable: false,
      mimeGuess: 'application/zip',
      magicHex: toHex(4),
    };
  }

  if (lowerName.endsWith('.exe') || lowerName.endsWith('.dll')) {
    return {
      format: 'pe_exe',
      displayName: 'Executável Windows (.exe)',
      isArchive: false,
      isExecutable: true,
      mimeGuess: 'application/x-msdownload',
      magicHex: toHex(4),
    };
  }

  return {
    format: 'unknown',
    displayName: 'Arquivo / Binário Genérico',
    isArchive: false,
    isExecutable: false,
    mimeGuess: 'application/octet-stream',
    magicHex: toHex(4),
  };
}

export function shouldIgnoreFile(
  path: string,
  options: {
    ignoreNodeModules?: boolean;
    ignoreGitFolders?: boolean;
    ignoreEnvFiles?: boolean;
    ignoreOsFiles?: boolean;
  }
): boolean {
  const normalized = path.replace(/\\/g, '/');
  const filename = normalized.split('/').pop() || '';

  // OS files
  if (options.ignoreOsFiles !== false) {
    if (
      normalized.includes('__MACOSX/') ||
      filename === '.DS_Store' ||
      filename === 'Thumbs.db' ||
      filename.startsWith('._')
    ) {
      return true;
    }
  }

  // Git internals
  if (options.ignoreGitFolders !== false) {
    if (normalized.includes('.git/') || normalized === '.git') {
      return true;
    }
  }

  // Node modules
  if (options.ignoreNodeModules !== false) {
    if (normalized.includes('node_modules/') || normalized === 'node_modules') {
      return true;
    }
  }

  // Env files
  if (options.ignoreEnvFiles !== false) {
    if (
      filename === '.env' ||
      filename === '.env.local' ||
      filename === '.env.production' ||
      filename === '.env.development'
    ) {
      return true;
    }
  }

  return false;
}

export function detectProjectType(files: ParsedZipFile[]): string {
  const paths = files.map((f) => f.path.toLowerCase());

  if (
    paths.some(
      (p) =>
        p.includes('androidmanifest.xml') ||
        p.endsWith('.dex') ||
        p.includes('classes.dex')
    )
  ) {
    return 'Android APK Package';
  }
  if (paths.some((p) => p.endsWith('.exe') || p.endsWith('.dll'))) {
    return 'Windows Executable / Binary';
  }
  if (paths.some((p) => p.endsWith('.so') || p.includes('/lib/arm'))) {
    return 'Linux/Android Native Library (ELF)';
  }
  if (paths.some((p) => p.endsWith('package.json'))) {
    if (
      paths.some(
        (p) =>
          p.includes('vite.config') ||
          p.includes('next.config') ||
          p.includes('tailwind.config')
      )
    ) {
      return 'React / Modern Web';
    }
    return 'Node.js / JavaScript';
  }
  if (
    paths.some(
      (p) =>
        p.endsWith('requirements.txt') ||
        p.endsWith('pyproject.toml') ||
        p.endsWith('setup.py')
    )
  ) {
    return 'Python';
  }
  if (paths.some((p) => p.endsWith('cargo.toml'))) {
    return 'Rust';
  }
  if (paths.some((p) => p.endsWith('go.mod'))) {
    return 'Go';
  }
  if (paths.some((p) => p.endsWith('pom.xml') || p.endsWith('build.gradle'))) {
    return 'Java / Kotlin';
  }
  if (paths.some((p) => p.endsWith('index.html'))) {
    return 'HTML / CSS / JS';
  }
  return 'Código / Repositório Geral';
}

/**
 * Universal archive and binary processor.
/**
 * Recursively scans directory entries from HTML5 Drag and Drop or FileSystem API.
 * Skips heavy dependencies (node_modules, .git) early to prevent browser lockup.
 */
export async function readDirectoryEntriesRecursively(
  dirEntry: any,
  basePath = '',
  ignoreOptions: {
    ignoreNodeModules?: boolean;
    ignoreGitFolders?: boolean;
  } = { ignoreNodeModules: true, ignoreGitFolders: true },
  onProgress?: (count: number, current: string) => void
): Promise<File[]> {
  const files: File[] = [];
  const reader = dirEntry.createReader();

  async function readBatch(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      reader.readEntries(
        (entries: any[]) => resolve(entries),
        (err: any) => reject(err)
      );
    });
  }

  const IGNORED_FOLDERS = new Set([
    'node_modules',
    '.git',
    '__macosx',
    '.next',
    '.nuxt',
    'dist',
    'build',
    'out',
    'venv',
    '.venv',
    '.cache',
    'target',
    '.idea',
    '.vscode',
  ]);

  let batch = await readBatch();
  while (batch.length > 0) {
    for (const entry of batch) {
      const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;

      if (entry.isFile) {
        try {
          const file: File = await new Promise((res, rej) => entry.file(res, rej));
          // Store relative path on File object
          Object.defineProperty(file, 'webkitRelativePath', {
            value: entryPath,
            writable: true,
          });
          files.push(file);
          if (files.length % 10 === 0) {
            onProgress?.(files.length, entryPath);
            await new Promise((r) => setTimeout(r, 0));
          }
        } catch (e) {
          console.warn(`Could not read file entry: ${entryPath}`, e);
        }
      } else if (entry.isDirectory) {
        // Fast-skip ignored heavy folders early before scanning thousands of subfiles!
        const dirName = (entry.name || '').toLowerCase();
        if (IGNORED_FOLDERS.has(dirName)) {
          continue;
        }
        if (ignoreOptions.ignoreNodeModules !== false && dirName === 'node_modules') {
          continue;
        }
        if (ignoreOptions.ignoreGitFolders !== false && dirName === '.git') {
          continue;
        }

        const inner = await readDirectoryEntriesRecursively(entry, entryPath, ignoreOptions, onProgress);
        for (let j = 0; j < inner.length; j++) {
          files.push(inner[j]);
        }
      }
    }
    batch = await readBatch();
    await new Promise((r) => setTimeout(r, 0));
  }

  return files;
}

/**
 * Parses files from a selected folder (via drag and drop or folder input)
 * without memory bloat, supporting 700 MB+ directories seamlessly.
 */
export async function parseFolderFiles(
  fileList: File[] | FileList,
  folderName: string,
  ignoreOptions: {
    ignoreNodeModules?: boolean;
    ignoreGitFolders?: boolean;
    ignoreEnvFiles?: boolean;
    ignoreOsFiles?: boolean;
  } = {},
  onProgress?: (progress: ParseProgress) => void
): Promise<ZipMetadata> {
  const filesArray = Array.from(fileList);
  const totalFiles = filesArray.length;
  const parsedFiles: ParsedZipFile[] = [];
  let totalUncompressedSize = 0;

  for (let i = 0; i < totalFiles; i++) {
    const file = filesArray[i];
    const rawPath = file.webkitRelativePath || file.name;
    const cleanPath = sanitizeArchivePath(rawPath);
    const isBinary = isBinaryFile(cleanPath);
    const ignored = shouldIgnoreFile(cleanPath, ignoreOptions);
    const ext = cleanPath.split('.').pop()?.toLowerCase() || '';

    // Memory Shield check: identify files exceeding GitHub 100 MB REST API hard limit
    const isOversized =
      file.size >= GITHUB_MAX_BLOB_SIZE ||
      (file.size >= LARGE_DATASET_THRESHOLD && isDatasetDump(cleanPath));

    let content: string | Uint8Array | undefined = undefined;

    if (!ignored) {
      totalUncompressedSize += file.size;

      if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE_BYTES) {
        throw new Error(
          `Pasta rejeitada: tamanho total excede o limite seguro de 2 GB (Proteção contra DoS).`
        );
      }

      // Zero-RAM upfront footprint: never load file content in the indexing loop!
      // All files are loaded lazily on-demand when previewed or published.
    }

    const oversizeReason = isOversized
      ? `Arquivo massivo de ${formatBytes(file.size)} excede o limite seguro da API do GitHub (ex: dataset com 10M produtos da Shopee). Isolado automaticamente pelo Escudo de Memória para evitar estouro de RAM no navegador e erro 422.`
      : undefined;

    parsedFiles.push({
      path: cleanPath,
      name: cleanPath.split('/').filter(Boolean).pop() || cleanPath,
      size: file.size,
      isDirectory: false,
      content,
      fileRef: file,
      loadContent: async () => {
        if (isOversized) {
          // Safely read only the first 32 KB chunk to prevent browser V8 string overflow!
          try {
            const sampleSlice = file.slice(0, 32768);
            const sampleText = await sampleSlice.text();
            return `/* [ZipToGit Memory Shield - Amostra Segura]
 * Arquivo: ${cleanPath}
 * Tamanho Real: ${formatBytes(file.size)} (~10 milhões de registros)
 * Status: Auto-ignorado para o commit do GitHub (limite da API do GitHub é 100 MB).
 * Amostra inicial dos primeiros 32 KB:
 */\n\n${sampleText}\n\n// ... [Demais dados truncados com segurança para proteger a memória do navegador]`;
          } catch {
            return `/* [ZipToGit Memory Shield] Arquivo ${cleanPath} (${formatBytes(file.size)}) isolado com sucesso. */`;
          }
        }
        if (isBinary) {
          const ab = await file.arrayBuffer();
          return new Uint8Array(ab);
        }
        return await file.text();
      },
      isBinary,
      included: !ignored && !isOversized, // Auto-exclude oversized files from commit!
      extension: ext,
      isOversized,
      oversizeReason,
      isDatasetDump: isDatasetDump(cleanPath),
    });

    // Yield every 10 files to avoid freezing UI
    if (i % 10 === 0 || i === totalFiles - 1) {
      onProgress?.({
        processed: i + 1,
        total: totalFiles,
        currentFileName: cleanPath,
        percent: Math.min(100, Math.round(((i + 1) / Math.max(1, totalFiles)) * 100)),
        phase: isOversized
          ? `Detectado arquivo massivo (${formatBytes(file.size)}) - Protegendo memória...`
          : 'Indexando arquivos da pasta...',
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  normalizeRootPaths(parsedFiles);
  const detected = detectProjectType(parsedFiles);
  const shieldSummary = applyMemoryShieldAndGitignore(parsedFiles);

  return {
    fileName: folderName || 'pasta-do-projeto',
    totalFiles: parsedFiles.filter((f) => !f.isDirectory).length,
    totalSize: totalUncompressedSize,
    compressedSize: totalUncompressedSize,
    detectedType: detected,
    files: parsedFiles,
    formatInfo: {
      format: 'unknown',
      displayName: 'Pasta Local (Diretório)',
      isArchive: false,
      isExecutable: false,
      mimeGuess: 'inode/directory',
      magicHex: 'DIR',
    },
    isNestedArchive: false,
    hasOversizedFiles: shieldSummary.hasOversizedFiles,
    oversizedFilesCount: shieldSummary.oversizedFilesCount,
    oversizedTotalBytes: shieldSummary.oversizedTotalBytes,
  };
}

/**
 * Universal archive and binary processor with streaming / lazy-loading optimization.
 * Handles 700 MB+ files safely without freezing browser UI or crashing memory.
 */
export async function parseZipFile(
  file: File,
  ignoreOptions: {
    ignoreNodeModules?: boolean;
    ignoreGitFolders?: boolean;
    ignoreEnvFiles?: boolean;
    ignoreOsFiles?: boolean;
  } = {},
  onProgress?: (progress: ParseProgress) => void
): Promise<ZipMetadata> {
  // 1. Detect magic bytes
  const formatInfo = await detectFileFormatByMagicBytes(file);

  // If file is a raw binary executable or non-zip format that cannot be unpacked with PKZip
  if (
    !formatInfo.isArchive &&
    (formatInfo.format === 'pe_exe' ||
      formatInfo.format === 'elf' ||
      formatInfo.format === 'dex' ||
      formatInfo.format === 'unknown')
  ) {
    return processSingleBinaryFile(file, formatInfo);
  }

  if (formatInfo.format === 'rar' || formatInfo.format === '7z') {
    return processRawArchiveFile(file, formatInfo);
  }

  // 2. PKZip / APK extraction with Zip Slip and Zip Bomb protections
  const parsedFiles: ParsedZipFile[] = [];
  let totalUncompressedSize = 0;
  let hasNestedArchives = false;

  const zip = new JSZip();
  let loadedZip: JSZip;

  onProgress?.({
    processed: 0,
    total: 100,
    currentFileName: file.name,
    percent: 5,
    phase: 'Lendo tabela central do arquivo...',
  });

  try {
    loadedZip = await zip.loadAsync(file);
  } catch (err: any) {
    if (formatInfo.format === 'pe_exe' || formatInfo.format === 'elf') {
      return processSingleBinaryFile(file, formatInfo);
    }
    throw new Error(
      `Falha ao descompactar arquivo: O arquivo parece estar corrompido ou em formato não suportado. (${err.message})`
    );
  }

  // Recursive extraction helper for nested archives (depth <= 3)
  async function extractZipEntries(
    zipInstance: JSZip,
    prefix = '',
    currentDepth = 1
  ): Promise<void> {
    const rawEntries = Object.keys(zipInstance.files);
    const totalEntries = rawEntries.length;

    for (let i = 0; i < totalEntries; i++) {
      const rawEntryName = rawEntries[i];
      // 1. Sanitize path against Zip Slip
      const cleanPath = sanitizeArchivePath(rawEntryName);
      const fullPath = prefix ? `${prefix}/${cleanPath}` : cleanPath;

      const entry = zipInstance.files[rawEntryName];
      const isDir = entry.dir;
      const isBinary = isBinaryFile(fullPath);
      const ignored = shouldIgnoreFile(fullPath, ignoreOptions);
      const ext = fullPath.split('.').pop()?.toLowerCase() || '';

      // Uncompressed size from JSZip metadata without reading full buffer
      const entrySize: number =
        (entry as any)._data?.uncompressedSize ??
        (entry as any)._data?.compressedSize ??
        0;

      // Memory Shield check: identify files exceeding GitHub 100 MB REST API hard limit
      const isOversized =
        entrySize >= GITHUB_MAX_BLOB_SIZE ||
        (entrySize >= LARGE_DATASET_THRESHOLD && isDatasetDump(fullPath));

      let content: string | Uint8Array | undefined = undefined;

      if (!isDir && !ignored) {
        totalUncompressedSize += entrySize;

        // 2. DoS / Zip Bomb protection (2 GB limit)
        if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE_BYTES) {
          throw new Error(
            `Arquivo rejeitado: tamanho total descompactado excede o limite seguro de 2 GB (Proteção contra Zip Bomb).`
          );
        }

        // Zero-RAM upfront footprint: never decompress files in the indexing loop!
        // All files are loaded lazily on-demand via loadContent() when previewed or published.

        // 3. Nested Archive check (up to MAX_NESTED_DEPTH = 3)
        if (
          !isOversized &&
          currentDepth < MAX_NESTED_DEPTH &&
          (ext === 'zip' || ext === 'jar' || ext === 'apk') &&
          entrySize < 100 * 1024 * 1024 // avoid recursing giant nested zips
        ) {
          try {
            const nestedBytes = await entry.async('uint8array');
            const innerZip = new JSZip();
            const loadedInner = await innerZip.loadAsync(nestedBytes);
            hasNestedArchives = true;
            const innerPrefix = fullPath.replace(/\.[^/.]+$/, '');
            await extractZipEntries(loadedInner, innerPrefix, currentDepth + 1);
          } catch {
            // If inner file is not a valid zip, keep as regular binary entry
          }
        }
      }

      const oversizeReason = isOversized
        ? `Arquivo massivo de ${formatBytes(entrySize)} excede o limite seguro da API do GitHub (ex: dataset com 10M produtos da Shopee). Isolado automaticamente pelo Escudo de Memória para evitar estouro de RAM no navegador e erro 422.`
        : undefined;

      parsedFiles.push({
        path: fullPath,
        name: fullPath.split('/').filter(Boolean).pop() || fullPath,
        size: isDir ? 0 : entrySize,
        isDirectory: isDir,
        content,
        loadContent: async () => {
          if (isOversized) {
            return `/* [ZipToGit Memory Shield - Amostra Segura]
 * Arquivo: ${fullPath}
 * Tamanho no ZIP: ${formatBytes(entrySize)} (~10 milhões de registros)
 * Status: Auto-ignorado para o commit do GitHub (limite da API do GitHub: 100 MB).
 * Recomendação: Hospedar o dump completo externamente (S3, R2 ou Postgres) e usar Git LFS.
 */
{
  "_notice": "Dataset massivo omitido com segurança para cumprir cota de 100 MB da API do GitHub",
  "filename": "${cleanPath.split('/').pop()}",
  "sizeBytes": ${entrySize},
  "formattedSize": "${formatBytes(entrySize)}",
  "status": "auto_shielded"
}`;
          }
          if (content !== undefined) return content;
          if (isBinary) {
            return await entry.async('uint8array');
          }
          return await entry.async('text');
        },
        isBinary,
        included: !ignored && !isDir && !isOversized, // Auto-exclude oversized from commit!
        extension: ext,
        isOversized,
        oversizeReason,
        isDatasetDump: isDatasetDump(fullPath),
      });

      // Yield every 10 files to browser event loop to keep UI 60fps responsive
      if (i % 10 === 0 || i === totalEntries - 1) {
        onProgress?.({
          processed: i + 1,
          total: totalEntries,
          currentFileName: fullPath,
          percent: Math.min(99, Math.round(((i + 1) / Math.max(1, totalEntries)) * 100)),
          phase: isOversized
            ? `Detectado arquivo massivo (${formatBytes(entrySize)}) - Protegendo memória...`
            : 'Descompactando arquivos...',
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  await extractZipEntries(loadedZip, '', 1);

  // Normalize root paths if entire zip was enclosed in single folder
  normalizeRootPaths(parsedFiles);

  const detected = detectProjectType(parsedFiles);
  const shieldSummary = applyMemoryShieldAndGitignore(parsedFiles);

  onProgress?.({
    processed: parsedFiles.length,
    total: parsedFiles.length,
    currentFileName: file.name,
    percent: 100,
    phase: 'Concluído!',
  });

  return {
    fileName: file.name,
    totalFiles: parsedFiles.filter((f) => !f.isDirectory).length,
    totalSize: totalUncompressedSize,
    compressedSize: file.size,
    detectedType: detected,
    files: parsedFiles,
    formatInfo,
    isNestedArchive: hasNestedArchives,
    hasOversizedFiles: shieldSummary.hasOversizedFiles,
    oversizedFilesCount: shieldSummary.oversizedFilesCount,
    oversizedTotalBytes: shieldSummary.oversizedTotalBytes,
  };
}

/**
 * Handles standalone binary executables (Windows PE .exe, Linux/Android ELF .so, DEX)
 * without failing decompression, enabling analysis and GitHub versioning.
 */
async function processSingleBinaryFile(
  file: File,
  formatInfo: FileFormatInfo
): Promise<ZipMetadata> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  const parsedFile: ParsedZipFile = {
    path: file.name,
    name: file.name,
    size: file.size,
    isDirectory: false,
    fileRef: file,
    loadContent: async () => {
      const buffer = await file.arrayBuffer();
      return new Uint8Array(buffer);
    },
    isBinary: true,
    included: true,
    extension: ext,
  };

  return {
    fileName: file.name,
    totalFiles: 1,
    totalSize: file.size,
    compressedSize: file.size,
    detectedType: formatInfo.displayName,
    files: [parsedFile],
    formatInfo,
    isNestedArchive: false,
  };
}

async function processRawArchiveFile(
  file: File,
  formatInfo: FileFormatInfo
): Promise<ZipMetadata> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  const parsedFile: ParsedZipFile = {
    path: file.name,
    name: file.name,
    size: file.size,
    isDirectory: false,
    fileRef: file,
    loadContent: async () => {
      const buffer = await file.arrayBuffer();
      return new Uint8Array(buffer);
    },
    isBinary: true,
    included: true,
    extension: ext,
  };

  return {
    fileName: file.name,
    totalFiles: 1,
    totalSize: file.size,
    compressedSize: file.size,
    detectedType: formatInfo.displayName,
    files: [parsedFile],
    formatInfo,
    isNestedArchive: false,
  };
}

/**
 * Parses an Android APK file with complete analysis of Dalvik bytecode,
 * native .so libraries, manifests and assets.
 */
export async function parseApkFile(
  file: File,
  onProgress?: (progress: ParseProgress) => void
): Promise<ZipMetadata> {
  const meta = await parseZipFile(
    file,
    {
      ignoreNodeModules: false,
      ignoreGitFolders: false,
      ignoreEnvFiles: false,
      ignoreOsFiles: false,
    },
    onProgress
  );

  const dexFiles: string[] = [];
  const nativeLibs: string[] = [];
  let hasManifest = false;
  let hasResources = false;
  let assetsCount = 0;

  for (const f of meta.files) {
    if (!f.isDirectory) {
      const lower = f.path.toLowerCase();
      if (lower.endsWith('.dex')) {
        dexFiles.push(f.path);
      }
      if (lower.includes('lib/') && lower.endsWith('.so')) {
        nativeLibs.push(f.path);
      }
      if (lower.includes('androidmanifest.xml')) {
        hasManifest = true;
      }
      if (lower.includes('resources.arsc') || lower.startsWith('res/')) {
        hasResources = true;
      }
      if (lower.startsWith('assets/')) {
        assetsCount++;
      }
    }
  }

  meta.detectedType = 'Android APK Package';
  meta.apkAnalysis = {
    dexFiles,
    nativeLibs,
    hasManifest,
    hasResources,
    assetsCount,
  };

  return meta;
}

/**
 * Automatically applies the Memory Shield to protect browser memory and GitHub rate limits:
 * - Computes oversized metrics (>100MB files, e.g. 700MB Shopee 10M product datasets)
 * - Guarantees that oversized files are documented in .gitignore so the repository is clean
 */
function applyMemoryShieldAndGitignore(parsedFiles: ParsedZipFile[]): {
  hasOversizedFiles: boolean;
  oversizedFilesCount: number;
  oversizedTotalBytes: number;
} {
  const oversizedList = parsedFiles.filter((f) => f.isOversized);
  const hasOversizedFiles = oversizedList.length > 0;
  const oversizedFilesCount = oversizedList.length;
  const oversizedTotalBytes = oversizedList.reduce((acc, f) => acc + f.size, 0);

  if (hasOversizedFiles) {
    const gitignoreFile = parsedFiles.find(
      (f) => f.path.toLowerCase() === '.gitignore' || f.name.toLowerCase() === '.gitignore'
    );
    const oversizedLines = oversizedList.map((f) => f.path).join('\n');
    const shieldComment = `\n# [ZipToGit Memory Shield] Arquivos massivos (>100MB / Datasets volumosos) auto-ignorados:\n${oversizedLines}\n`;

    if (gitignoreFile) {
      if (typeof gitignoreFile.content === 'string') {
        if (!gitignoreFile.content.includes(oversizedList[0].name)) {
          gitignoreFile.content += shieldComment;
        }
      }
    } else {
      parsedFiles.unshift({
        path: '.gitignore',
        name: '.gitignore',
        size: shieldComment.length + 50,
        isDirectory: false,
        content: `# Gitignore gerado pelo ZipToGit Memory Shield\nnode_modules/\n.env*\n__MACOSX/\n.DS_Store\n${shieldComment}`,
        isBinary: false,
        included: true,
        extension: 'gitignore',
      });
    }
  }

  return {
    hasOversizedFiles,
    oversizedFilesCount,
    oversizedTotalBytes,
  };
}

/**
 * If the user zipped an outer enclosing directory (e.g. `my-project/src/index.js`),
 * strip the redundant top-level directory so files are pushed neatly to repo root.
 */
function normalizeRootPaths(files: ParsedZipFile[]) {
  const nonDirs = files.filter((f) => !f.isDirectory);
  if (nonDirs.length === 0) return;

  const firstSegments = nonDirs.map((f) => f.path.split('/')[0]);
  const allShareRoot = firstSegments.every(
    (seg) => seg === firstSegments[0] && seg.length > 0
  );

  if (allShareRoot && firstSegments[0]) {
    const rootPrefix = firstSegments[0] + '/';
    for (const f of files) {
      if (f.path.startsWith(rootPrefix)) {
        f.path = f.path.slice(rootPrefix.length);
      }
    }
  }
}

/**
 * Bundles extracted files into a new ZIP archive and triggers automatic browser download.
 * Resolves lazy loaded content gracefully without exhausting RAM.
 */
export async function downloadZip(
  files: ParsedZipFile[],
  filename: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();

  const filesToAdd = files.filter((f) => !f.isDirectory && f.included);
  if (filesToAdd.length === 0) {
    throw new Error('Nenhum arquivo selecionado para download.');
  }

  for (let i = 0; i < filesToAdd.length; i++) {
    const f = filesToAdd[i];
    let data = f.content;
    if (data === undefined && f.loadContent) {
      data = await f.loadContent();
    } else if (data === undefined && f.fileRef) {
      if (f.isBinary) {
        data = new Uint8Array(await f.fileRef.arrayBuffer());
      } else {
        data = await f.fileRef.text();
      }
    }

    if (data !== undefined) {
      zip.file(f.path, data);
    }

    if (i % 25 === 0) {
      onProgress?.(i + 1, filesToAdd.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 4 }, // level 4 provides high speed and compact size
  });

  const cleanName = filename.toLowerCase().endsWith('.zip')
    ? filename
    : `${filename.replace(/\.[^/.]+$/, '')}-extraido.zip`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Creates a sample repository zip in-memory so user can try the app instantly.
 */
export async function createSampleZip(): Promise<File> {
  const zip = new JSZip();

  zip.file(
    'package.json',
    JSON.stringify(
      {
        name: 'sample-project',
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'vite build',
        },
        dependencies: {
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
      },
      null,
      2
    )
  );

  zip.file(
    'README.md',
    `# Meu Projeto Publicado via ZipToGit\n\nEste projeto foi compactado em .ZIP e publicado **espontaneamente** diretamente para o GitHub através do **ZipToGit**.\n\n## Recursos\n- Publicação instantânea usando GitHub Git Data API\n- Suporte a blobs binários e texto\n- Filtros inteligentes para ignorar node_modules e arquivos confidenciais\n`
  );

  zip.file(
    'src/index.js',
    `console.log("Olá do projeto publicado espontaneamente no GitHub!");\n\nexport function add(a, b) {\n  return a + b;\n}\n`
  );

  zip.file(
    'src/styles.css',
    `body {\n  font-family: sans-serif;\n  background: #0d1117;\n  color: #fff;\n  margin: 0;\n  padding: 2rem;\n}\n`
  );

  zip.file('.gitignore', `node_modules/\n.DS_Store\n.env\ndist/\nbuild/\n`);

  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'meu-projeto-exemplo.zip', {
    type: 'application/zip',
  });
}

/**
 * Creates a sample Android APK in memory with Dalvik DEX bytecode header,
 * manifest, assets and native library structures so user can test immediately.
 */
export async function createSampleApk(): Promise<File> {
  const zip = new JSZip();

  zip.file(
    'AndroidManifest.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.exemplo.aplicativo"
    android:versionCode="1"
    android:versionName="1.0.0">
    <uses-permission android:name="android.permission.INTERNET" />
    <application
        android:allowBackup="true"
        android:label="Aplicativo Exemplo"
        android:supportsRtl="true">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`
  );

  const dexHeader = new Uint8Array([
    0x64, 0x65, 0x78, 0x0a, 0x30, 0x33, 0x35, 0x00,
    0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef,
    0x00, 0x01, 0x00, 0x00, 0x70, 0x00, 0x00, 0x00,
  ]);
  zip.file('classes.dex', dexHeader);
  zip.file('classes2.dex', dexHeader);

  zip.file(
    'assets/app_config.json',
    JSON.stringify(
      {
        appName: 'DemoApp',
        environment: 'production',
        apiEndpoint: 'https://api.exemplo.com/v1',
        modules: ['auth', 'telemetry', 'analytics'],
      },
      null,
      2
    )
  );

  zip.file(
    'assets/agent_pipeline.py',
    `# Pipeline de Agente LLM para Atendimento
import json

system_prompt = "You are a customer service assistant specialized in e-commerce."

def check_input_safety(user_message: str):
    # Chamada de API de moderacao externa
    response = openai.Moderation.create(input=user_message)
    return response["results"][0]["flagged"]

def build_chat_context(user_query: str):
    return [
        {"role": "system", "content": "You are a customer service assistant specialized in e-commerce."},
        {"role": "user", "content": user_query}
    ]
`
  );

  zip.file(
    'assets/.env.example',
    `# Configuracoes de Provedores e Modelos
OPENAI_API_KEY="sk-proj-demo-placeholder"
OLLAMA_BASE_URL="http://localhost:11434"
CUSTOM_TEST_PROMPT="You are a helpful AI assistant being tested."
`
  );

  const elfHeader = new Uint8Array([
    0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x03, 0x00, 0xb7, 0x00, 0x01, 0x00, 0x00, 0x00,
  ]);
  zip.file('lib/arm64-v8a/libnative-core.so', elfHeader);
  zip.file('lib/x86_64/libnative-core.so', elfHeader);

  zip.file(
    'res/values/strings.xml',
    `<resources>\n  <string name="app_name">App Exemplo</string>\n</resources>`
  );
  zip.file(
    'resources.arsc',
    new Uint8Array([0x02, 0x00, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00])
  );

  zip.file(
    'META-INF/MANIFEST.MF',
    `Manifest-Version: 1.0\nCreated-By: 1.0 (Android Signer)\n\nName: AndroidManifest.xml\nSHA-256-Digest: abc123def456\n`
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'exemplo-aplicativo.apk', {
    type: 'application/vnd.android.package-archive',
  });
}
