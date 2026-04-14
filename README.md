# Vue Drawing App

一个高性能、可扩展的地图/图形编辑器，基于 Vue 3 + Vite + Pinia，支持点、线、B样条曲线、文本、区域等多种要素的可视化绘制与编辑。适用于地图标注、工程图、交互式可视化等场景。

---

## 目录结构

```
.
├── public/                  # 静态资源与全局配置
│   └── config.js
├── src/
│   ├── App.vue              # 应用主入口
│   ├── main.js              # Vue 启动文件
│   ├── api/                 # 后端接口相关
│   ├── components/          # 主要 UI 组件
│   │   ├── DrawingCanvas.vue        # 画布渲染与交互核心
│   │   ├── MouseEventHandler.vue    # 鼠标事件处理
│   │   ├── MoveModeHandler.vue      # 元素移动
│   │   ├── AreaHandler.vue          # 区域绘制
│   │   ├── ...                      # 其他 UI 组件
│   ├── composables/         # 复用逻辑（组合式 API）
│   │   ├── mouse/                   # 鼠标相关策略与流程
│   │   ├── canvas/                  # 画布渲染/缓存/状态桥接
│   │   ├── app/                     # App 层逻辑
│   │   ├── ...                      # 其他领域复用逻辑
│   ├── stores/              # Pinia 状态管理
│   │   ├── mapStore.js              # 地图/要素主状态
│   │   ├── layerStore.js            # 图层管理
│   ├── models/              # 类型定义与数据结构
│   │   └── types.js
│   ├── utils/               # 纯工具函数与算法
│   ├── workers/             # Web Worker 相关
│   └── styles/              # 样式
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 技术栈

- **Vue 3** + **Composition API**：现代响应式 UI 框架
- **TypeScript（渐进引入）**：类型检查与开发体验增强
- **Vite**：极速开发与构建工具
- **Pinia**：状态管理
- **HTML5 Canvas**：高性能图形渲染
- **Vitest**：单元测试
- **组合式 composable**：业务逻辑解耦与复用

---

## 主要功能

- 点、线、B样条曲线、文本、区域等多种要素的绘制与编辑
- 支持多选、框选、拖拽、属性面板编辑
- 图层管理与可见性切换
- 撤销/重做（历史记录）
- 高性能大数据量渲染（空间索引、缓存优化）
- 右键菜单、快捷键、工具栏等丰富交互
- 可扩展的工具注册机制（便于后续新增绘图工具）
- 丰富的组合式 API，便于二次开发和单元测试

---

## 代码架构亮点

### 1. 组件解耦
- 核心组件（如 DrawingCanvas、MouseEventHandler）仅负责事件协调，所有业务流程均拆分为 composable，组件本体极简，便于维护和扩展。
- 事件流、渲染流、状态流均通过独立模块解耦，支持横向扩展。

### 2. 状态集中
- 所有要素、图层、历史记录等状态集中在 Pinia store（mapStore、layerStore），便于全局管理和回溯。
- 通过 composable 组合 store 操作，支持多业务场景复用。

### 3. 流程模块化
- 鼠标事件、渲染缓存、命中测试、文本编辑等均有独立策略层，支持单元测试和独立演进。
- 例如：mouseDownToolDispatcher、mouseMoveFlow、selectionEvents、textEditingManager 等。

### 4. 类型注释
- 核心数据结构（Point/Line/BSpline/Text/Area）均有 JSDoc 类型定义，见 [src/models/types.js](src/models/types.js)，便于 IDE 智能提示和团队协作。

### 5. 测试覆盖
- 核心流程均有 Vitest 单元测试，测试文件位于 `src/composables/__tests__/`，保障回归安全。

---

## 主要功能模块

### 组件层
- **App.vue**：应用入口，负责全局状态与事件分发。
- **MapEditorShell.vue**：编辑器主壳，协调工具栏、画布、属性面板等。
- **DrawingCanvas.vue**：核心绘制与交互逻辑，负责元素绘制、缓存、缩放和平移。
- **MouseEventHandler.vue**：鼠标事件处理，已拆分为多层 composable。
- **AreaHandler/MoveModeHandler/AnchorEditHandler**：区域、移动、锚点编辑等子流程。

### 组合式逻辑 (composables)
- **mouse/**：鼠标相关策略（如命中测试、移动流程、文本编辑、选择事件分发）。
- **canvas/**：画布渲染、缓存、状态桥接等。
- **app/**：App 层事件、上传、toast、初始化等。
- **useElementOps/useHistory**：元素操作与历史记录。

### 状态管理 (stores)
- **mapStore.js**：所有元素、选择、历史、IO、对齐等主状态。
- **layerStore.js**：图层增删改查、可见性、分配等。

### 工具与算法 (utils)
- **CanvasRenderer/SpatialGrid/hitTesting**：高性能渲染、空间索引、命中检测等。

### 测试覆盖
- **Vitest 配置**：
  - 测试环境：`jsdom`。
  - 测试文件路径：`src/**/*.test.{js,ts}`。
- **测试文件**：
  - `useCanvasViewState.test.js`：测试画布视图状态的计算与调整。
  - `PerformanceOptimizerV2.test.js`：测试性能优化器的初始化与功能。
  - `mapLoader.test.js`：测试地图加载器的功能。
  - `CoordinateCache.test.js`：测试坐标缓存的基本功能。

---

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```
浏览器访问 [http://localhost:3000](http://localhost:3000)。

### 生产构建

```bash
npm run build
```

### 运行测试

```bash
npx vitest run
```

### 类型检查

```bash
npm run typecheck
```

---

## 代码结构亮点

### 流程模块化
- 鼠标事件、渲染缓存、命中测试、文本编辑等均有独立策略层，支持单元测试和独立演进。
- 示例：`mouseDownToolDispatcher`、`mouseMoveFlow`、`selectionEvents`、`textEditingManager` 等。

### 类型注解
- 核心数据结构（Point/Line/BSpline/Text/Area）均有 JSDoc 类型定义，见 [src/models/types.js](src/models/types.js)，便于 IDE 智能提示和团队协作。

---

## 环境变量配置

### 开发环境
- 使用 `.env.local` 文件配置开发环境变量。

### 生产环境
- 配置文件位于 `public/config.js`，通过 `test-config.html` 验证加载。

---

## 贡献指南

1. 推荐使用 VSCode + Volar 插件获得最佳类型提示体验。
2. 新增业务逻辑请优先写在 composables 目录下，组件只做事件转发和 UI。
3. 新增数据结构请补充 `src/models/types.js` 类型注释。
4. 新增流程请补充 Vitest 单元测试，测试文件放在 `src/composables/__tests__/`。
5. 详细开发规范见 `代码优化方案.md`。

---

## 相关文档

- [API接口文档.md](API接口文档.md)
- [代码优化方案.md](代码优化方案.md)
- [src/models/types.js](src/models/types.js)（核心类型定义）

---

## 常见问题

### Q: 如何新增一种绘图工具？
A: 在 composables/mouse 下新增工具策略，并在工具注册表中注册，UI 侧只需声明工具按钮。

### Q: 如何扩展属性面板？
A: 在 PropertyPanel 组件中按类型拆分属性子面板，属性变更通过事件流回写 store。

### Q: 如何支持大数据量渲染不卡顿？
A: 依赖 SpatialGrid 空间索引、CanvasRenderer 缓存、raf/debounce 节流等机制，详见相关 utils/composables。

---

## 使用场景

### 嵌入其他网页
- 本项目可以作为嵌入式组件集成到其他网页中。
- 提供灵活的 API 和事件回调，便于与宿主应用交互。
- 示例：
  - 在现有的管理系统中嵌入地图编辑功能。
  - 在数据可视化平台中添加绘图工具。
·
### 独立运行
- 项目支持独立部署，作为完整的地图/图形编辑器使用。
- 通过 `npm run build` 生成生产环境代码，可直接部署到服务器。
- 示例：
  - 部署为单页应用，供用户直接访问和使用。
  - 用于内部工具或客户项目的地图标注和编辑。

---

## 许可协议

MIT License
