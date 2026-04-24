/**
 * AI 对话流式内容自定义渲染组件库入口
 * React 16.x.x 版本兼容
 */

// 导出核心组件
export { ChatContainer, CustomCodeBlock, EchartsRenderer } from './components';

// 导出工具函数
export { parseCustomUI, isCustomUI } from './utils';

// 默认导出
export default {
  ChatContainer,
  CustomCodeBlock,
  EchartsRenderer,
  parseCustomUI,
  isCustomUI
};
