import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Trophy, Clock, Star, X } from 'lucide-react';

/**
 * 九九乘法地鼠挑戰 - 整合版
 * * 此檔案包含所有遊戲邏輯、狀態管理與介面組件。
 * 遵循單一檔案規範，確保在開發環境中能正確執行。
 */

// 定義排行榜資料類型
interface ScoreEntry {
  score: number;
  date: string;
}

export default function App() {
  // --- 遊戲狀態管理 ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [activeMole, setActiveMole] = useState<{ index: number; q: string; ans: number } | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);

  // --- Refs 與引用 ---
  const moleTimerRef = useRef<any>(null);
  const gameTimerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scoreRef = useRef(0);

  // 初始化讀取在地紀錄 (LocalStorage)
  useEffect(() => {
    const saved = localStorage.getItem('whack-a-mole-leaderboard');
    if (saved) {
      try {
        setLeaderboard(JSON.parse(saved));
      } catch (e) {
        console.error("無法載入排行榜資料");
      }
    }
  }, []);

  // 儲存分數到排行榜
  const saveScore = (newScore: number) => {
    const newEntry = { score: newScore, date: new Date().toLocaleDateString() };
    setLeaderboard(prev => {
      const newLeaderboard = [...prev, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      localStorage.setItem('whack-a-mole-leaderboard', JSON.stringify(newLeaderboard));
      return newLeaderboard;
    });
  };

  // 播放音效函數 (使用 Web Audio API)
  const playSound = useCallback((type: 'correct' | 'wrong' | 'gameover') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  }, []);

  // 隨機產生題目與地鼠位置
  const spawnMole = useCallback(() => {
    if (moleTimerRef.current) clearTimeout(moleTimerRef.current);
    setFeedback(null);

    const index = Math.floor(Math.random() * 6);
    const num1 = Math.floor(Math.random() * 8) + 2; 
    const num2 = Math.floor(Math.random() * 8) + 2; 
    const ans = num1 * num2;
    
    const opts = new Set<number>();
    opts.add(ans);
    while (opts.size < 3) {
      const offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const wrongAns = ans + offset;
      if (wrongAns > 0 && wrongAns !== ans) opts.add(wrongAns);
    }

    setActiveMole({ index, q: `${num1} × ${num2}`, ans });
    setOptions(Array.from(opts).sort(() => Math.random() - 0.5));

    // 地鼠停留時間
    moleTimerRef.current = setTimeout(() => {
      setActiveMole(null);
      moleTimerRef.current = setTimeout(spawnMole, 600);
    }, 2000);
  }, []);

  // 遊戲開始
  const startGame = () => {
    setIsPlaying(true);
    setTimeLeft(30);
    setScore(0);
    scoreRef.current = 0;
    setShowModal(false);
    spawnMole();
    
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    gameTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 遊戲結束
  const endGame = () => {
    setIsPlaying(false);
    setActiveMole(null);
    setShowModal(true);
    saveScore(scoreRef.current);
    clearInterval(gameTimerRef.current);
    clearTimeout(moleTimerRef.current);
    playSound('gameover' as any); // 雖然只寫了兩種類型，這裡可以擴充
  };

  // 檢查答案
  const handleAnswer = (selected: number) => {
    if (!activeMole || !isPlaying) return;

    if (selected === activeMole.ans) {
      setScore(s => { scoreRef.current = s + 10; return s + 10; });
      setFeedback('correct');
      playSound('correct');
      setActiveMole(null);
      spawnMole();
    } else {
      setScore(s => { scoreRef.current = Math.max(0, s - 5); return Math.max(0, s - 5); });
      setFeedback('wrong');
      playSound('wrong');
    }
  };

  useEffect(() => {
    return () => {
      clearInterval(gameTimerRef.current);
      clearTimeout(moleTimerRef.current);
    };
  }, []);

  return (
    <div className="h-screen w-full bg-green-600 flex flex-col items-center justify-center p-4 font-sans text-white overflow-hidden select-none">
      <h1 className="text-4xl md:text-5xl font-black mb-6 drop-shadow-lg tracking-wider">
        九九乘法 <span className="text-yellow-300">地鼠王</span>
      </h1>
      
      <div className={`bg-black/20 p-6 md:p-8 rounded-[2.5rem] w-full max-w-2xl flex flex-col items-center gap-6 transition-all duration-300 ${
        feedback === 'correct' ? 'ring-8 ring-green-400' : 
        feedback === 'wrong' ? 'ring-8 ring-red-400' : ''
      }`}>
        
        {/* 頂部資訊欄 */}
        <div className="flex justify-between w-full text-2xl font-bold bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
          <div className="flex items-center gap-2">
            <Clock className={timeLeft <= 5 && isPlaying ? 'text-red-400 animate-pulse' : 'text-blue-300'} />
            <span>{timeLeft}s</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="text-yellow-300" fill="currentColor" />
            <span className="text-yellow-300">{score}</span>
          </div>
        </div>

        {/* 遊戲網格 */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="aspect-square bg-amber-950 rounded-full shadow-[inset_0_-8px_16px_rgba(0,0,0,0.6)] flex items-end justify-center overflow-hidden border-4 border-amber-900 relative">
              <AnimatePresence>
                {activeMole?.index === i && (
                  <motion.div 
                    initial={{ y: 100 }} 
                    animate={{ y: 0 }} 
                    exit={{ y: 100 }}
                    className="w-full h-full bg-amber-700 rounded-t-full flex items-center justify-center border-t-4 border-amber-500 shadow-lg"
                  >
                    <div className="bg-white text-amber-900 px-3 py-1 rounded-xl font-black text-xl shadow-md border-2 border-amber-900">
                      {activeMole.q}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* 控制與選項 */}
        <div className="flex gap-4 w-full h-24">
          {isPlaying ? (
            options.map(opt => (
              <button 
                key={opt} 
                onClick={() => handleAnswer(opt)} 
                className="flex-1 bg-white text-green-700 text-3xl md:text-4xl font-black rounded-3xl shadow-[0_8px_0_rgb(21,128,61)] active:translate-y-1 active:shadow-[0_4px_0_rgb(21,128,61)] transition-all hover:bg-green-50"
              >
                {opt}
              </button>
            ))
          ) : (
            <div className="flex gap-4 w-full">
              <button 
                onClick={startGame} 
                className="flex-[3] bg-yellow-400 text-yellow-900 text-3xl font-black rounded-3xl shadow-[0_8px_0_rgb(161,98,7)] hover:bg-yellow-300 active:translate-y-1 active:shadow-[0_4px_0_rgb(161,98,7)] transition-all flex items-center justify-center gap-3"
              >
                <Play fill="currentColor" /> 開始遊戲
              </button>
              <button 
                onClick={() => setShowLeaderboard(true)}
                className="flex-1 bg-blue-500 text-white rounded-3xl shadow-[0_8px_0_rgb(30,58,138)] hover:bg-blue-400 flex items-center justify-center"
              >
                <Trophy size={32} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 結算視窗 */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="bg-white text-gray-800 p-8 md:p-12 rounded-[3rem] text-center shadow-2xl border-8 border-green-500 max-w-sm w-full"
            >
              <Trophy className="mx-auto text-yellow-500 w-24 h-24 mb-4" />
              <h2 className="text-4xl font-black mb-2 text-green-800">遊戲結束</h2>
              <p className="text-gray-500 font-bold mb-4 uppercase tracking-widest">最終得分</p>
              <p className="text-8xl font-black text-green-600 mb-10">{score}</p>
              <button 
                onClick={startGame} 
                className="w-full bg-green-500 text-white py-5 rounded-full text-2xl font-black shadow-[0_8px_0_rgb(21,128,61)] active:translate-y-1 active:shadow-[0_4px_0_rgb(21,128,61)] transition-all"
              >
                再次挑戰
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 排行榜視窗 */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ y: 50 }} animate={{ y: 0 }}
              className="bg-white text-gray-800 p-8 rounded-[2.5rem] max-w-sm w-full relative"
            >
              <button onClick={() => setShowLeaderboard(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
              <h3 className="text-2xl font-black mb-6 flex items-center gap-2 justify-center">
                <Trophy className="text-yellow-500" /> 排行榜
              </h3>
              <div className="space-y-3 mb-8">
                {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border-2 border-gray-100">
                    <span className={`font-black text-lg ${i === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>#{i + 1}</span>
                    <span className="font-bold text-gray-700 text-xl">{entry.score} 分</span>
                    <span className="text-gray-400 text-sm">{entry.date}</span>
                  </div>
                )) : (
                  <p className="text-center text-gray-400 py-10">尚無紀錄</p>
                )}
              </div>
              <button 
                onClick={() => setShowLeaderboard(false)}
                className="w-full py-4 bg-gray-200 text-gray-600 rounded-full font-bold"
              >
                關閉
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
