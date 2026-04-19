# Skill: file-manager — 文件层级与版本约定

## 目录约定

```
Campaigns/CXXXXXX/
├── brief.md                    ← 想得多 产出
├── master-copy.md              ← 写得好 产出（母稿）
├── linkedin/
│   ├── content.md              ← 写得好 产出
│   ├── visual-strategy.md      ← 画得美 产出
│   ├── prompts.json            ← 画得美 产出
│   └── *.png                   ← 生图产出
├── facebook/
│   └── ...
├── xiaohongshu/
│   └── ...
└── gongzhonghao/
    └── ...
```

**不要创建 `dist/` 目录。平台文件夹直接放在项目根目录下。**

## 版本约定

当某版文案需要重写时：
- 当前版本重命名为 `content_v1.md`（或 `master-copy_v1.md`）
- 新版本始终命名为 `content.md`（或 `master-copy.md`）
- 确保 `content.md` / `master-copy.md` 始终是最新确认版

## 输出文件后的回应模板

```
文件已保存
路径：Campaigns/CXXXXXX/linkedin/content.md
```

## 注意事项
- 平台文件夹按需创建，用户要哪个平台才创建哪个
- 不创建 dist/ 目录
- `content.md` 始终是最新版
