# AI 对话流式内容自定义渲染组件 - 测试计划

## 1. 测试目标

确保 AI 对话组件在流式数据传输、自定义 UI 标识解析、Echarts 图表渲染等核心功能上的正确性、稳定性和性能。

## 2. 测试范围

| 模块 | 测试类型 | 优先级 |
|------|----------|--------|
| parseCustomUI 解析器 | 单元测试 | P0 |
| EchartsRenderer 渲染器 | 单元测试 | P0 |
| CustomCodeBlock 组件 | 单元测试 | P1 |
| 流式数据累积逻辑 | 集成测试 | P0 |
| Markdown 与自定义组件混排 | 集成测试 | P1 |
| 端到端聊天流程 | E2E 测试 | P0 |
| 性能基准测试 | 性能测试 | P2 |
| 浏览器兼容性 | 兼容性测试 | P2 |

## 3. 单元测试策略

### 3.1 parseCustomUI 解析器测试

**文件**: `tests/unit/parseCustomUI.test.js`

```javascript
const parseCustomUI = require('../../src/utils/parseCustomUI');

describe('parseCustomUI', () => {
  test('应该正确解析有效的 senclaw-ui-json echarts 配置', () => {
    const input = '```senclaw-ui-json\n{"type": "echarts", "option": {"xAxis": {"type": "category"}}}\n```';
    const result = parseCustomUI(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('echarts');
    expect(result[0].option).toEqual({ xAxis: { type: 'category' } });
  });

  test('应该处理单个文本中的多个自定义块', () => {
    const input = `
      一些文本
      \`\`\`senclaw-ui-json
      {"type": "echarts", "option": {}}
      \`\`\`
      更多文本
      \`\`\`senclaw-ui-json
      {"type": "table", "data": []}
      \`\`\`
    `;
    const result = parseCustomUI(input);
    
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('echarts');
    expect(result[1].type).toBe('table');
  });

  test('对于不匹配的文本应返回空数组', () => {
    const input = '只是普通的 markdown 内容';
    const result = parseCustomUI(input);
    expect(result).toHaveLength(0);
  });

  test('应该优雅地处理无效 JSON', () => {
    const input = '```senclaw-ui-json\n{invalid json}\n```';
    expect(() => parseCustomUI(input)).not.toThrow();
  });

  test('边界情况：空代码块', () => {
    const input = '```senclaw-ui-json\n```\n```';
    const result = parseCustomUI(input);
    expect(result).toHaveLength(0); // 或根据实现返回特定错误
  });

  test('边界情况：嵌套 JSON 对象', () => {
    const complexJson = '{"type": "echarts", "option": {"series": [{"data": [{"value": 1}]}]}}';
    const input = `\`\`\`senclaw-ui-json\n${complexJson}\n\`\`\``;
    const result = parseCustomUI(input);
    expect(result).toHaveLength(1);
    expect(result[0].option.series).toBeDefined();
  });
});
```

### 3.2 EchartsRenderer 渲染器测试

**文件**: `tests/unit/EchartsRenderer.test.js`

```javascript
import React from 'react';
import { render } from '@testing-library/react';
import EchartsRenderer from '../../src/components/EchartsRenderer';

// Mock echarts
jest.mock('echarts', () => ({
  init: jest.fn(() => ({
    setOption: jest.fn(),
    resize: jest.fn(),
    dispose: jest.fn(),
  })),
}));

describe('EchartsRenderer', () => {
  const mockOption = {
    title: { text: '测试图表' },
    xAxis: { type: 'category', data: ['A', 'B'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [1, 2] }]
  };

  test('应该渲染容器 div', () => {
    const { container } = render(<EchartsRenderer option={mockOption} />);
    expect(container.querySelector('.echarts-container')).toBeInTheDocument();
  });

  test('应该优雅地处理缺失的 option', () => {
    const { container } = render(<EchartsRenderer option={null} />);
    expect(container.textContent).toContain('暂无图表数据');
  });

  test('如果提供自定义高度，应该应用', () => {
    const { container } = render(<EchartsRenderer option={mockOption} height="400px" />);
    const chartDiv = container.querySelector('.echarts-container');
    expect(chartDiv.style.height).toBe('400px');
  });

  test('应该在卸载时清理 echarts 实例', () => {
    const { unmount } = render(<EchartsRenderer option={mockOption} />);
    unmount();
    // 验证 dispose 被调用（需要 spy）
  });
});
```

### 3.3 CustomCodeBlock 组件测试

**文件**: `tests/unit/CustomCodeBlock.test.js`

```javascript
import React from 'react';
import { render } from '@testing-library/react';
import CustomCodeBlock from '../../src/components/CustomCodeBlock';

jest.mock('../EchartsRenderer', () => {
  return function MockEchartsRenderer({ option }) {
    return <div data-testid="mock-echarts">{JSON.stringify(option)}</div>;
  };
});

describe('CustomCodeBlock', () => {
  test('应该渲染普通代码块当语言不是 senclaw-ui-json', () => {
    const props = {
      node: {},
      inline: false,
      className: 'language-javascript',
      children: 'console.log("hello")'
    };
    const { container } = render(<CustomCodeBlock {...props} />);
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  test('应该渲染 EchartsRenderer 当识别到 echarts 类型', () => {
    const codeContent = JSON.stringify({
      type: 'echarts',
      option: { title: { text: 'Test' } }
    });
    
    const props = {
      node: {},
      inline: false,
      className: 'language-senclaw-ui-json',
      children: codeContent
    };
    
    const { getByTestId } = render(<CustomCodeBlock {...props} />);
    expect(getByTestId('mock-echarts')).toBeInTheDocument();
  });
});
```

## 4. 集成测试

### 4.1 流式数据累积模拟

**文件**: `tests/integration/streamSimulator.test.js`

```javascript
const parseCustomUI = require('../../src/utils/parseCustomUI');

describe('流式数据集成', () => {
  test('应该累积分片直到形成完整的代码块', () => {
    const chunks = [
      '```senclaw-ui-',
      'json\n{"type": "',
      'echarts", "opt',
      'ion": {}}\n```'
    ];
    
    let accumulated = '';
    let parsedResults = [];

    chunks.forEach(chunk => {
      accumulated += chunk;
      const result = parseCustomUI(accumulated);
      if (result.length > 0) {
        parsedResults = result;
      }
    });

    expect(parsedResults).toHaveLength(1);
    expect(parsedResults[0].type).toBe('echarts');
  });

  test('应该处理混合 markdown 和自定义 UI 流', () => {
    const streamContent = `这是分析结果:\n\n` +
      `\`\`\`senclaw-ui-json\n{"type": "echarts", "option": {}}\n\`\`\``;
    
    const result = parseCustomUI(streamContent);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('echarts');
  });

  test('在流结束时不应因不完整 JSON 而崩溃', () => {
    const incompleteStream = '```senclaw-ui-json\n{"type": "echarts"';
    expect(() => parseCustomUI(incompleteStream)).not.toThrow();
  });

  test('应该处理多个连续流式块', () => {
    const chunks = [
      '```senclaw-ui-json\n{"type": "echarts"}\n```\n',
      '一些中间文本\n',
      '```senclaw-ui-json\n{"type": "table"}\n```'
    ];
    
    const fullContent = chunks.join('');
    const result = parseCustomUI(fullContent);
    expect(result).toHaveLength(2);
  });
});
```

### 4.2 React 组件集成测试

**文件**: `tests/integration/ChatContainer.test.js`

```javascript
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import ChatContainer from '../../src/components/ChatContainer';

// Mock EventSource 用于 SSE
global.EventSource = class MockEventSource {
  constructor(url) {
    this.url = url;
    setTimeout(() => this.onmessage?.({ 
      data: '{"content": "```senclaw-ui-json\\n{\\"type\\": \\"echarts\\"}\\n```"}' 
    }), 100);
  }
  addEventListener() {}
  removeEventListener() {}
  close() {}
};

describe('ChatContainer 集成', () => {
  test('应该处理流式消息并渲染自定义组件', async () => {
    const { container } = render(
      <ChatContainer endpoint="http://localhost:3000/stream" />
    );
    
    await waitFor(() => {
      expect(container.querySelector('.echarts-container')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
```

## 5. 端到端 (E2E) 测试

### 5.1 完整聊天流程

**文件**: `tests/e2e/chatFlow.test.js`

```javascript
const puppeteer = require('puppeteer');

describe('E2E 聊天流程', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
  }, 30000);

  afterAll(async () => {
    if (browser) await browser.close();
  });

  test('应该加载聊天界面', async () => {
    const title = await page.$eval('h1', el => el.innerText);
    expect(title).toContain('AI Dialogue');
  });

  test('应该发送消息并接收带 Echarts 的流式响应', async () => {
    const inputSelector = 'textarea, input[type="text"]';
    await page.waitForSelector(inputSelector);
    await page.type(inputSelector, 'show me a chart');
    
    const sendBtn = await page.$('button');
    if (sendBtn) await sendBtn.click();

    // 等待流式内容出现
    await page.waitForSelector('.echarts-container', { timeout: 10000 });

    // 验证图表已渲染
    const canvasExists = await page.$('.echarts-container canvas');
    expect(canvasExists).toBeTruthy();
  }, 15000);

  test('应该处理 markdown 文本与自定义组件并存', async () => {
    const inputSelector = 'textarea, input[type="text"]';
    await page.type(inputSelector, 'hello');
    const sendBtn = await page.$('button');
    if (sendBtn) await sendBtn.click();

    await page.waitForSelector('.markdown-body, .react-markdown', { timeout: 5000 });
    
    const content = await page.$eval('.chat-messages', el => el.innerText);
    expect(content.length).toBeGreaterThan(0);
  }, 10000);

  test('网络中断后应该能够恢复', async () => {
    await page.setOfflineMode(true);
    await page.setOfflineMode(false);
    // 验证 UI 恢复正常
    const isInteractive = await page.evaluate(() => {
      const input = document.querySelector('textarea');
      return input && !input.disabled;
    });
    expect(isInteractive).toBe(true);
  });
});
```

## 6. 性能测试

### 6.1 长文本流式传输性能

```javascript
describe('性能基准', () => {
  test('应该在 2 秒内渲染 10KB 流式文本', async () => {
    const longText = 'a'.repeat(10240); // 10KB
    const startTime = performance.now();
    
    // 模拟流式接收
    const result = parseCustomUI(longText);
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(2000);
  });

  test('应该流畅渲染大数据量图表配置', () => {
    const largeOption = {
      series: Array.from({ length: 100 }, (_, i) => ({
        type: 'line',
        data: Array.from({ length: 1000 }, () => Math.random())
      }))
    };
    
    const startMem = process.memoryUsage().heapUsed;
    const result = parseCustomUI(
      `\`\`\`senclaw-ui-json\n${JSON.stringify({ type: 'echarts', option: largeOption })}\n\`\`\``
    );
    const endMem = process.memoryUsage().heapUsed;
    
    // 内存增长不应超过 50MB
    expect((endMem - startMem) / 1024 / 1024).toBeLessThan(50);
  });
});
```

### 6.2 帧率测试 (E2E)

```javascript
test('图表动画应该保持 60fps', async () => {
  await page.waitForSelector('.echarts-container');
  
  const fps = await page.evaluate(() => {
    return new Promise(resolve => {
      let frames = 0;
      let startTime = performance.now();
      
      function countFrames() {
        frames++;
        if (performance.now() - startTime >= 1000) {
          resolve(frames);
        } else {
          requestAnimationFrame(countFrames);
        }
      }
      countFrames();
    });
  });
  
  expect(fps).toBeGreaterThan(50); // 允许轻微波动
});
```

## 7. 兼容性测试矩阵

| 浏览器 | 版本 | 操作系统 | 状态 |
|--------|------|----------|------|
| Chrome | 最新版 | Windows 10/11 | ✅ 待测 |
| Chrome | 最新版 | macOS | ✅ 待测 |
| Firefox | 最新版 | Windows 10/11 | ✅ 待测 |
| Safari | 最新版 | macOS | ✅ 待测 |
| Edge | 最新版 | Windows 10/11 | ✅ 待测 |

| React 版本 | 状态 |
|------------|------|
| 16.8.0 | ✅ 待测 |
| 16.14.0 | ✅ 待测 |

## 8. 自动化测试脚本

### 8.1 Jest 配置

**文件**: `jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  moduleFileExtensions: ['js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
```

### 8.2 测试设置

**文件**: `tests/setup.js`

```javascript
import { configure } from '@testing-library/react';

configure({ testIdAttribute: 'data-testid' });

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

### 8.3 package.json 脚本

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "jest --config jest.e2e.config.js"
  }
}
```

## 9. 手动测试清单

### 9.1 功能测试

- [ ] 发送普通文本消息，验证正常显示
- [ ] 发送触发 echarts 的关键词，验证图表渲染
- [ ] 发送触发表格的关键词，验证表格渲染
- [ ] 验证流式打字机效果流畅
- [ ] 验证 Markdown 语法高亮正常
- [ ] 验证代码块复制功能

### 9.2 异常场景

- [ ] 网络断开后重新连接
- [ ] 后端返回错误格式数据
- [ ] 超大 JSON 配置（>1MB）
- [ ] 恶意 XSS 注入尝试
- [ ] 快速连续发送多条消息

### 9.3 UI/UX 测试

- [ ] 响应式布局在不同屏幕尺寸下正常
- [ ] 深色/浅色模式切换
- [ ] 滚动条行为正确
- [ ] 加载状态指示器显示
- [ ] 错误提示友好

## 10. 持续集成 (CI) 配置

### GitHub Actions 示例

**文件**: `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run unit tests
      run: npm test
      
    - name: Run E2E tests
      run: npm run test:e2e
      
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

## 11. 测试结果记录模板

### 测试执行摘要

| 日期 | 测试类型 | 通过数 | 失败数 | 阻塞数 | 执行人 |
|------|----------|--------|--------|--------|--------|
| YYYY-MM-DD | 单元测试 | 0/0 | 0 | 0 | - |
| YYYY-MM-DD | 集成测试 | 0/0 | 0 | 0 | - |
| YYYY-MM-DD | E2E 测试 | 0/0 | 0 | 0 | - |

### 缺陷跟踪

| ID | 严重程度 | 描述 | 状态 | 负责人 |
|----|----------|------|------|--------|
| BUG-001 | High | - | Open | - |

---

## 运行测试

### 前置要求

确保已安装以下依赖：

```bash
npm install --save-dev jest@29 @testing-library/react@12 @testing-library/jest-dom babel-jest identity-obj-proxy jsdom puppeteer --legacy-peer-deps
```

> **注意**: 本项目使用 React 16.x，因此 `@testing-library/react` 需使用版本 12（与 React 16 兼容的最新版本）。

### 测试命令

```bash
# 运行所有单元测试和集成测试
npm test

# 监听模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行端到端测试（需先启动服务）
npm run test:e2e
```

### E2E 测试前置条件

运行 E2E 测试前，请确保：
1. 前端服务运行在 `http://localhost:8080`
2. 后端流式服务运行在 `http://localhost:3000`

```bash
# 终端 1: 启动前端
npx serve public -p 8080

# 终端 2: 启动后端
npm start
```

---

## 轻量级验证（无依赖）

如果无法安装完整测试依赖，可使用以下 Node.js 脚本进行基础验证：

```bash
node tests/validate-basic.js
```

该脚本将验证：
- parseCustomUI 解析基本功能
- JSON 格式有效性检查
- 边界情况处理
