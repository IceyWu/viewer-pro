# ViewerPro

ViewerPro 是核心类，提供图片预览的所有功能。

## 构造函数

```typescript
new ViewerPro(options?: ViewerProOptions)
```

### 参数

- `options` - 可选的配置对象

### 示例

```typescript
import { ViewerPro } from 'viewer-pro'

const viewer = new ViewerPro({
  images: [
    { src: 'image1.jpg', thumbnail: 'thumb1.jpg', title: '图片1' }
  ]
})
```

## 实例方法

### init()

初始化事件绑定，将点击事件绑定到 `.image-grid-item` 元素上。

```typescript
viewer.init()
```

### open(index)

打开指定索引的图片预览。

```typescript
viewer.open(0) // 打开第一张图片
```

**参数:**
- `index: number` - 图片索引（从 0 开始）

### close()

关闭图片预览。

```typescript
viewer.close()
```

### addImages(images)

添加或更新图片列表。

```typescript
viewer.addImages([
  { src: 'new-image.jpg', thumbnail: 'new-thumb.jpg', title: '新图片' }
])
```

**参数:**
- `images: ViewerItem[]` - 预览项对象数组

### getState()

获取当前的缩放、位移和旋转状态。

```typescript
const state = viewer.getState()
// {
//   scale: 1.5,
//   translateX: 100,
//   translateY: 50,
//   rotation: 90,
//   index: 0,
//   image: { ... }
// }
```

**返回值:**
```typescript
{
  scale: number          // 缩放比例
  translateX: number     // X 轴位移
  translateY: number     // Y 轴位移
  rotation: number       // 旋转角度（度）
  index: number          // 当前索引
  image: ViewerItem | null  // 当前图片对象
}
```

### onTransform(listener)

订阅变换状态变化事件。

```typescript
const unsubscribe = viewer.onTransform((state) => {
  console.log('缩放:', state.scale)
})

// 取消订阅
unsubscribe()
```

**参数:**
- `listener: (state) => void` - 监听函数

**返回值:**
- `() => void` - 取消订阅函数

### notifyContentReady()

手动通知内容已就绪（用于自定义渲染场景）。

```typescript
viewer.notifyContentReady()
```

### closeLoading()

手动关闭 loading 状态。

```typescript
viewer.closeLoading()
```

### destroy()

销毁 ViewerPro 实例，清理所有事件监听器和资源。

```typescript
viewer.destroy()
```

### setTheme(theme)

设置主题模式。

```typescript
viewer.setTheme('dark')   // 深色主题
viewer.setTheme('light')  // 浅色主题
viewer.setTheme('auto')   // 自动主题
```

**参数:**
- `theme: 'dark' | 'light' | 'auto'` - 主题模式

**说明:**
- `dark` - 深色主题，适合暗光环境
- `light` - 浅色主题，适合明亮环境
- `auto` - 自动根据系统设置切换

### getTheme()

获取当前的主题模式。

```typescript
const theme = viewer.getTheme()
console.log('当前主题:', theme) // 'dark' | 'light' | 'auto'
```

**返回值:**
- `'dark' | 'light' | 'auto'` - 当前主题模式

### setZoomConfig(config)

设置缩放配置。

```typescript
viewer.setZoomConfig({
  min: 0.5,
  max: 5,
  step: 0.3
})
```

**参数:**
- `config: Partial<ZoomConfig>` - 缩放配置对象（可以只设置部分属性）

**示例:**

```typescript
// 只修改最大缩放比例
viewer.setZoomConfig({ max: 5 })

// 修改滚轮缩放配置
viewer.setZoomConfig({
  wheelBaseStep: 0.2,
  wheelMaxStep: 0.4
})
```

### getZoomConfig()

获取当前的缩放配置。

```typescript
const config = viewer.getZoomConfig()
console.log('缩放配置:', config)
// {
//   min: 0.5,
//   max: 3,
//   step: 0.2,
//   wheelBaseStep: 0.15,
//   wheelMaxStep: 0.3,
//   wheelSpeedMultiplier: 0.01
// }
```

**返回值:**
- `ZoomConfig` - 当前的缩放配置对象

## 键盘快捷键

ViewerPro 支持以下键盘快捷键：

- `Escape` - 关闭预览（如果信息面板打开，则先关闭信息面板）
- `←` / `→` - 切换上一张/下一张
- `+` / `=` - 放大
- `-` - 缩小
- `0` - 重置缩放（1:1）
- `f` - 切换全屏
- `d` - 下载当前图片

**注意:** 键盘快捷键仅在预览器激活时有效。

## 下一步

- [查看类型定义](/api/types)
- [查看使用示例](/guide/examples)
