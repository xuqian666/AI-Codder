import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import CustomCodeBlock from './CustomCodeBlock';

/**
 * 对话容器组件
 * 支持流式内容渲染和自定义 UI 组件
 * @param {Object} props
 * @param {string} props.streamUrl - 流式数据接口地址
 * @param {Function} props.onMessageReceived - 消息接收回调
 * @param {Function} props.onStreamEnd - 流结束回调
 */
const ChatContainer = ({ 
  streamUrl = '/api/chat/stream', 
  onMessageReceived, 
  onStreamEnd,
  initialMessages = []
}) => {
  const [messages, setMessages] = useState(initialMessages);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // 滚动到底部
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentMessage]);

  /**
   * 发送请求并处理流式响应
   */
  const sendMessage = async (userMessage) => {
    // 添加用户消息
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setCurrentMessage('');
    setIsLoading(true);
    setError(null);

    // 创建 AbortController 用于取消请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantMessage = '';
      let messageId = Date.now() + 1;

      // 先添加一个空的助手消息
      setMessages(prev => [
        ...prev,
        {
          id: messageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString()
        }
      ]);

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        
        // 处理 SSE 格式或普通文本流
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            assistantMessage += data;
          } else if (line.trim()) {
            assistantMessage += line;
          }
        }

        setCurrentMessage(assistantMessage);
        
        // 更新最后一条助手消息
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = assistantMessage;
          }
          return updated;
        });

        if (onMessageReceived) {
          onMessageReceived(assistantMessage);
        }
      }

      // 流结束
      setIsLoading(false);
      if (onStreamEnd) {
        onStreamEnd(assistantMessage);
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Stream error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    }
  };

  /**
   * 取消当前流式请求
   */
  const cancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  /**
   * 自定义 markdown 组件映射
   */
  const components = {
    code: CustomCodeBlock
  };

  /**
   * 渲染消息列表
   */
  const renderMessages = () => {
    return messages.map((msg) => (
      <div
        key={msg.id}
        className={`senclaw-message senclaw-message-${msg.role}`}
      >
        <div className="senclaw-message-avatar">
          {msg.role === 'user' ? '👤' : '🤖'}
        </div>
        <div className="senclaw-message-content">
          <ReactMarkdown components={components}>
            {msg.content}
          </ReactMarkdown>
        </div>
        <div className="senclaw-message-time">
          {new Date(msg.timestamp).toLocaleTimeString()}
        </div>
      </div>
    ));
  };

  return (
    <div className="senclaw-chat-container">
      {/* 消息列表区域 */}
      <div className="senclaw-messages-wrapper">
        {renderMessages()}
        
        {/* 正在输入的消息（流式中） */}
        {currentMessage && !messages.some(m => m.content === currentMessage && m.role === 'assistant') && (
          <div className="senclaw-message senclaw-message-assistant">
            <div className="senclaw-message-avatar">🤖</div>
            <div className="senclaw-message-content">
              <ReactMarkdown components={components}>
                {currentMessage}
              </ReactMarkdown>
            </div>
          </div>
        )}
        
        {/* 加载状态 */}
        {isLoading && (
          <div className="senclaw-loading">
            <span className="senclaw-loading-dot"></span>
            <span className="senclaw-loading-dot"></span>
            <span className="senclaw-loading-dot"></span>
            <button onClick={cancelStream} className="senclaw-cancel-btn">
              停止生成
            </button>
          </div>
        )}
        
        {/* 错误提示 */}
        {error && (
          <div className="senclaw-error">
            <p>发生错误：{error}</p>
            <button onClick={() => setError(null)}>关闭</button>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatContainer;
