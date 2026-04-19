# Skill: image-dispatcher — 生图调度

## 用途
把 prompts.json 转化为可调用任意生图 API 的标准请求体。**实际的 HTTP 调用由 runner / 外部脚本执行**，你只产出请求体内容并交回。

## 前置条件
- prompts.json 已生成并经用户确认

## 处理逻辑

### 1. 构造请求体

读取 prompts.json，把每张图的字段映射为生图 API 通用参数：

| prompts.json 字段 | API 通用参数 |
|-------------------|-------------|
| name | name |
| scene + style（拼接，再附 "Avoid: " + negative_prompt） | prompt |
| aspect_ratio | aspectRatio |
| image_ref | referenceImages |

输出示例（JSON）：

```json
{
  "campaignId": "CXXXXXX",
  "platform": "[平台名]",
  "images": [
    {
      "name": "cover",
      "prompt": "[scene + style]. Avoid: [negative_prompt]",
      "aspectRatio": "3:4",
      "referenceImages": ["assets/feature_01.png"]
    }
  ]
}
```

### 2. 反馈预期

生图是异步的，每张约 30-90 秒。runner 会负责发送请求、轮询结果、保存图片到平台文件夹。

向用户汇报模板：

```
🎨 已构造生图请求

📊 共 [X] 张：
- cover (3:4) — [场景简述]
- slide-2 (3:4) — [场景简述]
...

请由 runner 发送至生图 API。
```

## 注意事项
- `referenceImages` 路径相对于 Campaign 根目录（如 `assets/hero.jpg`）
- 多张图依次生成，总耗时 = 图片数 × 30-90 秒
- 单张失败不影响其他图，可单独重试
