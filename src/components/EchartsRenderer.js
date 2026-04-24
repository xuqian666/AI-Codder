import React, { useEffect, useRef } from 'react';

/**
 * Echarts 渲染组件
 * @param {Object} props
 * @param {Object} props.option - Echarts 配置项
 * @param {string} props.className - 自定义类名
 * @param {string} props.style - 自定义样式
 */
const EchartsRenderer = ({ option, className = '', style = {} }) => {
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  let echartsInstance = null;

  useEffect(() => {
    // 动态加载 echarts
    const loadEcharts = async () => {
      try {
        // 尝试从全局获取 echarts（如果已通过 script 标签加载）
        let echarts = window.echarts;
        
        // 如果全局没有，尝试从模块导入（需要构建工具支持）
        if (!echarts && typeof require !== 'undefined') {
          try {
            echarts = require('echarts');
          } catch (e) {
            console.warn('Echarts module not found, please install echarts package');
            return;
          }
        }

        if (!echarts) {
          console.error('Echarts is not available. Please include echarts library.');
          return;
        }

        if (containerRef.current && option) {
          echartsInstance = echarts.init(containerRef.current);
          echartsInstance.setOption(option);

          // 响应式调整
          const handleResize = () => {
            if (echartsInstance) {
              echartsInstance.resize();
            }
          };

          window.addEventListener('resize', handleResize);

          return () => {
            window.removeEventListener('resize', handleResize);
            if (echartsInstance) {
              echartsInstance.dispose();
              echartsInstance = null;
            }
          };
        }
      } catch (error) {
        console.error('Failed to initialize echarts:', error);
      }
    };

    loadEcharts();
  }, [option]);

  const defaultStyle = {
    width: '100%',
    height: '400px',
    ...style
  };

  return (
    <div
      ref={containerRef}
      className={`senclaw-echarts-chart ${className}`}
      style={defaultStyle}
    />
  );
};

export default EchartsRenderer;
