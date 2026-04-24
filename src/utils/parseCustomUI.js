/**
 * 解析 senclaw-ui-json 标识的自定义 UI 数据
 * @param {string} code - 代码块内容
 * @returns {object|null} - 解析后的对象或 null
 */
export function parseCustomUI(code) {
  if (!code || typeof code !== 'string') {
    return null;
  }

  const trimmedCode = code.trim();
  
  // 检查是否以 senclaw-ui-json 开头
  if (!trimmedCode.startsWith('senclaw-ui-json')) {
    return null;
  }

  try {
    // 提取 JSON 部分（去掉开头的标识）
    const jsonStartIndex = trimmedCode.indexOf('{');
    if (jsonStartIndex === -1) {
      return null;
    }

    const jsonString = trimmedCode.substring(jsonStartIndex);
    const parsed = JSON.parse(jsonString);

    // 验证必要字段
    if (parsed && parsed.type) {
      return parsed;
    }

    return null;
  } catch (error) {
    console.warn('Failed to parse custom UI JSON:', error.message);
    return null;
  }
}

/**
 * 判断是否为自定义 UI 代码块
 * @param {string} code - 代码块内容
 * @returns {boolean}
 */
export function isCustomUI(code) {
  return parseCustomUI(code) !== null;
}
