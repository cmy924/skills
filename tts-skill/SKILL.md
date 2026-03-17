````skill
---
name: tts-skill
description: 提炼游戏中的 TTS 语音数据，包括角色台词、旁白引导语、按钮语音等，输出 TTS 规划 JSON。与 role-skill 协作，专注于语音资源的采集与分轨。触发词：TTS规划、语音提炼、TTS数据、台词提取、旁白语音、配音清单、语音资源。
---

# TTS Skill — TTS 语音规划提炼

用于从当前游戏组件中提取所有 TTS 语音相关数据，统一输出 JSON，包含：
- 角色台词 TTS（角色自述、问句、鼓励语等）
- 旁白 TTS（非角色专属的引导语、步骤语、按钮语、结算语）
- 语音触发条件与播放时机
- 音频 URL 映射

> 不负责 BGM 背景音乐配置；BGM 相关内容由 `bgm-skill` 处理。
> 角色维度的完整信息（状态、关系等）由 `role-skill` 负责，本 skill 仅聚焦语音资源。

## 适用场景

- 需要整理全部 TTS 语音清单用于生产
- 需要做配音分轨（角色音 / 旁白音）
- 需要导出语音配置给 TTS 生产 API
- 需要检查语音覆盖完整性（是否有遗漏的文案未生成语音）

## 输出规范

输出文件路径：`素材库/tts.json`

推荐输出为 JSON 对象：

```json
{
  "audioType": "tts",
  "version": "1.0.0",
  "source": "index.tsx",
  "roleTTS": [
    {
      "role": "角色名",
      "lines": [
        {
          "id": "role_line_1",
          "text": "中文台词原文",
          "scene": "触发场景/阶段",
          "trigger": "触发条件描述",
          "url": "已有的 CDN URL 或空"
        }
      ]
    }
  ],
  "narratorTTS": [
    {
      "id": "narrator_1",
      "text": "中文旁白原文",
      "scene": "触发场景/阶段",
      "trigger": "触发条件描述",
      "url": "已有的 CDN URL 或空"
    }
  ],
  "uiTTS": [
    {
      "id": "ui_1",
      "text": "按钮/提示文案",
      "scene": "UI 交互场景",
      "trigger": "用户操作描述",
      "url": "已有的 CDN URL 或空"
    }
  ]
}
```

## 抽取规则

1. 角色台词识别
- 从 `CHARACTERS` 常量、`character.task` 等提取角色自述
- 从 `getSelectQuestion()` 等方法提取角色问句
- 从 `TTS_AUDIO_MAP` 按中文内容匹配已有 URL

2. 旁白识别
- 非角色专属的引导语、步骤说明、结算语归入旁白
- 包含：开场引导、操作提示、超时提醒、通关结语等

3. UI 语音识别
- 按钮点击语音、状态切换提示音等
- 与 `ai-sounds` 的音效（SE）区分：TTS 是人声语音，SE 是效果音

4. URL 映射
- 优先从 `TTS_AUDIO_MAP`、`ASSET_URLS` 中提取已有 URL
- 未生成的标记 `url: ""` 以便后续 `asset-generate` 生产

## 结果要求

- **必须将 JSON 结果写入 `素材库/tts.json` 文件**，便于后续 `prompt-skill` 和 `asset-generate` 读取使用
- 中文文案保留原句（标点统一全角）
- URL 原样保留，未生成的留空字符串
- 不混入 BGM 配置（由 `bgm-skill` 负责）
- 不重复 `role-skill` 的角色状态/关系信息，仅聚焦语音资源
- 允许附带 `tags`、`notes`、`priority` 等扩展字段

````
