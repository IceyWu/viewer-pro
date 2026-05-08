# ViewerPro

ViewerPro 是核心类，提供图片预览的主要能力，包括打开/关闭预览、切换图片、控制信息面板、控制缩略图导航、读取变换状态和更新主题/缩放配置。

## 构造函数

```typescript
new ViewerPro(options?: ViewerProOptions)
```

### 参数

- `options` - 可选的配置对象，完整类型见 [ViewerProOptions](/api/types#viewerprooptions)。

### 示例

```typescript
import { ViewerPro } from 'viewer-pro'

const viewer = new ViewerPro({
  images: [
    { src: 'image1.jpg', thumbnail: 'thumb1.jpg', title: '图片 1' }
  ]
})

viewer.open(0)
```

如果想直接修改配置并查看效果，可以使用 [配置实验台](/api/options)。

## 实例方法

### init()

初始化事件绑定，将点击事件绑定到 `.image-grid-item` 元素上。对于框架组件，更推荐自行调用 `open(index)` 控制打开时机。

```typescript
viewer.init()
```

### open(index)

打开指定索引的图片预览。

```typescript
viewer.open(0)
```

**参数：**

- `index: number` - 图片索引，从 `0` 开始。

### close()

关闭图片预览。

```typescript
viewer.close()
```

### addImages(images)

替换当前图片列表。

```typescript
viewer.addImages([
  { src: 'new-image.jpg', thumbnail: 'new-thumb.jpg', title: '新图片' }
])
```

**参数：**

- `images: ViewerItem[]` - 预览项对象数组。

**说明：**

- `addImages()` 只更新内部数据，不会立即创建缩略图请求。
- 首次调用 `open(index)` 后才会渲染缩略图导航。
- 缩略图图片会按需懒加载，优先加载当前索引附近和滚动进入可视区域附近的项目。

### getState()

获取当前的缩放、位移、旋转、索引和图片状态。

```typescript
const state = viewer.getState()
```

**返回值：**

```typescript
{
  scale: number
  translateX: number
  translateY: number
  rotation: number
  index: number
  image: ViewerItem | null
}
```

### onTransform(listener)

订阅变换状态变化事件，返回取消订阅函数。

```typescript
const unsubscribe = viewer.onTransform((state) => {
  console.log('缩放:', state.scale)
})

unsubscribe()
```

**参数：**

- `listener: (state: TransformChangeState) => void` - 监听函数。

**返回值：**

- `() => void` - 取消订阅函数。

### notifyContentReady()

手动通知内容已就绪，常用于自定义渲染场景。

```typescript
viewer.notifyContentReady()
```

### closeLoading()

手动关闭 loading 状态，常用于自定义 loading 或自定义渲染场景。

```typescript
viewer.closeLoading()
```

### showInfoPanel()

打开信息面板。

```typescript
viewer.showInfoPanel()
```

### hideInfoPanel()

关闭信息面板。

```typescript
viewer.hideInfoPanel()
```

### toggleInfo()

切换信息面板显示状态。

```typescript
viewer.toggleInfo()
```

### showThumbnails()

显示缩略图导航。

```typescript
viewer.showThumbnails()
```

### hideThumbnails()

隐藏缩略图导航。

```typescript
viewer.hideThumbnails()
```

### toggleThumbnailNav()

切换缩略图导航显示状态。

```typescript
viewer.toggleThumbnailNav()
```

### setTheme(theme)

设置主题模式。

```typescript
viewer.setTheme('dark')
viewer.setTheme('light')
viewer.setTheme('auto')
```

**参数：**

- `theme: 'dark' | 'light' | 'auto'` - 主题模式。

### getTheme()

获取当前主题模式。

```typescript
const theme = viewer.getTheme()
```

**返回值：**

- `'dark' | 'light' | 'auto'` - 当前主题模式。

### setZoomConfig(config)

设置缩放配置。

```typescript
viewer.setZoomConfig({
  min: 0.5,
  max: 5,
  step: 0.3
})
```

**参数：**

- `config: Partial<ZoomConfig>` - 缩放配置对象，可以只设置部分属性。

### getZoomConfig()

获取当前缩放配置。

```typescript
const config = viewer.getZoomConfig()
```

**返回值：**

- `ZoomConfig` - 当前缩放配置对象。

### destroy()

销毁 ViewerPro 实例，清理事件监听器、滚动锁定和渲染资源。

```typescript
viewer.destroy()
```

## 键盘快捷键

ViewerPro 支持以下键盘快捷键：

- `Escape` - 关闭预览；如果信息面板打开，则先关闭信息面板。
- `` / `` - 切换上一张/下一张。
- `+` / `=` - 放大。
- `-` - 缩小。
- `0` - 重置缩放。
- `f` - 切换全屏。
- `d` - 下载当前图片。

**注意：** 键盘快捷键仅在预览器激活时有效，可通过 `keyboardShortcuts` 关闭。

## 缩略图加载策略

ViewerPro 面向大图集场景做了缩略图加载优化：

- 构造函数和 `addImages()` 只保存数据，不会立即请求全部缩略图。
- 缩略图导航在首次 `open(index)` 后渲染。
- 缩略图图片先保存在 `data-src`，只在当前索引附近或进入缩略图导航可视区域附近时设置真实 `src`。
- 默认会预加载当前索引前后少量缩略图，保证快速切换时的体验。

这只影响缩略图导航的加载行为；当前预览大图仍按当前索引正常加载。

## 下一步

- [配置实验台](/api/options)
- [类型定义](/api/types)
