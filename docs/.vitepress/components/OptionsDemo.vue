<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ViewerPro, type ToolbarAction, type ViewerItem } from 'viewer-pro'

interface EditableOptions {
  theme: 'dark' | 'light' | 'auto'
  backend: 'auto' | 'css' | 'webgl'
  webglFiltering: 'linear' | 'nearest'
  keyboardShortcuts: boolean
  mobileSwipeToNavigate: boolean
  toolbar: ToolbarAction[]
  mobileToolbar: ToolbarAction[]
  preloadAdjacent: boolean
  preloadCacheLimit: number
  showInfoPanelButton: boolean
}

const images: ViewerItem[] = Array.from({ length: 10 }, (_, index) => ({
  src: `https://picsum.photos/seed/${index + 120}/1200/800`,
  thumbnail: `https://picsum.photos/seed/${index + 120}/240/160`,
  title: `配置实验 ${index + 1}`,
  width: 1200,
  height: 800,
  location: index % 2 === 0 ? '杭州' : '上海'
}))

const allToolbarActions: { value: ToolbarAction; label: string }[] = [
  { value: 'zoomIn', label: '放大' },
  { value: 'zoomOut', label: '缩小' },
  { value: 'reset', label: '重置' },
  { value: 'rotateLeft', label: '左旋' },
  { value: 'rotateRight', label: '右旋' },
  { value: 'thumbnails', label: '缩略图' },
  { value: 'fullscreen', label: '全屏' },
  { value: 'download', label: '下载' },
  { value: 'info', label: '信息' }
]

const defaultOptions: EditableOptions = {
  theme: 'dark',
  backend: 'auto',
  webglFiltering: 'linear',
  keyboardShortcuts: true,
  mobileSwipeToNavigate: true,
  toolbar: ['zoomIn', 'zoomOut', 'reset', 'rotateLeft', 'rotateRight', 'thumbnails', 'fullscreen', 'download', 'info'],
  mobileToolbar: ['rotateLeft', 'rotateRight', 'thumbnails', 'info'],
  preloadAdjacent: false,
  preloadCacheLimit: 5,
  showInfoPanelButton: true
}

const viewer = ref<ViewerPro | null>(null)
const selectedIndex = ref(0)
const appliedOptions = ref<EditableOptions>({ ...defaultOptions })
const eventLogs = ref<string[]>([])

const toggleToolbarAction = (type: 'toolbar' | 'mobileToolbar', action: ToolbarAction) => {
  const list = appliedOptions.value[type]
  const idx = list.indexOf(action)
  if (idx >= 0) {
    list.splice(idx, 1)
  } else {
    list.push(action)
  }
}

const generatedCode = computed(() => `const viewer = new ViewerPro({
  images,
  theme: '${appliedOptions.value.theme}',
  backend: '${appliedOptions.value.backend}',
  webglFiltering: '${appliedOptions.value.webglFiltering}',
  keyboardShortcuts: ${appliedOptions.value.keyboardShortcuts},
  mobileSwipeToNavigate: ${appliedOptions.value.mobileSwipeToNavigate},
  toolbar: ${JSON.stringify(appliedOptions.value.toolbar)},
  mobileToolbar: ${JSON.stringify(appliedOptions.value.mobileToolbar)},
  preloadAdjacent: ${appliedOptions.value.preloadAdjacent},
  preloadCacheLimit: ${appliedOptions.value.preloadCacheLimit},
  infoRender: createInfoPanel,
  onOpen: (item, index) => {},
  onIndexChange: (item, index) => {},
  onInfoPanelOpen: (item, index) => {}
})`)

const pushLog = (message: string) => {
  const now = new Date().toLocaleTimeString()
  eventLogs.value = [`${now} ${message}`, ...eventLogs.value].slice(0, 8)
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
    backend: appliedOptions.value.backend,
    webglFiltering: appliedOptions.value.webglFiltering,
    keyboardShortcuts: appliedOptions.value.keyboardShortcuts,
    mobileSwipeToNavigate: appliedOptions.value.mobileSwipeToNavigate,
    toolbar: appliedOptions.value.toolbar,
    mobileToolbar: appliedOptions.value.mobileToolbar,
    preloadAdjacent: appliedOptions.value.preloadAdjacent,
    preloadCacheLimit: appliedOptions.value.preloadCacheLimit,
    infoRender: createInfoPanel,
    onOpen: (item, index) => pushLog(`onOpen: #${index + 1} ${item.title || ''}`),
    onClose: () => pushLog('onClose'),
    onIndexChange: (item, index) => pushLog(`onIndexChange: #${index + 1} ${item.title || ''}`),
    onInfoPanelOpen: (_, index) => pushLog(`onInfoPanelOpen: #${index + 1}`),
    onInfoPanelClose: (_, index) => pushLog(`onInfoPanelClose: #${index + 1}`)
  })
}

const applyOptions = async () => {
  pushLog('配置已应用')
  await createViewer()
}

const resetOptions = async () => {
  appliedOptions.value = { ...defaultOptions, toolbar: [...defaultOptions.toolbar], mobileToolbar: [...defaultOptions.mobileToolbar] }
  pushLog('配置已重置')
  await createViewer()
}

watch(appliedOptions, async () => {
  await createViewer()
}, { deep: true })

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
    <section class="config-section">
      <div class="config-header">
        <h3>配置面板</h3>
        <button class="btn-reset" @click="resetOptions">重置默认</button>
      </div>

      <div class="config-grid">
        <div class="config-cell">
          <span class="cell-label">主题</span>
          <div class="seg-control">
            <button
              v-for="t in (['dark', 'light', 'auto'] as const)"
              :key="t"
              :class="{ active: appliedOptions.theme === t }"
              @click="appliedOptions.theme = t"
            >{{ t }}</button>
          </div>
        </div>

        <div class="config-cell">
          <span class="cell-label">渲染后端</span>
          <div class="seg-control">
            <button
              v-for="b in (['auto', 'css', 'webgl'] as const)"
              :key="b"
              :class="{ active: appliedOptions.backend === b }"
              @click="appliedOptions.backend = b"
            >{{ b }}</button>
          </div>
        </div>

        <div class="config-cell">
          <span class="cell-label">WebGL 过滤</span>
          <div class="seg-control">
            <button
              v-for="f in (['linear', 'nearest'] as const)"
              :key="f"
              :class="{ active: appliedOptions.webglFiltering === f }"
              @click="appliedOptions.webglFiltering = f"
            >{{ f }}</button>
          </div>
        </div>

        <div class="config-cell">
          <span class="cell-label">缓存上限</span>
          <div class="number-control">
            <button class="num-btn" @click="appliedOptions.preloadCacheLimit = Math.max(1, appliedOptions.preloadCacheLimit - 1)">−</button>
            <span class="num-value">{{ appliedOptions.preloadCacheLimit }}</span>
            <button class="num-btn" @click="appliedOptions.preloadCacheLimit = Math.min(20, appliedOptions.preloadCacheLimit + 1)">+</button>
          </div>
        </div>

        <div class="config-cell">
          <span class="cell-label">键盘快捷键</span>
          <button
            class="toggle-btn"
            :class="{ on: appliedOptions.keyboardShortcuts }"
            @click="appliedOptions.keyboardShortcuts = !appliedOptions.keyboardShortcuts"
          >{{ appliedOptions.keyboardShortcuts ? 'ON' : 'OFF' }}</button>
        </div>

        <div class="config-cell">
          <span class="cell-label">滑动切换</span>
          <button
            class="toggle-btn"
            :class="{ on: appliedOptions.mobileSwipeToNavigate }"
            @click="appliedOptions.mobileSwipeToNavigate = !appliedOptions.mobileSwipeToNavigate"
          >{{ appliedOptions.mobileSwipeToNavigate ? 'ON' : 'OFF' }}</button>
        </div>

        <div class="config-cell">
          <span class="cell-label">预加载相邻</span>
          <button
            class="toggle-btn"
            :class="{ on: appliedOptions.preloadAdjacent }"
            @click="appliedOptions.preloadAdjacent = !appliedOptions.preloadAdjacent"
          >{{ appliedOptions.preloadAdjacent ? 'ON' : 'OFF' }}</button>
        </div>

        <div class="config-cell">
          <span class="cell-label">信息面板</span>
          <button
            class="toggle-btn"
            :class="{ on: appliedOptions.showInfoPanelButton }"
            @click="appliedOptions.showInfoPanelButton = !appliedOptions.showInfoPanelButton"
          >{{ appliedOptions.showInfoPanelButton ? 'ON' : 'OFF' }}</button>
        </div>
      </div>

      <div class="toolbar-section">
        <span class="cell-label">桌面端工具栏 <code>toolbar</code></span>
        <div class="chip-group">
          <button
            v-for="action in allToolbarActions"
            :key="'dt-' + action.value"
            :class="['chip', { active: appliedOptions.toolbar.includes(action.value) }]"
            @click="toggleToolbarAction('toolbar', action.value)"
          >{{ action.label }}</button>
        </div>
      </div>

      <div class="toolbar-section">
        <span class="cell-label">移动端工具栏 <code>mobileToolbar</code></span>
        <div class="chip-group">
          <button
            v-for="action in allToolbarActions"
            :key="'mt-' + action.value"
            :class="['chip', { active: appliedOptions.mobileToolbar.includes(action.value) }]"
            @click="toggleToolbarAction('mobileToolbar', action.value)"
          >{{ action.label }}</button>
        </div>
      </div>
    </section>

    <section class="preview-section">
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
    </section>

    <section class="inspector-section">
      <div class="log-box">
        <strong>事件回调</strong>
        <p v-if="eventLogs.length === 0">打开预览或切换配置后会显示事件。</p>
        <code v-for="log in eventLogs" :key="log">{{ log }}</code>
      </div>
    </section>

    <section class="code-section">
      <details>
        <summary>查看等价代码</summary>
        <pre><code>{{ generatedCode }}</code></pre>
      </details>
    </section>
  </div>
</template>

<style scoped>
.options-playground {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Config Section */
.config-section {
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.config-header h3 {
  margin: 0;
  font-size: 16px;
}

.btn-reset {
  padding: 5px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
}

.btn-reset:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.config-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 8px;
  background: var(--vp-c-bg);
}

.cell-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.toolbar-section {
  margin-top: 12px;
  padding: 10px;
  border-radius: 8px;
  background: var(--vp-c-bg);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Seg Control */
.seg-control {
  display: inline-flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.seg-control button {
  border: none;
  border-radius: 0;
  padding: 4px 10px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
}

.seg-control button.active {
  background: var(--vp-c-brand-1);
  color: white;
}

.seg-control button:not(:last-child) {
  border-right: 1px solid var(--vp-c-divider);
}

/* Toggle */
.toggle-btn {
  width: fit-content;
  padding: 4px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn.on {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

/* Number Control */
.number-control {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.num-btn {
  border: none;
  border-radius: 0;
  padding: 4px 8px;
  background: transparent;
  color: var(--vp-c-text-1);
  font-size: 14px;
  cursor: pointer;
}

.num-btn:hover {
  background: var(--vp-c-bg-soft);
}

.num-value {
  min-width: 24px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

/* Chips */
.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  padding: 3px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.chip.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

/* Preview Section */
.preview-section {
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.demo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.demo-actions button {
  padding: 6px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  cursor: pointer;
}

.demo-actions button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.demo-thumb {
  position: relative;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 0;
  background: var(--vp-c-bg);
  cursor: pointer;
}

.demo-thumb.active {
  border-color: var(--vp-c-brand-1);
}

.demo-thumb img {
  width: 100%;
  height: 80px;
  object-fit: cover;
  display: block;
}

.demo-thumb span {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 4px 6px;
  color: white;
  font-size: 11px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
}

/* Inspector */
.inspector-section {
  padding: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.log-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-box strong {
  font-size: 13px;
  margin-bottom: 4px;
}

.log-box p {
  margin: 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.log-box code {
  display: block;
  font-size: 12px;
  white-space: pre-wrap;
  color: var(--vp-c-text-2);
}

/* Code Section */
.code-section {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
}

.code-section details {
  padding: 0;
}

.code-section summary {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--vp-c-text-2);
}

.code-section summary:hover {
  color: var(--vp-c-text-1);
}

.code-section pre {
  margin: 0;
  padding: 14px 16px;
  overflow: auto;
  background: var(--vp-code-block-bg);
  font-size: 12px;
  line-height: 1.6;
}
</style>
