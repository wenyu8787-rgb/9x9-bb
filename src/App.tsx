import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Trophy, Clock, Star, X } from 'lucide-react';

// 定義資料類型 (TypeScript)
interface ScoreEntry {
  score: number;
  date: string;
}

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [activeMole, setActiveMole] = useState<{ index: number; q: string; ans: number } | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);

  const moleTimerRef = useRef<any>(null);
  const gameTimerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scoreRef = useRef(0);

  // 讀取在地紀錄
  useEffect(() => {
    const saved = localStorage.getItem('whack-a-mole-leaderboard');
    if (saved) {
      try { setLeaderboard(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const saveScore = (newScore: number) => {
    const newEntry = { score: newScore, date: new Date().toLocaleDateString() };
    setLeaderboard(prev => {
      const newList = [...prev, newEntry].sort((a, b) => b.score - a.score).slice(0, 5);
      localStorage.setItem('whack-a-mole-leaderboard', JSON.stringify(newList));
      return newList;
    });
  };

  const playSound = useCallback((type: 'correct' | 'wrong' | 'gameover') => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (type === 'correct') {
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start(t); osc.stop(t + 0.1);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.start(t); osc.stop(t + 0.2);
    }
    osc.connect(gain); gain.connect(ctx.destination);
  }, []);

  const spawnMole = useCallback(() => {
    if (moleTimerRef.current) clearTimeout(moleTimerRef.current);
    setFeedback(null);
    const index = Math.floor(Math.random() * 6);
    const n1 = Math.floor(Math.random() * 8) + 2; 
    const n2 = Math.floor(Math.random() * 8) + 2; 
    const ans = n1 * n2;
    const opts = new Set([ans]);
    while (opts.size < 3) {
      const wrong = ans + (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
      if (wrong > 0 && wrong !== ans) opts.add(wrong);
    }
    setActiveMole({ index, q: `${n1} × ${n2}`, ans });
    setOptions(Array.from(opts).sort(() => Math.random() - 0.5));
    moleTimerRef.current = setTimeout(() => {
      setActiveMole(null);
      moleTimerRef.current = setTimeout(spawnMole, 600);
    }, 2000);
  }, []);

  const startGame = () => {
    setIsPlaying(true); setTimeLeft(30); setScore(0); scoreRef.current = 0;
    setShowModal(false); spawnMole();
    gameTimerRef.current = setInterval(() => {
      setTimeLeft(p => { if (p <= 1) { endGame(); return 0; } return p - 1; });
    }, 1000);
  };

  const endGame = () => {
    setIsPlaying(false); setActiveMole(null); setShowModal(true);
    saveScore(scoreRef.current);
    clearInterval(gameTimerRef.current); clearTimeout(moleTimerRef.current);
  };

  const handleAnswer = (val: number) => {
    if (!activeMole || !isPlaying) return;
    if (val === activeMole.ans) {
      setScore(s => { scoreRef.current = s + 10; return s + 10; });
      setFeedback('correct'); playSound('correct');
      setActiveMole(null); spawnMole();
    } else {
      setScore(s => { scoreRef.current = Math.max(0, s - 5); return Math.max(0, s - 5); });
      setFeedback('wrong'); playSound('wrong');
    }
  };

  return (
    <div className="h-screen bg-green-600 flex flex-col items-center justify-center p-4 font-sans text-white overflow-hidden">
      <h1 className="text-4xl font-black mb-4 drop-shadow-lg">九九乘法地鼠王</h1>
      
      <div className="bg-black/20 p-6 rounded-[2rem] w-full max-w-2xl flex flex-col items-center gap-6">
        <div className="flex justify-between w-full text-2xl font-bold bg-white/10 p-4 rounded-xl">
          <span>時間: {timeLeft}s</span>
          <span className="text-yellow-300">分數: {score}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="aspect-square bg-amber-950 rounded-full shadow-inner flex items-end justify-center overflow-hidden border-4 border-amber-900 relative">
              <AnimatePresence>
                {activeMole?.index === i && (
                  <motion.div 
                    initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                    className="w-full h-full bg-amber-700 rounded-t-full flex items-center justify-center border-t-4 border-amber-500"
                  >
                    <span className="bg-white text-amber-900 px-2 py-1 rounded-lg font-black text-lg">{activeMole.q}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="flex gap-4 w-full h-20">
          {isPlaying ? options.map(opt => (
            <button key={opt} onClick={() => handleAnswer(opt)} className="flex-1 bg-white text-green-700 text-3xl font-black rounded-2xl shadow-xl active:scale-95 transition-transform">{opt}</button>
          )) : (
            <button onClick={startGame} className="w-full bg-yellow-400 text-yellow-900 text-3xl font-black rounded-2xl shadow-xl hover:bg-yellow-300">開始挑戰</button>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white text-gray-800 p-10 rounded-[3rem] text-center shadow-2xl border-8 border-green-500 max-w-sm w-full">
            <Trophy className="mx-auto text-yellow-500 w-20 h-20 mb-4" />
            <h2 className="text-4xl font-black mb-2">遊戲結束</h2>
            <p className="text-6xl font-black text-green-600 mb-8">{score}</p>
            <button onClick={startGame} className="w-full bg-green-500 text-white py-4 rounded-full text-xl font-bold shadow-lg">再試一次</button>
          </div>
        </div>
      )}
    </div>
  );
}