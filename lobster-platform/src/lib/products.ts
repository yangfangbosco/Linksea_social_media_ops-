import fs from "fs";
import path from "path";

const PRODUCTS_DIR = "/Users/fa/Documents/social-media-ops/Products";

export interface ProductSummary {
  id: string;
  name: string;
  description: string;
  imageCount: number;
  coverImage: string | null;
  mtime: number;
}

export interface ProductDetail extends ProductSummary {
  fullDescription: string;
  images: ProductFile[];
  allFiles: ProductFile[];
}

export interface ProductFile {
  name: string;
  relativePath: string;
  path: string;
  size: number;
  isImage: boolean;
}

function isImageFile(name: string): boolean {
  return /\.(png|jpg|jpeg|webp|gif)$/i.test(name);
}

export function listProducts(): ProductSummary[] {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
    return [];
  }

  return fs
    .readdirSync(PRODUCTS_DIR)
    .filter((name) => {
      const p = path.join(PRODUCTS_DIR, name);
      return !name.startsWith(".") && fs.statSync(p).isDirectory();
    })
    .map((id) => scanProduct(id))
    .sort((a, b) => b.mtime - a.mtime);
}

function scanProduct(id: string): ProductSummary {
  const dir = path.join(PRODUCTS_DIR, id);

  // Read product.json
  let name = id;
  let description = "";
  const metaPath = path.join(dir, "product.json");
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      name = meta.name || id;
      description = meta.description || "";
    } catch { /* ignore */ }
  }

  // Count images
  const imagesDir = path.join(dir, "images");
  let imageCount = 0;
  let coverImage: string | null = null;
  if (fs.existsSync(imagesDir)) {
    for (const f of fs.readdirSync(imagesDir)) {
      if (!f.startsWith(".") && isImageFile(f)) {
        imageCount++;
        if (!coverImage) coverImage = path.join(imagesDir, f);
      }
    }
  }

  return {
    id,
    name,
    description,
    imageCount,
    coverImage,
    mtime: fs.statSync(dir).mtimeMs / 1000,
  };
}

export function getProductDetail(id: string): ProductDetail | null {
  const dir = path.join(PRODUCTS_DIR, id);
  if (!fs.existsSync(dir)) return null;

  const summary = scanProduct(id);

  // Full description
  const descPath = path.join(dir, "description.md");
  const fullDescription = fs.existsSync(descPath) ? fs.readFileSync(descPath, "utf-8") : "";

  // Images
  const imagesDir = path.join(dir, "images");
  const images: ProductFile[] = [];
  if (fs.existsSync(imagesDir)) {
    for (const f of fs.readdirSync(imagesDir).sort()) {
      if (f.startsWith(".")) continue;
      const fp = path.join(imagesDir, f);
      if (fs.statSync(fp).isFile() && isImageFile(f)) {
        images.push({ name: f, relativePath: "images/" + f, path: fp, size: fs.statSync(fp).size, isImage: true });
      }
    }
  }

  // All files
  const allFiles: ProductFile[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const fp = path.join(d, entry.name);
      if (entry.isDirectory()) walk(fp);
      else allFiles.push({ name: entry.name, relativePath: path.relative(dir, fp), path: fp, size: fs.statSync(fp).size, isImage: isImageFile(entry.name) });
    }
  };
  walk(dir);

  return { ...summary, fullDescription, images, allFiles };
}

export function createProduct(id: string, name: string): string {
  const dir = path.join(PRODUCTS_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, "images"), { recursive: true });
  fs.writeFileSync(path.join(dir, "product.json"), JSON.stringify({ name, description: "", createdAt: new Date().toISOString() }, null, 2));
  fs.writeFileSync(path.join(dir, "description.md"), `# ${name}\n\n`);
  return id;
}

export function updateProduct(id: string, data: { name?: string; description?: string }): boolean {
  const dir = path.join(PRODUCTS_DIR, id);
  if (!fs.existsSync(dir)) return false;

  const metaPath = path.join(dir, "product.json");
  let meta: Record<string, string> = {};
  if (fs.existsSync(metaPath)) {
    try { meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")); } catch { /* ignore */ }
  }
  if (data.name) meta.name = data.name;
  if (data.description !== undefined) meta.description = data.description;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  if (data.description !== undefined) {
    fs.writeFileSync(path.join(dir, "description.md"), data.description);
  }
  return true;
}

export function getProductFilePath(filePath: string): string | null {
  const real = fs.realpathSync(filePath);
  if (!real.startsWith(fs.realpathSync(PRODUCTS_DIR))) return null;
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}
