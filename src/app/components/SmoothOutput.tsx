'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';

interface SmoothOutputProps {
  input: string;
  baseSpeed?: number; // 基础速度（字符/秒）
  speedMultiplier?: number; // 速度倍数，根据input长度调整
  onComplete?: () => void; // 输出完成时的回调
  onAppend?: (text: string) => void; // 动态追加内容的回调
  onInterrupt?: () => void; // 中断信号回调
  onChange?: (output: string) => void; // 输出内容变化时的回调
}

export default function SmoothOutput({ 
  input, 
  baseSpeed = 15, // 每秒15个字符
  speedMultiplier = 3, // 最大速度倍数
  onComplete,
  onAppend,
  onInterrupt,
  onChange
}: SmoothOutputProps) {
  const [output, setOutput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullInput, setFullInput] = useState(input); // 完整的输入内容（包括追加的）
  const [isInterrupted, setIsInterrupted] = useState(false); // 中断状态
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  const isAppendingRef = useRef(false); // 标记是否正在追加模式

  // 立即完成输出的函数
  const completeImmediately = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    setOutput(fullInput);
    setCurrentIndex(fullInput.length);
    setIsInterrupted(true);
    if (onChange) {
      onChange(fullInput);
    }
    if (onComplete) {
      onComplete();
    }
  }, [fullInput, onComplete, onChange]);

  // 处理中断信号
  useEffect(() => {
    if (onInterrupt) {
      const handleInterrupt = () => {
        completeImmediately();
        onInterrupt();
      };
      
      // 监听键盘中断信号 (Ctrl+C 或 Escape)
      const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.ctrlKey && event.key === 'c') || event.key === 'Escape') {
          event.preventDefault();
          handleInterrupt();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [onInterrupt, completeImmediately]);

  // 根据fullInput长度计算动态速度：文本越长，输出越快
  const calculateSpeed = useCallback(() => {
    const inputLength = fullInput.length;
    if (inputLength <= 50) {
      // 短文本：保持基础速度
      return baseSpeed;
    } else if (inputLength <= 200) {
      // 中等文本：线性增加速度
      const ratio = (inputLength - 50) / 150; // 0-1之间
      return baseSpeed * (1 + ratio * (speedMultiplier - 1));
    } else {
      // 长文本：使用最大速度
      return baseSpeed * speedMultiplier;
    }
  }, [fullInput.length, baseSpeed, speedMultiplier]);

  // 动画循环
  const animate = useCallback((currentTime: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = currentTime;
    }

    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;
    accumulatedTimeRef.current += deltaTime;

    const currentSpeed = calculateSpeed();
    const intervalMs = 1000 / currentSpeed; // 每个字符的间隔时间

    if (accumulatedTimeRef.current >= intervalMs && currentIndex < fullInput.length) {
      const newOutput = output + fullInput[currentIndex];
      setOutput(newOutput);
      setCurrentIndex(prev => prev + 1);
      accumulatedTimeRef.current = 0;
      
      if (onChange) {
        onChange(newOutput);
      }
    }

    // 继续动画或结束
    if (currentIndex < fullInput.length && !isInterrupted) {
      animationRef.current = requestAnimationFrame(animate);
    } else if (currentIndex >= fullInput.length && onComplete && !isAppendingRef.current && !isInterrupted) {
      onComplete();
    }
  }, [currentIndex, fullInput, calculateSpeed, onComplete]);

  // 处理input变化：区分重置和追加
  useEffect(() => {
    if (input !== fullInput) {
      if (input.length > fullInput.length && input.startsWith(fullInput)) {
        // 动态追加：新内容是当前内容的扩展
        const appendedText = input.slice(fullInput.length);
        setFullInput(input);
        isAppendingRef.current = true;
        
        // 调用onAppend回调
        if (onAppend) {
          onAppend(appendedText);
        }
        
        // 如果当前已经输出完成，重新启动动画
        if (currentIndex >= fullInput.length && !animationRef.current) {
          lastTimeRef.current = 0;
          accumulatedTimeRef.current = 0;
          animationRef.current = requestAnimationFrame(animate);
        }
      } else {
        // 完全重置：新内容与当前不匹配或内容缩短
        setOutput('');
        setCurrentIndex(0);
        setFullInput(input);
        setIsInterrupted(false); // 重置中断状态
        lastTimeRef.current = 0;
        accumulatedTimeRef.current = 0;
        isAppendingRef.current = false;
        
        if (onChange) {
          onChange('');
        }
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      }
    }
  }, [input, fullInput, currentIndex, onAppend, animate]);

  // 启动动画
  useEffect(() => {
    if (fullInput.length > 0 && currentIndex < fullInput.length && !isInterrupted) {
      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, [fullInput, currentIndex, isInterrupted, animate]);

  return (
    <div className="smooth-output">
      <span className="output-text">{output}</span>
      {currentIndex < fullInput.length && (
        <span className="cursor animate-pulse">|</span>
      )}
    </div>
  );
}

// 使用示例组件
export function SmoothOutputDemo() {
  const [inputText, setInputText] = useState('# Hello, World! 🌍\n\n这是一个基于 **requestAnimationFrame** 的自适应速度平滑输出演示。\n\n## 特性\n\n- 文本越长，输出速度越快！\n- 支持 `Markdown` 渲染\n- 实时状态监控\n\n> 💡 **提示**: 试试修改文本内容来体验 Markdown 渲染效果！');
  const [key, setKey] = useState(0);
  const [baseSpeed, setBaseSpeed] = useState(15);
  const [speedMultiplier, setSpeedMultiplier] = useState(3);
  const [appendLog, setAppendLog] = useState<string[]>([]);
  const [interruptLog, setInterruptLog] = useState<string[]>([]);
  const [currentOutput, setCurrentOutput] = useState('');

  const handleRestart = () => {
    setKey(prev => prev + 1);
    setAppendLog([]);
    setInterruptLog([]);
    setCurrentOutput('');
  };

  const handleAppendText = (text: string) => {
    setInputText(prev => prev + text);
  };

  const onAppendCallback = (appendedText: string) => {
    setAppendLog(prev => [...prev, `追加: "${appendedText}"`]);
  };

  const onInterruptCallback = () => {
    setInterruptLog(prev => [...prev, `中断时间: ${new Date().toLocaleTimeString()}`]);
  };

  const onChangeCallback = (output: string) => {
    setCurrentOutput(output);
  };

  // 计算当前速度
  const calculateCurrentSpeed = () => {
    const inputLength = inputText.length;
    if (inputLength <= 50) {
      return baseSpeed;
    } else if (inputLength <= 200) {
      const ratio = (inputLength - 50) / 150;
      return baseSpeed * (1 + ratio * (speedMultiplier - 1));
    } else {
      return baseSpeed * speedMultiplier;
    }
  };

  const currentSpeed = calculateCurrentSpeed();
  const speedCategory = inputText.length <= 50 ? '短文本' : inputText.length <= 200 ? '中等文本' : '长文本';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">基于文本长度的自适应速度输出组件</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            输入文本 (当前长度: {inputText.length} 字符):
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            rows={4}
            placeholder="输入文本，长度会影响输出速度..."
          />
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              基础速度: {baseSpeed} 字符/秒
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={baseSpeed}
              onChange={(e) => setBaseSpeed(Number(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              最大速度倍数: {speedMultiplier}x
            </label>
            <input
              type="range"
              min="1.5"
              max="5"
              step="0.5"
              value={speedMultiplier}
              onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div className="p-3 bg-blue-50 rounded-md">
            <div className="text-sm">
              <div><strong>文本类型:</strong> {speedCategory}</div>
              <div><strong>当前速度:</strong> {currentSpeed.toFixed(1)} 字符/秒</div>
              <div><strong>速度倍数:</strong> {(currentSpeed / baseSpeed).toFixed(1)}x</div>
              <div><strong>输出长度:</strong> {currentOutput.length} / {inputText.length} 字符</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <div>
          <button
            onClick={handleRestart}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 mr-2"
          >
            重新开始
          </button>
          <button
            onClick={() => handleAppendText('\n\n### 动态追加内容\n\n试试输入更长的文本来体验 **速度变化**。')}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 mr-2"
          >
            追加文本1
          </button>
          <button
            onClick={() => handleAppendText('\n\n这是 *动态追加* 的内容，组件会智能识别并继续输出！\n\n```javascript\nconsole.log("Hello Markdown!");\n```')}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 mr-2"
          >
            追加文本2
          </button>
          <button
            onClick={() => {
              // 触发键盘事件来模拟中断
              const event = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true
              });
              document.dispatchEvent(event);
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            中断输出 (ESC)
          </button>
        </div>
        <div>
          <span className="text-sm text-gray-600">
            💡 提示：≤50字符保持基础速度，51-200字符线性加速，&gt;200字符使用最大速度。按ESC或Ctrl+C可中断输出。
          </span>
        </div>
        {appendLog.length > 0 && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="text-sm font-medium text-yellow-800 mb-1">追加日志:</div>
            {appendLog.map((log, index) => (
              <div key={index} className="text-xs text-yellow-700">{log}</div>
            ))}
          </div>
        )}
        {interruptLog.length > 0 && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm font-medium text-red-800 mb-1">中断日志:</div>
            {interruptLog.map((log, index) => (
              <div key={index} className="text-xs text-red-700">{log}</div>
            ))}
          </div>
         )}
        {currentOutput && (
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
            <div className="text-sm font-medium text-green-800 mb-1">实时输出状态 (onChange) - Markdown 渲染:</div>
            <div className="text-xs text-green-700 bg-white p-2 rounded border max-h-32 overflow-y-auto">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: currentOutput ? marked(currentOutput) : '<em>(空)</em>' 
                }}
              />
            </div>
            <div className="text-xs text-green-600 mt-1 border-t pt-1">
              <div>原始文本: <span className="font-mono bg-gray-100 px-1 rounded">{currentOutput || '(空)'}</span></div>
              <div>字符数: {currentOutput.length} | 进度: {inputText.length > 0 ? Math.round((currentOutput.length / inputText.length) * 100) : 0}%</div>
            </div>
          </div>
        )}
        </div>

      <div className="p-4 bg-gray-100 rounded-md min-h-[120px]">
        <h3 className="text-lg font-semibold mb-2">输出:</h3>
        <SmoothOutput 
          key={key}
          input={inputText}
          baseSpeed={baseSpeed}
          speedMultiplier={speedMultiplier}
          onComplete={() => console.log('输出完成!')}
          onAppend={onAppendCallback}
          onInterrupt={onInterruptCallback}
          onChange={onChangeCallback}
        />
      </div>
    </div>
  );
}