---
name: role-skill
description: 提炼游戏中的角色信息，输出角色、角色TTS、旁白TTS、角色状态及角色关系的结构化JSON。触发词：角色skill、角色信息提炼、角色tts、旁白JSON、角色状态、角色关系。
---

# Role Skill — 角色信息提炼

用于从当前游戏组件中提取角色维度信息，统一输出 JSON，包含：
- 角色基础信息（name、level、themeColor）
- 角色 TTS（台词与音频地址）
- 旁白 TTS（非角色专属引导语）
- 角色状态（流程状态、UI状态、任务状态）
- 角色关联关系（关卡、状态码、步骤、动作）

## 适用场景

- 需要按“角色”拆分语音资源
- 需要做配音分轨（角色音 / 旁白音）
- 需要导出角色配置给外部系统（CMS、音频平台、剧情引擎）

> 不负责场景/道具素材规划，也不负责 BGM 配置；这两类内容已拆分到独立 skill。

## 输出规范

输出必须为 JSON 对象，推荐结构：

```json
{
  "version": "1.0.0",
  "source": "index.tsx",
  "roles": [],
  "narrator": {},
  "roleStates": {},
  "relations": []
}
```

## 抽取规则

1. 角色识别
- 从 `CHARACTERS` 常量提取角色名、颜色、任务文案
- 角色与关卡一一对应：1->小安，2->小瑞，3->小布

2. 角色 TTS
- 角色自述任务：来自 `character.task`
- 角色问句：来自 `getSelectQuestion(level)` 返回值
- 从 `TTS_AUDIO_MAP` 按中文内容匹配 URL

3. 旁白 TTS
- 非特定角色台词统一归类为 `narrator`
- 包含：引导语、步骤语、按钮语、结算语、超时语

4. 角色状态
- 运行状态：`intro/select/sort/action/complete`
- 交互状态：`isAudioPlaying/isCharacterArmed/isPaused/showCharacterClap/showTimeout`
- 结果状态：星级（1~3）、关卡开始/完成状态码

5. 关系信息
- 角色 -> 关卡
- 角色 -> 状态码（开始/完成）
- 角色 -> 关键动作（点击角色、目标选择、开始行动、完成）

## 结果要求

- 不丢字段，不生成虚构角色
- 中文文案保留原句（标点统一全角）
- URL 原样保留
- 不混入场景素材、道具清单、文生图 prompt、BGM 规则
- 允许附带 `tags`、`notes` 扩展字段
