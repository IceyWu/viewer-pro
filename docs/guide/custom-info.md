# 自定义信息面板

通过 `infoRender` 可以自定义信息面板内容。它适合展示图片标题、尺寸、EXIF、位置、业务字段等信息。

## 基础用法

```typescript
const viewer = new ViewerPro({
  images,
  infoRender: (item, index) => {
    const panel = document.createElement('div')
    panel.innerHTML = `
      <div>标题：${item.title || '-'}</div>
      <div>索引：${index + 1}</div>
    `
    return panel
  }
})
```

## 打开和关闭信息面板

```typescript
viewer.showInfoPanel()
viewer.hideInfoPanel()
viewer.toggleInfo()
```

## 事件回调

```typescript
const viewer = new ViewerPro({
  images,
  onInfoPanelOpen: (item, index) => {
    console.log('信息面板打开', item, index)
  },
  onInfoPanelClose: (item, index) => {
    console.log('信息面板关闭', item, index)
  }
})
```

## 相关页面

- [配置实验台](/api/options)
- [ViewerPro API](/api/viewer-pro)
- [类型定义](/api/types)
