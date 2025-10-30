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

获取当前的缩放和位移状态。

```typescript
const state = viewer.getState()
// {
//   scale: 1.5,
//   translateX: 100,
//   translateY: 50,
//   index: 0,
//   image: { ... }
// }
```

**返回值:**
```typescript
{
  scale: number
  translateX: number
  translateY: number
  index: number
  image: ViewerItem | null
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

## 键盘快捷键

ViewerPro 支持以下键盘快捷键：

- `Escape` - 关闭预览
- `←` / `→` - 切换上一张/下一张
- `+` / `-` - 放大/缩小
- `0` - 重置缩放
- `f` - 切换全屏
- `d` - 下载当前图片

## 下一步

- [查看类型定义](/api/types)
- [查看使用示例](/guide/examples)
