/**
 * Node.js 后端流式数据模拟服务
 * 使用 Express + SSE (Server-Sent Events) 模拟 AI 对话流式输出
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(express.json());

// 启用 CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

/**
 * 模拟的 AI 响应数据
 * 包含普通文本和自定义 UI 组件（senclaw-ui-json）
 */
const mockResponses = {
  default: `你好！我是 AI 助手，有什么可以帮助你的吗？

我可以为你生成各种图表，比如这个柱状图：

\`\`\`senclaw-ui-json
{
  "type": "echarts",
  "className": "my-chart",
  "option": {
    "title": { "text": "销售数据统计" },
    "tooltip": {},
    "xAxis": { "data": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] },
    "yAxis": {},
    "series": [{
      "name": "销售额",
      "type": "bar",
      "data": [120, 200, 150, 80, 70, 110, 130],
      "itemStyle": { "color": "#5470c6" }
    }]
  }
}
\`\`\`

或者这个折线图：

\`\`\`senclaw-ui-json
{
  "type": "echarts",
  "option": {
    "title": { "text": "温度变化趋势" },
    "tooltip": { "trigger": "axis" },
    "xAxis": { "type": "category", "data": ["1 月", "2 月", "3 月", "4 月", "5 月", "6 月"] },
    "yAxis": { "type": "value", "name": "温度 (°C)" },
    "series": [{
      "name": "平均温度",
      "type": "line",
      "data": [5, 8, 15, 22, 28, 32],
      "smooth": true,
      "areaStyle": {}
    }]
  }
}
\`\`\`

我还可以展示表格数据：

\`\`\`senclaw-ui-json
{
  "type": "table",
  "columns": [
    { "title": "姓名", "dataIndex": "name" },
    { "title": "年龄", "dataIndex": "age" },
    { "title": "城市", "dataIndex": "city" }
  ],
  "data": [
    { "name": "张三", "age": 28, "city": "北京" },
    { "name": "李四", "age": 32, "city": "上海" },
    { "name": "王五", "age": 25, "city": "广州" }
  ]
}
\`\`\`

有什么想了解的吗？`,

  chart: `\`\`\`senclaw-ui-json
{
  "type": "echarts",
  "option": {
    "title": { "text": "饼图示例", "left": "center" },
    "tooltip": { "trigger": "item" },
    "legend": { "orient": "vertical", "left": "left" },
    "series": [{
      "name": "访问来源",
      "type": "pie",
      "radius": "50%",
      "data": [
        { "value": 1048, "name": "搜索引擎" },
        { "value": 735, "name": "直接访问" },
        { "value": 580, "name": "邮件营销" },
        { "value": 484, "name": "联盟广告" },
        { "value": 300, "name": "视频广告" }
      ],
      "emphasis": {
        "itemStyle": {
          "shadowBlur": 10,
          "shadowOffsetX": 0,
          "shadowColor": "rgba(0, 0, 0, 0.5)"
        }
      }
    }]
  }
}
\`\`\``,

  hello: `你好！欢迎使用 AI 对话系统。

## 功能特性

1. **流式输出** - 内容逐字显示，提升用户体验
2. **Markdown 支持** - 完整的 Markdown 语法渲染
3. **自定义 UI** - 通过 \`senclaw-ui-json\` 标识渲染定制组件
4. **Echarts 图表** - 优先支持丰富的数据可视化

试试对我说："给我一个图表" 或 "展示数据"`,

  data: `这是你要的数据分析：

\`\`\`senclaw-ui-json
{
  "type": "echarts",
  "option": {
    "title": { "text": "月度收入支出对比" },
    "tooltip": { "trigger": "axis", "axisPointer": { "type": "shadow" } },
    "legend": { "data": ["收入", "支出"] },
    "xAxis": { "type": "category", "data": ["1 月", "2 月", "3 月", "4 月", "5 月", "6 月"] },
    "yAxis": { "type": "value", "name": "金额 (元)" },
    "series": [
      {
        "name": "收入",
        "type": "bar",
        "data": [12000, 15000, 18000, 14000, 20000, 22000],
        "itemStyle": { "color": "#91cc75" }
      },
      {
        "name": "支出",
        "type": "bar",
        "data": [8000, 10000, 12000, 9000, 11000, 13000],
        "itemStyle": { "color": "#ee6666" }
      }
    ]
  }
}
\`\`\`

希望这些数据对你有帮助！`
};

/**
 * 根据用户消息选择合适的响应
 */
function getResponseForMessage(message) {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('图表') || lowerMsg.includes('chart') || lowerMsg.includes('graph')) {
    return mockResponses.chart;
  }
  
  if (lowerMsg.includes('数据') || lowerMsg.includes('data') || lowerMsg.includes('分析')) {
    return mockResponses.data;
  }
  
  if (lowerMsg.includes('你好') || lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
    return mockResponses.hello;
  }
  
  return mockResponses.default;
}

/**
 * 将响应文本拆分成小块进行流式传输
 */
function* chunkGenerator(text, chunkSize = 3) {
  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
  }
}

/**
 * 流式聊天接口
 * 使用 SSE (Server-Sent Events) 协议
 */
app.post('/api/chat/stream', async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  console.log(`[Request] User: ${message}`);

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // 获取响应文本
  const responseText = getResponseForMessage(message);
  
  // 模拟打字延迟
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // 流式发送每个字符块
    for (const chunk of chunkGenerator(responseText, 2)) {
      // 检查客户端是否已断开连接
      if (res.writableEnded) {
        console.log('[Stream] Client disconnected');
        break;
      }
      
      // 发送数据块
      res.write(`data: ${chunk}\n\n`);
      
      // 模拟打字效果延迟
      await delay(30 + Math.random() * 20);
    }

    // 发送结束标记
    res.write('data: [DONE]\n\n');
    res.end();
    
    console.log('[Stream] Completed');
    
  } catch (error) {
    console.error('[Stream] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream error' });
    } else {
      res.end();
    }
  }
});

/**
 * 健康检查接口
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * 静态文件服务（用于演示）
 */
app.use(express.static('public'));

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 Stream endpoint: http://localhost:${PORT}/api/chat/stream`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
});
