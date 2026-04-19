import fs from "fs";
import path from "path";

const CAMPAIGNS_DIR = "/Users/fa/Documents/social-media-ops/Campaigns";

export interface CampaignSummary {
  id: string;
  title: string;
  theme: string;
  status: "planning" | "writing" | "complete";
  fileCount: number;
  imageCount: number;
  coverImage: string | null;
  hasBrief: boolean;
  hasMasterCopy: boolean;
  platforms: string[];
  mtime: number;
}

export interface LinkedProduct {
  id: string;
  name: string;
  images: FileInfo[];
}

export interface CampaignDetail extends Omit<CampaignSummary, "platforms"> {
  briefContent: string;
  masterCopy: string;
  assets: FileInfo[];
  linkedProducts: LinkedProduct[];
  platforms: PlatformInfo[];
  allFiles: FileInfo[];
}

export interface FileInfo {
  name: string;
  relativePath: string;
  path: string;
  size: number;
  isImage: boolean;
}

export interface PlatformInfo {
  name: string;
  content: string;
  visualStrategy: string;
  prompts: object[] | null;
  images: FileInfo[];
}

function isImageFile(name: string): boolean {
  return /\.(png|jpg|jpeg|webp|gif)$/i.test(name);
}

function getStatus(dir: string): "planning" | "writing" | "complete" {
  const hasMaster = fs.existsSync(path.join(dir, "master-copy.md"));
  const hasDist = fs.existsSync(path.join(dir, "dist"));
  if (hasDist && hasMaster) return "complete";
  if (hasMaster) return "writing";
  return "planning";
}

function walkDir(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

export function listCampaigns(): CampaignSummary[] {
  if (!fs.existsSync(CAMPAIGNS_DIR)) return [];

  return fs
    .readdirSync(CAMPAIGNS_DIR)
    .filter((name) => {
      const p = path.join(CAMPAIGNS_DIR, name);
      return !name.startsWith(".") && fs.statSync(p).isDirectory();
    })
    .map((id) => scanCampaign(id))
    .sort((a, b) => b.mtime - a.mtime);
}

function scanCampaign(id: string): CampaignSummary {
  const dir = path.join(CAMPAIGNS_DIR, id);
  const briefPath = path.join(dir, "brief.md");

  let title = id;
  let theme = "";

  // Read title from campaign.json first
  const campaignJsonPath = path.join(dir, "campaign.json");
  if (fs.existsSync(campaignJsonPath)) {
    try {
      const cj = JSON.parse(fs.readFileSync(campaignJsonPath, "utf-8"));
      if (cj.title) title = cj.title;
      if (cj.theme) theme = cj.theme;
    } catch { /* ignore */ }
  }

  // Override with brief.md title if available
  if (fs.existsSync(briefPath)) {
    const content = fs.readFileSync(briefPath, "utf-8");
    for (const line of content.split("\n")) {
      if (line.startsWith("# ")) {
        title = line.slice(2).replace("Campaign Brief - ", "").trim();
        break;
      }
    }
    for (const line of content.split("\n")) {
      if (line.includes("所属主题") && line.includes("：")) {
        theme = line.split("：").pop()?.trim() || "";
        break;
      }
    }
  }

  const allFiles = walkDir(dir);
  const imageFiles = allFiles.filter((f) => isImageFile(f));

  let coverImage: string | null = null;
  coverImage = imageFiles.find((f) => /cover|hero/i.test(path.basename(f))) || null;
  if (!coverImage && imageFiles.length > 0) {
    const assetsImages = imageFiles.filter((f) => f.includes("/assets/"));
    coverImage = assetsImages[0] || imageFiles[0];
  }

  // Detect platforms (only root-level platform folders)
  const platforms: string[] = [];
  for (const d of ["linkedin", "facebook", "xiaohongshu", "gongzhonghao"]) {
    if (fs.existsSync(path.join(dir, d))) {
      platforms.push(d);
    }
  }

  return {
    id,
    title,
    theme,
    status: getStatus(dir),
    fileCount: allFiles.length,
    imageCount: imageFiles.length,
    coverImage,
    hasBrief: fs.existsSync(briefPath),
    hasMasterCopy: fs.existsSync(path.join(dir, "master-copy.md")),
    platforms,
    mtime: fs.statSync(dir).mtimeMs / 1000,
  };
}

export function getCampaignDetail(id: string): CampaignDetail | null {
  const dir = path.join(CAMPAIGNS_DIR, id);
  if (!fs.existsSync(dir)) return null;

  const summary = scanCampaign(id);

  // Brief
  const briefPath = path.join(dir, "brief.md");
  const briefContent = fs.existsSync(briefPath) ? fs.readFileSync(briefPath, "utf-8") : "";

  // Master copy
  const mcPath = path.join(dir, "master-copy.md");
  const masterCopy = fs.existsSync(mcPath) ? fs.readFileSync(mcPath, "utf-8") : "";

  // Assets
  const assetsDir = path.join(dir, "assets");
  const assets: FileInfo[] = [];
  if (fs.existsSync(assetsDir)) {
    for (const f of fs.readdirSync(assetsDir).sort()) {
      if (f.startsWith(".")) continue;
      const fp = path.join(assetsDir, f);
      if (fs.statSync(fp).isFile()) {
        assets.push({
          name: f,
          relativePath: "assets/" + f,
          path: fp,
          size: fs.statSync(fp).size,
          isImage: isImageFile(f),
        });
      }
    }
  }

  // Platforms
  const platforms: PlatformInfo[] = [];
  const readPlatform = (name: string, pdir: string) => {
    const contentPath = path.join(pdir, "content.md");
    const content = fs.existsSync(contentPath) ? fs.readFileSync(contentPath, "utf-8") : "";
    const vsPath = path.join(pdir, "visual-strategy.md");
    const visualStrategy = fs.existsSync(vsPath) ? fs.readFileSync(vsPath, "utf-8") : "";
    const promptsPath = path.join(pdir, "prompts.json");
    let prompts: object[] | null = null;
    if (fs.existsSync(promptsPath)) {
      try { prompts = JSON.parse(fs.readFileSync(promptsPath, "utf-8")); } catch { prompts = null; }
    }
    const images: FileInfo[] = [];
    for (const f of fs.readdirSync(pdir).sort()) {
      const fp = path.join(pdir, f);
      if (fs.statSync(fp).isFile() && isImageFile(f)) {
        images.push({ name: f, relativePath: `${name}/${f}`, path: fp, size: fs.statSync(fp).size, isImage: true });
      }
    }
    platforms.push({ name, content, visualStrategy, prompts, images });
  };

  // Only read root-level platform folders
  for (const d of ["linkedin", "facebook", "xiaohongshu", "gongzhonghao"]) {
    const dp = path.join(dir, d);
    if (fs.existsSync(dp)) readPlatform(d, dp);
  }

  // All files
  const allFilePaths = walkDir(dir);
  const allFiles: FileInfo[] = allFilePaths.map((fp) => ({
    name: path.basename(fp),
    relativePath: path.relative(dir, fp),
    path: fp,
    size: fs.statSync(fp).size,
    isImage: isImageFile(fp),
  }));

  // Linked products
  const PRODUCTS_DIR = "/Users/fa/Documents/social-media-ops/Products";
  const linkedPath = path.join(dir, "linked-products.json");
  const linkedProducts: LinkedProduct[] = [];
  if (fs.existsSync(linkedPath)) {
    try {
      const ids: string[] = JSON.parse(fs.readFileSync(linkedPath, "utf-8"));
      for (const pid of ids) {
        const pdir = path.join(PRODUCTS_DIR, pid);
        if (!fs.existsSync(pdir)) continue;
        let pname = pid;
        const pmeta = path.join(pdir, "product.json");
        if (fs.existsSync(pmeta)) {
          try { pname = JSON.parse(fs.readFileSync(pmeta, "utf-8")).name || pid; } catch { /* */ }
        }
        const pimages: FileInfo[] = [];
        const pimgDir = path.join(pdir, "images");
        if (fs.existsSync(pimgDir)) {
          for (const f of fs.readdirSync(pimgDir).sort()) {
            if (f.startsWith(".")) continue;
            const fp = path.join(pimgDir, f);
            if (fs.statSync(fp).isFile() && isImageFile(f)) {
              pimages.push({ name: f, relativePath: `products/${pid}/images/${f}`, path: fp, size: fs.statSync(fp).size, isImage: true });
            }
          }
        }
        linkedProducts.push({ id: pid, name: pname, images: pimages });
      }
    } catch { /* */ }
  }

  return { ...summary, briefContent, masterCopy, assets, linkedProducts, platforms, allFiles };
}

export function getFilePath(filePath: string): string | null {
  const real = fs.realpathSync(filePath);
  if (!real.startsWith(fs.realpathSync(CAMPAIGNS_DIR))) return null;
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}
