# Skill: prompt-architect — Prompt 架构

## 用途
把"产品长相"和"大厂审美"翻译成 AI 能听懂的咒语。整合"参考图 + VI 标准 + 场景描述"，生成精准的生图 JSON。

## 前置条件
- visual-strategy.md 已生成并经用户确认
- assets/ 下有对应的参考素材图

## 处理逻辑

### 1. 特征提取
从 assets/ 中的实拍图提取产品核心视觉特征，例如：
- 银色极简底座
- 15寸 E-ink 屏
- 2D 数字人面部细节
- 产品整体比例和造型

**必须从实拍图提取，不得脑补。**

### 2. VI 注入
自动挂载公司视觉规范：
- **色调：** 低饱和度、商务蓝为主色、冷白辅助
- **光影：** 45度侧光、柔和环境光、不要硬闪光
- **风格：** 极简、专业 B2B 摄影感、克制
- **禁忌：** 高饱和、花哨、夜店风、卡通化

### 3. Prompt 合成

针对策划单中的每张图，输出结构化 JSON。

**语言规则：** 所有字段用中文撰写，但 `style` 和 `negative_prompt` 保持英文（生图模型对英文关键词识别更准）。

```json
{
  "name": "cover",
  "scene": "银色极简底座的数字人一体机，放置在明亮的现代展厅中央，一位参观者正走向设备准备互动",
  "image_ref": ["assets/feature_01.png"],
  "style": "minimalist, professional B2B photography, corporate blue lighting, 45-degree side light, low saturation, clean composition",
  "negative_prompt": "clunky, distorted, low resolution, cartoon, oversaturated, neon colors, cluttered background",
  "aspect_ratio": "3:4",
  "purpose": "封面图 - 展示产品在真实空间中的高级感"
}
```

## 输出

**保存路径：** `Campaigns/CXXXXXX/[平台名]/prompts.json`

完整格式：
```json
{
  "campaignId": "CXXXXXX",
  "platform": "[目标平台]",
  "vi_standard": {
    "primary_color": "corporate blue",
    "style": "minimalist B2B",
    "lighting": "45-degree side light, soft ambient",
    "forbidden": ["oversaturated", "cartoon", "neon"]
  },
  "images": [
    {
      "name": "cover",
      "scene": "...",
      "image_ref": ["assets/xxx.png"],
      "style": "...",
      "negative_prompt": "...",
      "aspect_ratio": "3:4",
      "purpose": "封面图"
    }
  ]
}
```

## 关联产品规则
如果用户消息中提到了关联产品及其图片路径：
- **每张图的 image_ref 中都必须包含至少一张产品图的绝对路径**
- 产品图用于确保生成的图片中产品外观与真实产品一致

## 注意事项
- **每张图的 prompt 必须包含产品核心视觉特征**，不能只描述场景忘了产品
- **image_ref 必须指向真实存在的文件**
- **negative_prompt 必须包含防变形、防低质量的关键词**
- **JSON 中严禁使用中文引号 `""` `''`**，会导致 JSON 解析失败
