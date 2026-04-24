# AI 对话流式内容自定义渲染组件方案文档

## 1. 项目概述

本项目实现一个支持流式输出的 AI 对话组件，具备以下核心能力：
- 基于 React 16.x.x 构建
- 通过 `react-markdown` 的 components 机制实现自定义组件渲染
- 优先支持渲染 Echarts 图形
- 使用 "senclaw-ui-json" 作为定制 UI 的标识
- 后端使用 Node.js 模拟流式数据输出

## 2. 技术架构

### 2.1 前端技术栈
- **React**: 16.x.x
- **react-markdown**: ^4.3.1 (兼容 React 16)
- **echarts**: ^5.4.0
- **remark-gfm**: ^1.0.0 (支持表格等 GitHub Flavored Markdown)
- **axios**: ^0.21.1 (用于发起流式请求)

### 2.2 后端技术栈
- **Node.js**: v14+ 
- **Express**: ^4.17.1
- **CORS**: ^2.8.5

## 3. 核心设计

### 3.1 自定义 UI 标识格式

使用特殊的 JSON 代码块格式来标识需要自定义渲染的内容：

````markdown
```senclaw-ui-json
{
  "type": "echarts",
  "options": {
    "title": { "text": "销售趋势图" },
    "xAxis": { "type": "category", "data": ["周一", "周二", "周三"] },
    "yAxis": { "type": "value" },
    "series": [{ "type": "line", "data": [120, 200, 150] }]
  }
}
```
````

### 3.2 数据协议

#### 3.2.1 前端识别规则
1. 解析 markdown 中的代码块
2. 当代码块的语言标识为 `senclaw-ui-json` 时，提取其内容
3. 验证内容为合法 JSON
4. 根据 `type` 字段决定渲染方式

#### 3.2.2 支持的组件类型
- `echarts`: 渲染 Echarts 图表
- `table`: 渲染增强表格（未来扩展）
- `card`: 渲染信息卡片（未来扩展）

### 3.3 流式数据处理流程

```
[后端 Node.js] --(SSE/Chunked Stream)--> [前端 Axios] 
                                              ↓
                                      [累积完整响应]
                                              ↓
                                      [react-markdown 解析]
                                              ↓
                                      [自定义 components 渲染]
                                              ↓
                                      [Echarts 等组件展示]
```

## 4. 目录结构

```
/workspace
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatContainer.jsx      # 对话容器组件
│   │   │   ├── MessageBubble.jsx      # 消息气泡组件
│   │   │   ├── CustomCodeBlock.jsx    # 自定义代码块渲染
│   │   │   ├── EchartsRenderer.jsx    # Echarts 渲染器
│   │   │   └── index.js
│   │   ├── utils/
│   │   │   ├── streamFetcher.js       # 流式请求工具
│   │   │   └── jsonParser.js          # JSON 解析工具
│   │   ├── App.jsx
│   │   └── index.js
│   ├── package.json
│   └── public/
│       └── index.html
│
├── backend/                  # 后端模拟服务
│   ├── server.js            # Express 服务器
│   ├── mockData.js          # 模拟数据
│   └── package.json
│
├── docs/                     # 文档
│   └── solution.md          # 本方案文档
│
└── README.md
```

## 5. 详细实现方案

### 5.1 前端核心组件

#### 5.1.1 CustomCodeBlock.jsx
```jsx
import React from 'react';
import EchartsRenderer from './EchartsRenderer';

const CustomCodeBlock = ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  if (language === 'senclaw-ui-json') {
    try {
      const content = String(children).replace(/\n$/, '');
      const config = JSON.parse(content);
      
      if (config.type === 'echarts') {
        return <EchartsRenderer options={config.options} />;
      }
      
      // 其他类型可扩展
      return <pre>{content}</pre>;
    } catch (e) {
      return <pre className="error">JSON 解析失败</pre>;
    }
  }
  
  // 默认代码块渲染
  return <code className={className}>{children}</code>;
};

export default CustomCodeBlock;
```

#### 5.1.2 EchartsRenderer.jsx
```jsx
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const EchartsRenderer = ({ options }) => {
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const chart = echarts.init(containerRef.current);
    chart.setOption(options);
    
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [options]);
  
  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '400px', margin: '20px 0' }}
    />
  );
};

export default EchartsRenderer;
```

#### 5.1.3 ChatContainer.jsx
```jsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import CustomCodeBlock from './CustomCodeBlock';
import { fetchStreamResponse } from '../utils/streamFetcher';

const ChatContainer = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const sendMessage = async (userMessage) => {
    setLoading(true);
    
    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    // 创建 AI 消息占位
    const aiMessageIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    
    // 流式获取响应
    await fetchStreamResponse('/api/chat', { message: userMessage }, (chunk) => {
      setMessages(prev => {
        const updated = [...prev];
        updated[aiMessageIndex].content += chunk;
        return updated;
      });
    });
    
    setLoading(false);
  };
  
  const renderers = {
    code: CustomCodeBlock
  };
  
  return (
    <div className="chat-container">
      {messages.map((msg, idx) => (
        <div key={idx} className={`message ${msg.role}`}>
          <ReactMarkdown components={renderers}>
            {msg.content}
          </ReactMarkdown>
        </div>
      ))}
    </div>
  );
};

export default ChatContainer;
```

### 5.2 后端流式服务

#### 5.2.1 server.js
```javascript
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  
  // 设置 SSE 头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // 模拟流式输出
  const responseParts = [
    '好的，我来为您生成一个销售趋势图表。\n\n',
    '```senclaw-ui-json\n',
    JSON.stringify({
      type: 'echarts',
      options: {
        title: { text: '月度销售趋势' },
        xAxis: { type: 'category', data: ['1 月', '2 月', '3 月', '4 月'] },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: [820, 932, 901, 934] }]
      }
    }),
    '\n```\n\n',
    '以上是本月的销售数据统计。'
  ];
  
  for (const part of responseParts) {
    res.write(`data: ${part}\n\n`);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  res.write('data: [DONE]\n\n');
  res.end();
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
```

### 5.3 流式请求工具

#### 5.3.1 streamFetcher.js
```javascript
import axios from 'axios';

export const fetchStreamResponse = async (url, data, onChunk) => {
  const response = await axios({
    method: 'POST',
    url,
    data,
    responseType: 'stream'
  });
  
  return new Promise((resolve, reject) => {
    let buffer = '';
    
    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const content = line.slice(6);
          if (content === '[DONE]') {
            resolve();
            return;
          }
          buffer += content;
          onChunk(content);
        }
      }
    });
    
    response.data.on('error', reject);
    response.data.on('end', resolve);
  });
};
```

## 6. 使用示例

### 6.1 基本对话
用户发送普通文本消息，AI 返回包含 markdown 格式的回复。

### 6.2 图表渲染
用户请求生成图表时，AI 返回包含 `senclaw-ui-json` 标识的代码块：

```
请帮我画一个柱状图

好的，这是您要的柱状图：

```senclaw-ui-json
{
  "type": "echarts",
  "options": {
    "title": { "text": "产品销量对比" },
    "xAxis": { "data": ["产品 A", "产品 B", "产品 C"] },
    "yAxis": {},
    "series": [{ "type": "bar", "data": [120, 200, 150] }]
  }
}
```
```

前端会自动识别并渲染为交互式 Echarts 图表。

## 7. 扩展性设计

### 7.1 新增组件类型
1. 在 `CustomCodeBlock.jsx` 中添加新的 `type` 判断
2. 创建对应的渲染组件（如 `TableRenderer.jsx`）
3. 更新本文档的"支持的组件类型"列表

### 7.2 样式定制
通过 CSS 变量和 props 传递实现主题定制：
```jsx
<EchartsRenderer 
  options={options} 
  theme="dark"
  height="500px"
/>
```

### 7.3 错误处理
- JSON 解析失败时显示原始代码块
- Echarts 初始化失败时显示错误提示
- 网络中断时提供重试机制

## 8. 兼容性说明

### 8.1 React 16 兼容性
- 使用函数组件 + Hooks（React 16.8+）
- `react-markdown` 选择 4.x 版本（支持 React 16）
- 避免使用 React 17+ 的新特性

### 8.2 浏览器兼容性
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## 9. 性能优化

### 9.1 前端优化
- Echarts 实例复用与销毁管理
- 大文本分片渲染
- 虚拟滚动（消息过多时）

### 9.2 后端优化
- 连接池管理
- 响应压缩
- 缓存常用图表配置

## 10. 测试计划

### 10.1 单元测试
- JSON 解析正确性
- 组件渲染逻辑
- 流式数据拼接

### 10.2 集成测试
- 完整对话流程
- 图表交互功能
- 错误场景处理

### 10.3 性能测试
- 并发连接数
- 大数据量渲染
- 内存泄漏检测

## 11. 部署方案

### 11.1 开发环境
```bash
# 启动后端
cd backend && npm install && npm run dev

# 启动前端
cd frontend && npm install && npm start
```

### 11.2 生产环境
- 前端：构建静态资源，部署到 CDN/Nginx
- 后端：PM2 进程管理，负载均衡

## 12. 后续规划

### Phase 1 (MVP)
- ✅ 基础对话功能
- ✅ Echarts 图表渲染
- ✅ 流式输出支持

### Phase 2
- [ ] 表格组件支持
- [ ] 卡片组件支持
- [ ] 主题切换

### Phase 3
- [ ] 多模态输入（图片、文件）
- [ ] 对话历史管理
- [ ] 导出分享功能

---

**文档版本**: v1.0  
**最后更新**: 2024  
**维护者**: AI Assistant
