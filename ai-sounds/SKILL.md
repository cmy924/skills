---
name: ai-sounds
description: 使用 ai-sounds 库播放音效，增强用户交互体验。用于任务完成时播放反馈音（"clear1"、"clear2"）、错误提示音（"error1-3"）、进度提示音（"cursor1-8"）、确认音（"decide1-24"）等场景。项目已安装 ai-sounds npm 包，仅支持浏览器环境。触发词包括"播放音效"、"音效反馈"、"play sound"、"sound effect"。
---

# AI Sounds — 音效资源库

仅负责游戏内音效（SE）的播放，增强用户交互体验。

## ⚠️ 防覆盖规则

执行前检查 `index.tsx` 中是否存在 `@custom-sounds` 标记。

- 如果找到 `@custom-sounds` → **跳过音效代码注入**，表示项目已有完整的音效配置，不需要重新添加 import 或 play 调用
- 如果未找到 → 按下方说明正常添加音效代码

> ⛔ **职责边界：** 本 skill 只管音效（非语言效果音）。  
> TTS 语音由 `extract-skill` 提炼、`produce-skill` 生产。  
> BGM 背景音乐由 `bgm-skill` 负责。  
> 角色图片由 `roles-skill` 负责。

## Quick Start

```javascript
import soundLibrary from 'ai-sounds'

// Play a sound effect
await soundLibrary.play('clear1')

// Play with custom volume
await soundLibrary.play('decide1', { volume: 0.7 })
```

## Usage Examples

### In Browser HTML/JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import soundLibrary from 'ai-sounds'

    // Play on button click
    document.querySelector('#successBtn').addEventListener('click', async () => {
      await soundLibrary.play('clear1')
      console.log('Task completed!')
    })

    document.querySelector('#errorBtn').addEventListener('click', async () => {
      await soundLibrary.play('error1')
      console.log('Error occurred!')
    })
  </script>
</head>
<body>
  <button id="successBtn">Complete Task</button>
  <button id="errorBtn">Trigger Error</button>
</body>
</html>
```

### In React/Vue/Svelte Applications

```javascript
import soundLibrary from 'ai-sounds'

// In an event handler
async function handleSuccess() {
  try {
    // ... your logic
    await soundLibrary.play('clear1')
    console.log('Success!')
  } catch (error) {
    await soundLibrary.play('error1')
    console.error('Error:', error)
  }
}

// During navigation
async function handleMenuNavigation() {
  await soundLibrary.play('cursor2', { volume: 0.5 })
}

// On confirmation
async function handleConfirm() {
  await soundLibrary.play('decide3')
}
```

## Best Practices

1. **Browser only** - This library only works in browser environments with DOM access
2. **User interaction** - First sound playback requires user interaction (click, touch, etc.) due to browser autoplay policies
3. **Use sparingly** - Sound effects lose impact if overused
4. **Match context** - Choose sounds that fit the semantic meaning
5. **Volume control** - Use lower volumes (0.5-0.7) for frequent sounds
6. **Error handling** - Wrap play() calls in try-catch for production code

## Browser Autoplay Policy

Most browsers block autoplay of audio until the user interacts with the page. Best practices:

```javascript
// Good: Play sound in response to user action
button.addEventListener('click', async () => {
  await soundLibrary.play('click1')
})

// Bad: Try to play sound on page load
// This will likely be blocked by the browser
window.addEventListener('load', async () => {
  await soundLibrary.play('welcome')  // ❌ Will fail
})
```

## API Reference

```typescript
interface SoundLibrary {
  // Play a sound effect
  play(id: string, options?: {
    volume?: number      // 0.0 to 1.0 (default: 1.0)
    loop?: boolean       // Loop playback (default: false)
    playbackRate?: number // Playback speed (default: 1.0)
    currentTime?: number  // Start time in seconds (default: 0)
  }): Promise<HTMLAudioElement>

  // Stop a playing sound
  stop(id: string): void

  // Preload a sound for faster playback
  preload(id: string): Promise<void>

  // Get the CDN URL for a sound
  getUrl(id: string): string

  // Unload sound from memory
  unload(id: string): void
  unloadAll(): void
}
```

## Sound Selection

1. 首先决定音效的播放时机，选择在有意义的时刻播放音效
2. 根据使用场景，选择音效类别：
   - 游戏音效：游戏攻击、防御、道具获取、子弹、爆炸音效等
   - 交互音效：菜单导航、消息提示、按钮点击、确认取消等
   - 自然音效：环境氛围，如鸟鸣、雨声、脚步声等
   - 氛围音效：烘托气氛的背景音乐、环境声等
   - 剧情音效：RPG游戏剧情事件的音效和背景音乐
3. 查阅 `references/sounds.md` 获取完整音效清单（含 id、name、description）

### 常用音效速查

| 场景 | 推荐 id | 说明 |
|------|---------|------|
| 任务完成 | `clear1`, `clear2` | RPG 风通关音效 |
| 答对 | `quiz1` | 叮咚叮咚 |
| 答错 | `quiz2` | 噗噗 |
| 按钮点击 | `click1`, `cursor1` | 咔哒 / 嘁其 |
| 确认操作 | `decide1`~`decide24` | 多种风格决定音 |
| 取消操作 | `cancel1`~`cancel5` | 取消音效 |
| 错误提示 | `error1`~`error3` | 错误警告音 |
| 获得道具 | `get1` | 呜嗡 |
| 状态提升 | `status1`, `status3`, `status5` | 上升音效 |
| 状态下降 | `status2`, `status4` | 恶化音效 |

> 完整音效列表超过 200 个，详见 `references/sounds.md`。

## Notes

- The ai-sounds library loads sounds from a CDN on-demand
- Sounds are cached after first load
- All sounds are in .m4a format
- The library is browser-only (requires window and document)
- Cannot be used in Node.js, Deno, or other server-side JavaScript environments
