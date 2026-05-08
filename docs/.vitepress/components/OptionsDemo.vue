<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ViewerPro, type ToolbarAction, type ViewerItem } from 'viewer-pro'

interface EditableOptions {
  theme: 'dark' | 'light' | 'auto'
  keyboardShortcuts: boolean
  mobileSwipeToNavigate: boolean
  mobileToolbar: ToolbarAction[]
  preloadAdjacent: boolean
  showInfoPanelButton: boolean
}

const images: ViewerItem[] = Array.from({ length: 10 }, (_, index) => ({
  src: `https://picsum.photos/1200/800?random=${index + 120}`,
  thumbnail: `https://picsum.photos/240/160?random=${index + 120}`,
  title: `配置实验 ${index + 1}`,
  width: 1200,
  height: 800,
  location: index % 2 === 0 ? '杭州' : '上海'
}))

const defaultOptions: EditableOptions = {
  theme: 'dark',
  keyboardShortcuts: true,
  mobileSwipeToNavigate: true,
  mobileToolbar: ['zoomIn', 'zoomOut', 'reset', 'thumbnails', 'info'],
  preloadAdjacent: false,
  showInfoPanelButton: true
}

const viewer = ref<ViewerPro | null>(null)
const selectedIndex = ref(0)
const optionsText = ref(JSON.stringify(defaultOptions, null, 2))
const appliedOptions = ref<EditableOptions>({ ...defaultOptions })
const configError = ref('')
const eventLogs = ref<string[]>([])

const generatedCode = computed(() => `const viewer = new ViewerPro({
  images,
  theme: '${appliedOptions.value.theme}',
  keyboardShortcuts: ${appliedOptions.value.keyboardShortcuts},
  mobileSwipeToNavigate: ${appliedOptions.value.mobileSwipeToNavigate},
  mobileToolbar: ${JSON.stringify(appliedOptions.value.mobileToolbar)},
  preloadAdjacent: ${appliedOptions.value.preloadAdjacent},
  infoRender: createInfoPanel,
  onOpen: (item, index) => {},
  onIndexChange: (item, index) => {},
  onInfoPanelOpen: (item, index) => {}
})`)

const pushLog = (message: string) => {
  const now = new Date().toLocaleTimeString()
  eventLogs.value = [`${now} ${message}`, ...eventLogs.value].slice(0, 8)
}

const normalizeOptions = (value: unknown): EditableOptions => {
  const raw = value && typeof value === 'object' ? value as Partial<EditableOptions> : {}
  const theme = ['dark', 'light', 'auto'].includes(String(raw.theme))
    ? raw.theme as EditableOptions['theme']
    : defaultOptions.theme
  const allowedToolbar: ToolbarAction[] = [
    'zoomIn',
    'zoomOut',
    'reset',
    'rotateLeft',
    'rotateRight',
    'thumbnails',
    'fullscreen',
    'download',
    'info'
  ]
  const mobileToolbar = Array.isArray(raw.mobileToolbar)
    ? raw.mobileToolbar.filter((item): item is ToolbarAction => allowedToolbar.includes(item as ToolbarAction))
    : defaultOptions.mobileToolbar

  return {
    theme,
    keyboardShortcuts: raw.keyboardShortcuts !== false,
    mobileSwipeToNavigate: raw.mobileSwipeToNavigate !== false,
    mobileToolbar,
    preloadAdjacent: raw.preloadAdjacent === true,
    showInfoPanelButton: raw.showInfoPanelButton !== false
  }
}

const createInfoPanel = (item: ViewerItem) => {
  const panel = document.createElement('div')
  panel.style.cssText = 'display:grid;gap:10px;font-size:14px;line-height:1.6;'
  panel.innerHTML = `
    <div><strong>标题：</strong>${item.title || '-'}</div>
    <div><strong>尺寸：</strong>${item.width || '-'}  ${item.height || '-'}</div>
    <div><strong>地点：</strong>${item.location || '-'}</div>
    <div><strong>缩略图：</strong>打开预览后按当前附近和可视区域懒加载</div>
  `
  return panel
}

const createViewer = async () => {
  viewer.value?.destroy()
  await nextTick()
  viewer.value = new ViewerPro({
    images,
    theme: appliedOptions.value.theme,
    keyboardShortcuts: appliedOptions.value.keyboardShortcuts,
    mobileSwipeToNavigate: appliedOptions.value.mobileSwipeToNavigate,
    mobileToolbar: appliedOptions.value.mobileToolbar,
    preloadAdjacent: appliedOptions.value.preloadAdjacent,
    infoRender: createInfoPanel,
    onOpen: (item, index) => pushLog(`onOpen: #${index + 1} ${item.title || ''}`),
    onClose: () => pushLog('onClose'),
    onIndexChange: (item, index) => pushLog(`onIndexChange: #${index + 1} ${item.title || ''}`),
    onInfoPanelOpen: (_, index) => pushLog(`onInfoPanelOpen: #${index + 1}`),
    onInfoPanelClose: (_, index) => pushLog(`onInfoPanelClose: #${index + 1}`)
  })
}

const applyOptions = async () => {
  try {
    const parsed = JSON.parse(optionsText.value)
    appliedOptions.value = normalizeOptions(parsed)
    optionsText.value = JSON.stringify(appliedOptions.value, null, 2)
    configError.value = ''
    pushLog('配置已应用')
    await createViewer()
  } catch (error) {
    configError.value = error instanceof Error ? error.message : '配置 JSON 解析失败'
  }
}

const resetOptions = async () => {
  optionsText.value = JSON.stringify(defaultOptions, null, 2)
  await applyOptions()
}

const openPreview = (index: number) => {
  selectedIndex.value = index
  viewer.value?.open(index)
}

const openCurrent = () => openPreview(selectedIndex.value)

const openInfoPanel = () => viewer.value?.showInfoPanel()

const toggleThumbnails = () => viewer.value?.toggleThumbnailNav()

onMounted(() => {
  createViewer()
})

onUnmounted(() => {
  viewer.value?.destroy()
})
</script>

<template>
  <div class="options-playground">
    <section class="editor-card">
      <div class="card-head">
        <div>
          <h3>在线编辑 ViewerProOptions</h3>
          <p>修改 JSON 后点击应用配置，预览器会立即按新配置重建。</p>
        </div>
        <div class="editor-actions">
          <button @click="applyOptions">应用配置</button>
          <button class="secondary" @click="resetOptions">重置</button>
        </div>
      </div>
      <textarea v-model="optionsText" spellcheck="false" />
      <p v-if="configError" class="error-text">{{ configError }}</p>
    </section>

    <section class="result-card">
      <div class="demo-actions">
        <button @click="openCurrent">打开当前图</button>
        <button v-if="appliedOptions.showInfoPanelButton" @click="openInfoPanel">打开信息面板</button>
        <button @click="toggleThumbnails">切换缩略图</button>
      </div>

      <div class="demo-grid">
        <button
          v-for="(img, index) in images"
          :key="img.src"
          :class="['demo-thumb', { active: selectedIndex === index }]"
          @click="openPreview(index)"
        >
          <img :src="img.thumbnail" :alt="img.title">
          <span>{{ img.title }}</span>
        </button>
      </div>

      <div class="inspector-grid">
        <div class="log-box">
          <strong>事件回调</strong>
          <p v-if="eventLogs.length === 0">打开预览或切换配置后会显示事件。</p>
          <code v-for="log in eventLogs" :key="log">{{ log }}</code>
        </div>
        <div class="log-box">
          <strong>当前配置表现</strong>
          <code>theme: {{ appliedOptions.theme }}</code>
          <code>mobileToolbar: {{ appliedOptions.mobileToolbar.join(', ') }}</code>
          <code>keyboardShortcuts: {{ appliedOptions.keyboardShortcuts }}</code>
          <code>preloadAdjacent: {{ appliedOptions.preloadAdjacent }}</code>
        </div>
      </div>
    </section>

    <section class="code-card">
      <h3>等价代码</h3>
      <pre><code>{{ generatedCode }}</code></pre>
    </section>
  </div>
</template>

<style scoped>
.options-playground {
  display: grid;
  gap: 16px;
}

.editor-card,
.result-card,
.code-card {
  padding: 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.card-head h3,
.code-card h3 {
  margin: 0 0 6px;
}

.card-head p {
  margin: 0;
  color: var(--vp-c-text-2);
}

.editor-actions,
.demo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
}

button {
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 9px;
  padding: 7px 12px;
  background: var(--vp-c-brand-1);
  color: white;
  cursor: pointer;
}

button.secondary,
.demo-actions button {
  border-color: var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

button:hover {
  opacity: 0.88;
}

textarea {
  width: 100%;
  min-height: 230px;
  box-sizing: border-box;
  padding: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-code-block-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.error-text {
  margin: 8px 0 0;
  color: #ef4444;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.demo-thumb {
  position: relative;
  overflow: hidden;
  min-height: 96px;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 0;
  background: var(--vp-c-bg);
}

.demo-thumb.active {
  border-color: var(--vp-c-brand-1);
}

.demo-thumb img {
  width: 100%;
  height: 96px;
  object-fit: cover;
  display: block;
}

.demo-thumb span {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 6px;
  color: white;
  font-size: 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
}

.inspector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.log-box {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
  background: var(--vp-c-bg);
}

.log-box p {
  margin: 0;
  color: var(--vp-c-text-2);
}

.log-box code {
  display: block;
  white-space: pre-wrap;
}

.code-card pre {
  margin: 0;
  padding: 14px;
  border-radius: 12px;
  overflow: auto;
  background: var(--vp-code-block-bg);
}

@media (min-width: 960px) {
  .options-playground {
    grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.1fr);
  }

  .code-card {
    grid-column: 1 / -1;
  }
}
</style>
