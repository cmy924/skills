---
name: themed-react-components
description: 当用户希望使用某种主题风格 UI 时使用此 skill，尤其适合中古风、复古、中世纪、蒸汽朋克、喵系、田园森林、游戏化课件、答题交互、背包/弹窗/对话 UI 等场景。触发词：中古风、复古、中世纪、medieval、vintage、retro future、蒸汽朋克、cat theme、猫咪风、pastoral、森林风、游戏风格、fantasy、课件组件。
---

此 skill 用于帮助用户在项目中集成和使用 **ai-courseware** 组件库。

## 适用范围

当用户提出以下需求时优先使用本 skill：

- 需要 **中古风 / 中世纪 / 复古 / 蒸汽朋克 / 猫咪 / 田园森林** 主题 UI
- 需要 **答题组件**、**题干组件**、**对话气泡**、**对话选项**
- 需要 **游戏化按钮**、**模态框**、**加载条**、**进度条**、**拨动开关**
- 需要 **背包格子**、**物品卡片**、**实体物件按钮**、**物件查看弹窗**
- 用户明确要求使用主题风格

## 推荐工作流

### 步骤 1：先建立主题上下文

```tsx
import { ThemeProvider, Theme } from 'ai-courseware'

export function App() {
  return (
    <ThemeProvider defaultTheme={Theme.RetroFuture}>
      {/* 页面内容 */}
    </ThemeProvider>
  )
}
```

### 步骤 2：按场景选组件

```tsx
import {
  Button,
  Modal,
  QuestionStem,
  AnswerCardGroup,
  DialogBubble,
  ItemCardGrid,
} from 'ai-courseware'
```

### 步骤 3：优先遵循以下生成策略

- **全页统一主题**：优先 `ThemeProvider`
- **局部主题切换**：优先 `ThemeScope`
- **答题页**：优先 `QuestionStem` + `AnswerCardGroup`
- **确认操作**：优先 `Modal` + `Button`
- **对话场景**：优先 `DialogBubble` + `DialogButton`
- **背包/收集页**：优先 `ItemCardGrid`、`ItemCard`、`PopupObjectViewing`
- **数值反馈**：优先 `DeltaPrompt`

> 样式会随组件导入自动生效，通常**无需额外手动引入 CSS**。

## 主题系统

当前共有 4 个主题：

```ts
import { Theme } from 'ai-courseware'

Theme.Medieval       // medieval，中古 / 复古中世纪风
Theme.RetroFuture    // retro-future，复古未来 / 蒸汽朋克风（默认主题）
Theme.Cat            // cat，喵星人 / 可爱猫咪风
Theme.PastoralForest // pastoral-forest，田园森林 / 自然清新风
```

### 三种主题使用方式

```tsx
import { ThemeProvider, ThemeScope, Theme } from 'ai-courseware'

// 1) 全局主题：会修改 document.documentElement 的 data-theme
<ThemeProvider defaultTheme={Theme.RetroFuture}>
  <App />
</ThemeProvider>

// 2) 局部主题：只影响子树
<ThemeScope theme={Theme.Cat}>
  <DialogPanel />
</ThemeScope>

// 3) 手动 data-theme
<div data-theme="medieval">...</div>
```

### 主题使用建议

- **Medieval**：古典、中古、传统故事、冒险、炼金、历史课堂
- **RetroFuture**：科幻课件、实验室、机械、蒸汽朋克、未来复古
- **Cat**：儿童互动、轻松对话、可爱答题、萌系引导
- **PastoralForest**：自然教育、植物百科、轻疗愈、生态主题

## 快速选型

### 如果用户要……

- **“做个中古风主按钮”** → `Button`
- **“做确认弹窗 / 剧情弹窗”** → `Modal`
- **“展示下载/加载进度”** → `Loading` 或 `Progress`
- **“做一个答题页面”** → `QuestionStem` + `AnswerCardGroup`
- **“做 NPC 对话”** → `DialogBubble` + `DialogButton`
- **“做翻页箭头 / 上一步下一步”** → `OperateArrowButton`
- **“做功能入口菱形按钮”** → `AffiliationAreaButton`
- **“做场景中的可点物件”** → `EntityObjectButton`
- **“做背包格子 / 物品栏”** → `ItemCard` + `ItemCardGrid`
- **“做物品详情弹窗”** → `PopupObjectViewing`
- **“显示数值 +10 / -5 动效提示”** → `DeltaPrompt`
- **“做游戏风开关”** → `ToggleSwitch`

## 完整组件清单

以下为当前源码导出的最新组件与辅助能力。

### 1. `ThemeProvider`

全局主题提供者，会把当前主题写入 `document.documentElement` 的 `data-theme`。

```ts
interface ThemeProviderProps {
  defaultTheme?: Theme
  theme?: Theme
  children: ReactNode
}
```

### 2. `ThemeScope`

局部主题作用域，只包裹一个子树，不改全局主题。

```ts
interface ThemeScopeProps {
  defaultTheme?: Theme
  theme?: Theme
  children: ReactNode
  className?: string
}
```

### 3. `Button`

主操作按钮，已替代旧版 `OkButton`。

```ts
type ButtonVariant = 'primary' | 'secondary'
type ButtonSize = 'XL' | 'L' | 'M'
type ButtonWidth = 'fixed' | 'auto' | 'block'

interface ButtonProps {
  theme?: Theme
  variant?: ButtonVariant
  size?: ButtonSize
  widthMode?: ButtonWidth
  label?: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'start' | 'end'
  htmlType?: 'button' | 'submit' | 'reset'
  className?: string
  children?: React.ReactNode
}
```

使用建议：

- `primary`：确认、提交、开始、继续
- `secondary`：取消、返回、关闭
- `widthMode="block"`：适合移动端或窄栏布局

### 4. `Loading`

用于资源下载、课件加载、素材准备进度展示。

```ts
interface LoadingProps {
  theme?: Theme
  percent?: number
  current?: string
  total?: string
  speed?: string
  statusText?: string
  showPercent?: boolean
  showDetails?: boolean
  showStatus?: boolean
  className?: string
  width?: string | number
}
```

### 5. `Modal`

游戏风模态框，支持标准确认弹窗与纯内容面板模式。

```ts
interface ModalProps {
  theme?: Theme
  visible?: boolean
  title?: string
  content?: React.ReactNode
  okText?: string
  cancelText?: string
  onOk?: () => void
  onCancel?: () => void
  showCancel?: boolean
  showOk?: boolean
  maskClosable?: boolean
  showMask?: boolean
  className?: string
  contentClassName?: string
  children?: React.ReactNode
  afterClose?: () => void
  width?: string | number
  height?: string | number
  pure?: boolean
  bg?: boolean
  withPadding?: boolean
  scrollable?: boolean
}
```

### 6. `PopupObjectViewing`

物件/道具详情查看弹窗，适合收集、化学品、博物馆藏品、实验器材等场景。

```ts
interface ContentItem {
  title: string
  description: string
}

interface PopupObjectViewingProps {
  theme?: Theme
  visible?: boolean
  name: string
  formula?: string
  contentItems?: ContentItem[]
  buttonText?: string
  onButtonClick?: () => void
  onClose?: () => void
  maskClosable?: boolean
  showMask?: boolean
  className?: string
  afterClose?: () => void
  showCloseButton?: boolean
}
```

### 7. `DialogButton`

对话选项按钮，适合剧情分支、问答选项、交互命令。

```ts
type DialogButtonType = '下一步' | '操作'
type DialogButtonWidth = '长' | '短'

interface DialogButtonProps {
  theme?: Theme
  type?: DialogButtonType
  width?: DialogButtonWidth
  label?: string
  onClick?: () => void
  disabled?: boolean
  selected?: boolean
  className?: string
  children?: React.ReactNode
}
```

### 8. `OperateArrowButton`

左右操作箭头，适合翻页、轮播、步骤切换。

```ts
type OperateArrowDirection = 'left' | 'right'

interface OperateArrowButtonProps {
  theme?: Theme
  direction?: OperateArrowDirection
  onClick?: () => void
  disabled?: boolean
  className?: string
  ariaLabel?: string
}
```

### 9. `AffiliationAreaButton`

附属区菱形按钮，适合工具栏入口、背包入口、地图入口、设置入口。

```ts
interface AffiliationAreaButtonProps {
  theme?: Theme
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
  icon?: React.ReactNode
  children?: React.ReactNode
  ariaLabel?: string
}
```

### 10. `EntityObjectButton`

可点击实体物件按钮，适合实验台、装备、道具、场景对象。

```ts
interface EntityObjectButtonProps {
  theme?: Theme
  label?: string
  iconSrc?: string
  iconAlt?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}
```

### 11. `ItemCard`

单个物品卡片，适合背包、收集栏、资源槽位。

```ts
type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
type ItemCardSize = 'small' | 'medium' | 'large'

interface ItemData {
  id: string | number
  name?: string
  icon?: string
  rarity?: ItemRarity
  count?: number
  maxCount?: number
  description?: string
  unlocked?: boolean
  extra?: Record<string, unknown>
}

interface ItemCardProps {
  theme?: Theme
  size?: ItemCardSize
  item?: ItemData | null
  selected?: boolean
  disabled?: boolean
  locked?: boolean
  showEmptySlot?: boolean
  showCount?: boolean
  showRarityBorder?: boolean
  draggable?: boolean
  droppable?: boolean
  dragOver?: boolean
  renderIcon?: (item: ItemData) => React.ReactNode
  renderCount?: (count: number, maxCount?: number) => React.ReactNode
  renderOverlay?: (item: ItemData) => React.ReactNode
  onClick?: (item: ItemData | null, event: React.MouseEvent) => void
  onDoubleClick?: (item: ItemData | null, event: React.MouseEvent) => void
  onContextMenu?: (item: ItemData | null, event: React.MouseEvent) => void
}
```

### 12. `ItemCardGrid`

背包/宫格布局组件，支持拖拽排序与空槽位展示。

```ts
interface ItemCardGridProps {
  theme?: Theme
  columns: number
  rows?: number
  size?: ItemCardSize
  items?: (ItemData | null)[]
  defaultItems?: (ItemData | null)[]
  onItemsChange?: (items: (ItemData | null)[]) => void
  totalSlots?: number
  gap?: number | string
  showEmptySlots?: boolean
  showCount?: boolean
  showRarityBorder?: boolean
  selectedIds?: (string | number)[]
  disabledIds?: (string | number)[]
  lockedSlots?: number[]
  draggable?: boolean
  canDrop?: (fromIndex: number, toIndex: number) => boolean
  onItemClick?: (item: ItemData | null, index: number, event: React.MouseEvent) => void
  onItemDoubleClick?: (item: ItemData | null, index: number, event: React.MouseEvent) => void
}
```

### 13. `Progress`

游戏风进度条，支持展示进度与可拖动滑块两种模式。

```ts
type ProgressStatus = 'normal' | 'active' | 'success' | 'exception'
type ProgressMode = 'bar' | 'slider'

interface ProgressProps {
  theme?: Theme
  mode?: ProgressMode
  percent?: number
  onChange?: (percent: number) => void
  step?: number
  status?: ProgressStatus
  showInfo?: boolean
  strokeColor?: string
  trailColor?: string
  strokeWidth?: number
  format?: (percent: number, status?: ProgressStatus) => React.ReactNode
  className?: string
  width?: string | number
}
```

### 14. `AnswerCard`

单个答题选项卡片，通常作为低层组件使用。

```ts
type AnswerStatus = 'default' | 'selected' | 'correct' | 'wrong' | 'missed'
type AnswerValue = string | number
type AnswerLabel = string | number | React.ReactNode

interface AnswerCardProps {
  theme?: Theme
  value: AnswerValue
  label?: AnswerLabel
  children: React.ReactNode
  image?: string
  status?: AnswerStatus
  checked?: boolean
  disabled?: boolean
}
```

### 15. `AnswerCardGroup`

核心答题组件，支持单选、多选、自动判题、解释展示与响应式布局。

```ts
type LabelGenerator = (index: number) => React.ReactNode

interface AnswerOption<T extends AnswerValue = AnswerValue> {
  value: T
  label?: AnswerLabel
  content: React.ReactNode
  image?: string
  disabled?: boolean
  explanation?: React.ReactNode
}

interface AnswerResult<T extends AnswerValue = AnswerValue> {
  isCorrect: boolean
  userAnswer: T | T[]
  correctAnswer: T | T[]
  score?: number
  timeSpent?: number
  attempts?: number
}

interface AnswerCardGroupProps<T extends AnswerValue = AnswerValue> {
  theme?: Theme
  options: AnswerOption<T>[]
  correctAnswer?: T | T[]
  value?: T | T[]
  defaultValue?: T | T[]
  mode?: 'single' | 'multiple'
  maxSelect?: number
  disabled?: boolean
  readOnly?: boolean
  labelType?: 'letter' | 'number' | 'roman' | 'none' | LabelGenerator
  showLabel?: boolean
  validateMode?: 'onChange' | 'onSubmit' | 'manual'
  showCorrectOnWrong?: boolean
  showExplanation?: boolean
  size?: 'small' | 'medium' | 'large' | Record<string, unknown>
  direction?: 'horizontal' | 'vertical'
  columns?: number
  gap?: number | string
  cardLayout?: 'horizontal' | 'vertical'
  responsive?: 'fixed' | 'auto-fill' | 'auto-fit'
  minCardWidth?: number | string
  onChange?: (value: T | T[], option: AnswerOption<T> | AnswerOption<T>[]) => void
  onSubmit?: (result: AnswerResult<T>) => void
  onCorrect?: (result: AnswerResult<T>) => void
  onWrong?: (result: AnswerResult<T>) => void
  className?: string
  cardClassName?: string
}

interface AnswerCardGroupRef<T extends AnswerValue = AnswerValue> {
  submit: () => void
  reset: () => void
  setValue: (value: T | T[]) => void
}
```

同时导出：

```ts
labelGenerators.letter // A / B / C
labelGenerators.number // 1 / 2 / 3
labelGenerators.roman  // I / II / III
```

### 16. `QuestionStem`

题干组件，支持题目文本和答题进度展示。

```ts
interface QuestionStemProps {
  theme?: Theme
  question: string
  progress?: number
  showProgress?: boolean
  className?: string
}
```

### 17. `DeltaPrompt`

数值变化提示横幅，适合分数、信任度、能量值、资源值变动反馈。

```ts
interface DeltaPromptProps {
  theme?: Theme
  delta: number
  label: string
  icon: React.ReactNode
  className?: string
}
```

### 18. `DialogBubble`

对话气泡，适合 NPC 引导、旁白、说明文本。

```ts
interface DialogBubbleProps {
  theme?: Theme
  speakerName: string
  message: string | React.ReactNode
  showArrow?: boolean
  className?: string
}
```

### 19. `ToggleSwitch`

游戏风拨动开关，支持受控与非受控模式。

```ts
interface ToggleSwitchProps {
  theme?: Theme
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  onLabel?: string
  offLabel?: string
  onChange?: (checked: boolean) => void
  className?: string
}
```

## 典型代码模板

### 1. 全局主题 + 主按钮

```tsx
import { ThemeProvider, Theme, Button } from 'ai-courseware'

export function ActionPage() {
  return (
    <ThemeProvider defaultTheme={Theme.Medieval}>
      <Button variant="primary" size="XL" label="开始冒险" />
    </ThemeProvider>
  )
}
```

### 2. 答题页面

```tsx
import { ThemeProvider, Theme, QuestionStem, AnswerCardGroup, Button } from 'ai-courseware'

const options = [
  { value: 'a', content: '透明水彩' },
  { value: 'b', content: '蜡笔' },
  { value: 'c', content: '粉彩' },
  { value: 'd', content: '油画颜料' },
]

export function QuizPage() {
  return (
    <ThemeProvider defaultTheme={Theme.RetroFuture}>
      <QuestionStem question="为了营造朦胧质感，主要使用了哪种材料？" progress={72} />
      <AnswerCardGroup
        options={options}
        correctAnswer="a"
        validateMode="onChange"
        onCorrect={(result) => console.log('correct', result)}
      />
      <Button label="下一题" />
    </ThemeProvider>
  )
}
```

### 3. 对话页面

```tsx
import { ThemeProvider, Theme, DialogBubble, DialogButton } from 'ai-courseware'

export function DialoguePage() {
  return (
    <ThemeProvider theme={Theme.Cat}>
      <DialogBubble speakerName="馆长" message="欢迎来到博物馆，你想先了解哪一部分？" />
      <DialogButton label="化石展区" />
      <DialogButton label="动物标本" />
      <DialogButton type="操作" width="短" label="离开" />
    </ThemeProvider>
  )
}
```

### 4. 背包页面

```tsx
import { ThemeProvider, Theme, AffiliationAreaButton, ItemCardGrid } from 'ai-courseware'

const items = [
  { id: 1, name: '硝酸铵', rarity: 'rare', count: 2 },
  { id: 2, name: '试剂瓶', rarity: 'common', count: 1 },
  null,
  null,
]

export function InventoryPage() {
  return (
    <ThemeProvider theme={Theme.PastoralForest}>
      <AffiliationAreaButton selected ariaLabel="打开背包">
        背包
      </AffiliationAreaButton>
      <ItemCardGrid columns={4} rows={3} defaultItems={items} draggable showRarityBorder />
    </ThemeProvider>
  )
}
```

### 5. 物件详情弹窗

```tsx
import { PopupObjectViewing } from 'ai-courseware'

<PopupObjectViewing
  visible
  name="硝酸铵"
  formula="NH₄NO₃"
  contentItems={[
    { title: '应用', description: '广泛用于农业与工业。' },
    { title: '特性', description: '高温条件下存在危险性。' },
  ]}
  buttonText="收集"
  onButtonClick={() => console.log('collect')}
/>
```

## 生成代码时的规则

- 默认优先使用 **函数组件 + hooks**
- 默认优先提供 **TypeScript** 示例
- 主题未指定时，可先用 `Theme.RetroFuture`
- 如果用户明确说“中古风/中世纪”，显式指定 `Theme.Medieval`
- 如果用户明确说“猫咪风/可爱/儿童”，优先 `Theme.Cat`
- 如果用户明确说“自然/森林/清新”，优先 `Theme.PastoralForest`
- 如果用户需要“科技但复古”，优先 `Theme.RetroFuture`
- 用户需要复杂答题逻辑时，优先 `AnswerCardGroup`，不要手写低层选项状态
- 用户需要物品背包时，优先 `ItemCardGrid`，不要重复造宫格布局
- 用户需要确认弹窗时，优先 `Modal`，不要先从零写遮罩和面板

## 一句话总结

当用户要做 **带风格主题的 React 交互界面**，尤其是 **按钮、弹窗、答题、对话、背包、物件查看、数值反馈** 等场景时，优先使用 `ai-courseware`，并根据场景从上述 19 个组件中组合实现，而不是重新手写一套皮肤化 UI。
