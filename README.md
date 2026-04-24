# AI 对话流式内容自定义渲染组件

基于 React 16.x.x 的 AI 对话流式组件，支持通过 `react-markdown` 的 components 机制实现定制组件渲染，优先支持 Echarts 图形可视化。

## ✨ 特性

- **React 16.x.x 兼容** - 完全兼容 React 16 版本
- **流式内容渲染** - 支持 SSE (Server-Sent Events) 流式数据传输
- **自定义 UI 标识** - 使用 `senclaw-ui-json` 作为定制 UI 的标识
- **Echarts 图表** - 优先支持丰富的数据可视化图表
- **Markdown 支持** - 完整的 Markdown 语法渲染
- **可扩展架构** - 轻松添加新的自定义组件类型

## 📦 安装依赖

```bash
npm install
```

## 🚀 快速开始

### 1. 启动后端服务

```bash
npm start
```

后端服务将在 `http://localhost:3001` 启动

### 2. 打开演示页面

在浏览器中访问 `public/index.html` 文件，或使用本地服务器：

```bash
# 使用 Python 简单服务器
cd public
python -m http.server 8080

# 然后访问 http://localhost:8080
```

## 📁 项目结构

```
/workspace
├── docs/
│   └── solution.md          # 方案文档
├── src/
│   ├── components/
│   │   ├── index.js         # 组件导出入口
│   │   ├── ChatContainer.js # 对话容器组件
│   │   ├── CustomCodeBlock.js # 自定义代码块组件
│   │   └── EchartsRenderer.js # Echarts 渲染组件
│   ├── utils/
│   │   ├── index.js         # 工具函数导出
│   │   └── parseCustomUI.js # 自定义 UI 解析工具
│   └── index.js             # 库入口文件
├── server/
│   └── index.js             # Node.js 流式模拟服务
├── public/
│   └── index.html           # 演示页面
├── package.json
└── README.md
```

## 🔧 核心组件

### ChatContainer

对话容器组件，负责管理消息列表和处理流式数据。

```jsx
import { ChatContainer } from './src/components';

function App() {
  return (
    <ChatContainer 
      streamUrl="http://localhost:3001/api/chat/stream"
      onMessageReceived={(msg) => console.log('收到消息:', msg)}
      onStreamEnd={(msg) => console.log('流结束:', msg)}
    />
  );
}
```

### CustomCodeBlock

自定义代码块组件，自动识别并渲染 `senclaw-ui-json` 标识的内容。

### EchartsRenderer

Echarts 图表渲染组件，支持各种类型的图表配置。

## 📝 自定义 UI 格式

使用 `senclaw-ui-json` 作为代码块语言标识，后跟 JSON 配置：

### Echarts 图表

````markdown
```senclaw-ui-json
{
  "type": "echarts",
  "option": {
    "title": { "text": "销售数据统计" },
    "xAxis": { "data": ["周一", "周二", "周三"] },
    "yAxis": {},
    "series": [{
      "type": "bar",
      "data": [120, 200, 150]
    }]
  }
}
```
````

### 表格数据

````markdown
```senclaw-ui-json
{
  "type": "table",
  "columns": [
    { "title": "姓名", "dataIndex": "name" },
    { "title": "年龄", "dataIndex": "age" }
  ],
  "data": [
    { "name": "张三", "age": 28 },
    { "name": "李四", "age": 32 }
  ]
}
```
````

### 卡片组件

````markdown
```senclaw-ui-json
{
  "type": "card",
  "content": {
    "title": "卡片标题",
    "description": "卡片描述内容",
    "imageUrl": "https://example.com/image.jpg"
  }
}
```
````

## 🌐 API 接口

### POST /api/chat/stream

流式聊天接口，使用 SSE 协议。

**请求体：**
```json
{
  "message": "你好"
}
```

**响应格式：**
```
data: 你
data: 好
data: ！
data: [DONE]
```

### GET /api/health

健康检查接口。

## 🎨 样式定制

所有组件都提供了 CSS 类名前缀 `senclaw-`，可以通过覆盖以下类来自定义样式：

- `.senclaw-chat-container` - 聊天容器
- `.senclaw-message` - 消息气泡
- `.senclaw-message-user` - 用户消息
- `.senclaw-message-assistant` - 助手消息
- `.senclaw-custom-ui-container` - 自定义 UI 容器
- `.senclaw-echarts-chart` - Echarts 图表
- `.senclaw-table` - 表格
- `.senclaw-card` - 卡片

## 🔌 扩展新组件

1. 在 `CustomCodeBlock.js` 中添加新的 case 分支
2. 创建对应的渲染组件
3. 在 `parseCustomUI.js` 中添加验证逻辑（如需要）

```javascript
// CustomCodeBlock.js
switch (customUIData.type) {
  case 'new-component':
    return <NewComponent data={customUIData.data} />;
  // ...
}
```

## 📋 测试示例

访问演示页面后，尝试发送以下消息：

- **"你好"** - 查看欢迎消息和功能介绍
- **"给我一个图表"** - 查看饼图示例
- **"展示数据"** - 查看柱状图对比分析
- **任意其他消息** - 查看包含多种图表的综合回复

## 📄 License

MIT
