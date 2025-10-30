# 安装

## 使用包管理器

::: code-group

```bash [npm]
npm install viewer-pro
```

```bash [pnpm]
pnpm add viewer-pro
```

```bash [yarn]
yarn add viewer-pro
```

:::

## CDN

你也可以通过 CDN 直接在浏览器中使用：

```html
<!-- 引入 JS (CSS 已内联) -->
<script src="https://unpkg.com/viewer-pro/dist/ViewerPro.js"></script>
```

## 从源码构建

如果你想从源码构建 ViewerPro：

```bash
# 克隆仓库
git clone https://github.com/iceywu/viewer-pro.git

# 进入目录
cd viewer-pro

# 安装依赖
pnpm install

# 构建
pnpm build
```

构建产物将输出到 `packages/core/dist` 目录。
