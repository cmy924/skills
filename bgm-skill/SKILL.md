````skill
---
name: bgm-skill
description: BGM 库，获取匹配的背景音乐，按游戏阶段播放不同 BGM。内置默认 BGM 模版（主流程/行动进行中/暂停休息），可根据游戏设计自动适配。触发词：BGM规划、背景音乐、BGM配置、音频切换、播放策略、音频状态、自动播放兜底。
---

# BGM Skill — 背景音乐库

BGM 库，为游戏获取匹配的背景音乐，根据不同游戏阶段自动切换播放不同 BGM，包含：
- BGM 曲目库与适用场景匹配
- 按游戏阶段（主流程/行动进行中/暂停休息等）切换 BGM
- 自动播放失败后的兜底策略
- 音频生命周期与播放状态管理

> 不负责角色台词、旁白 TTS；语音相关内容由 `extract-skill`（提炼）/ `produce-skill`（生产）处理。

## 适用场景

- 为游戏匹配合适的背景音乐
- 实现不同游戏阶段播放不同 BGM
- 配置音频切换规则与播放策略
- 处理浏览器自动播放与恢复播放兜底

## 默认 BGM 模版

当游戏未明确 BGM 需求时，使用以下默认模版：

```json
[
  {
    "bgmId": "BGM_MAIN",
    "sceneKey": "main",
    "name": "主流程背景音乐",
    "url": "https://gcdncs.101.com/v0.1/static/aic_service_scontent/game/main_bgm.mp3?serviceName=aic_service_scontent&attachment=true",
    "usage": {
      "isDefault": true,
      "stages": ["global", "intro", "select", "sort", "complete", "action-idle"],
      "description": "默认背景音乐；未暂停且未进入行动步骤计时中时播放。"
    }
  },
  {
    "bgmId": "BGM_PROGRESS",
    "sceneKey": "progress",
    "name": "行动进行中背景音乐",
    "url": "https://gcdncs.101.com/v0.1/static/aic_service_scontent/game/progress_bgm.mp3?serviceName=aic_service_scontent&attachment=true",
    "usage": {
      "isDefault": false,
      "stages": ["action-active"],
      "description": "游戏已开始、当前处于 action 步骤且计时器已启动时播放。"
    }
  },
  {
    "bgmId": "BGM_REST",
    "sceneKey": "rest",
    "name": "暂停休息背景音乐",
    "url": "https://gcdncs.101.com/v0.1/static/aic_service_scontent/game/rest_bgm.mp3?serviceName=aic_service_scontent&attachment=true",
    "usage": {
      "isDefault": false,
      "stages": ["pause"],
      "description": "任意时刻只要 `isPaused` 为 true，即优先切换为休息 BGM。"
    }
  }
]
```

## 输出规范

推荐输出为 JSON 对象：

```json
{
  "audioType": "bgm",
  "summary": {},
  "playbackConfig": {},
  "tracks": [],
  "switchRules": [],
  "lifecycle": {},
  "autoplayFallback": {}
}
```

## 抽取规则

1. 曲目识别
- 提取所有背景音乐曲目、URL、默认曲目与适用场景
- 如果游戏无自定义 BGM，使用默认模版中的 3 首 BGM

2. 切换规则
- 根据暂停、行动中、默认流程等状态整理优先级与目标曲目

3. 播放策略
- 提取循环、音量、恢复播放、切换模式等设置

4. 生命周期
- 提取挂载、切场景、卸载时的音频处理逻辑

## 结果要求

- 不混入角色台词与角色 TTS（由 `extract-skill` / `produce-skill` 负责）
- 保留状态条件与曲目的映射关系
- 允许附带 `notes`、`stateFlag`、`usage` 等扩展字段

````
