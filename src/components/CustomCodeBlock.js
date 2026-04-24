import React from 'react';
import { parseCustomUI } from '../utils/parseCustomUI';
import EchartsRenderer from './EchartsRenderer';

/**
 * 自定义代码块渲染组件
 * 用于处理 senclaw-ui-json 标识的自定义 UI 内容
 * @param {Object} props
 * @param {string} props.node - 节点信息
 * @param {string} props.className - 类名
 * @param {string} props.children - 代码内容
 */
const CustomCodeBlock = ({ node, className = '', children, ...props }) => {
  // 提取语言类型
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  // 获取代码内容
  const codeContent = String(children).replace(/\n$/, '');

  // 尝试解析自定义 UI
  const customUIData = parseCustomUI(codeContent);

  if (customUIData) {
    // 根据 type 渲染不同的组件
    switch (customUIData.type) {
      case 'echarts':
        return (
          <div className="senclaw-custom-ui-container">
            <EchartsRenderer 
              option={customUIData.option} 
              className={customUIData.className}
              style={customUIData.style}
            />
          </div>
        );
      
      case 'table':
        return (
          <div className="senclaw-custom-ui-container">
            <CustomTable data={customUIData.data} columns={customUIData.columns} />
          </div>
        );
      
      case 'card':
        return (
          <div className="senclaw-custom-ui-container">
            <CustomCard content={customUIData.content} />
          </div>
        );
      
      default:
        // 未知类型，回退到普通代码块
        break;
    }
  }

  // 非自定义 UI，返回普通代码块
  return (
    <pre {...props} className={`senclaw-code-block ${className}`}>
      <code>{children}</code>
    </pre>
  );
};

/**
 * 自定义表格组件
 */
const CustomTable = ({ data = [], columns = [] }) => {
  if (!data || data.length === 0) {
    return <div className="senclaw-table-empty">暂无数据</div>;
  }

  return (
    <div className="senclaw-table-wrapper">
      <table className="senclaw-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index}>{col.title || col.dataIndex}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, colIndex) => (
                <td key={colIndex}>{row[col.dataIndex]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * 自定义卡片组件
 */
const CustomCard = ({ content = {} }) => {
  const { title, description, imageUrl, footer } = content;

  return (
    <div className="senclaw-card">
      {imageUrl && (
        <div className="senclaw-card-image">
          <img src={imageUrl} alt={title || 'card image'} />
        </div>
      )}
      <div className="senclaw-card-body">
        {title && <h3 className="senclaw-card-title">{title}</h3>}
        {description && <p className="senclaw-card-description">{description}</p>}
      </div>
      {footer && (
        <div className="senclaw-card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default CustomCodeBlock;
