/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Languages, 
  ChevronRight, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Trophy,
  Home,
  ArrowLeft
} from 'lucide-react';
import { hsk1Vocab, HSKWord } from './data/hsk1';
import { hsk1Sentences, HSKSentence } from './data/sentences';

type Mode = 'HOME' | 'CHINESE_TO_VIET' | 'VIET_TO_CHINESE' | 'RESULT' | 'REVIEW' | 'SENTENCE_PRACTICE';
type Skill = 'HAN_TO_VIET' | 'VIET_TO_HAN';

export default function App() {
  const [mode, setMode] = useState<Mode>('HOME');
  const [reviewSkill, setReviewSkill] = useState<Skill>('HAN_TO_VIET');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<'CORRECT' | 'INCORRECT' | null>(null);
  const [score, setScore] = useState(0);
  const [sessionWords, setSessionWords] = useState<HSKWord[]>([]);
  const [sessionSentences, setSessionSentences] = useState<HSKSentence[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [learnedIds, setLearnedIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('hsk1_learned_ids');
    return saved ? JSON.parse(saved) : [];
  });
  const [incorrectIds, setIncorrectIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('hsk1_incorrect_ids');
    return saved ? JSON.parse(saved) : [];
  });
  const [incorrectSentenceIds, setIncorrectSentenceIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('hsk1_incorrect_sentence_ids');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionIncorrect, setCurrentSessionIncorrect] = useState<number[]>([]);
  const [currentSessionIncorrectSentences, setCurrentSessionIncorrectSentences] = useState<number[]>([]);
  const [lastSessionIds, setLastSessionIds] = useState<number[]>([]);
  const [lastSessionSentenceIds, setLastSessionSentenceIds] = useState<number[]>([]);

  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('hsk1_learned_ids', JSON.stringify(learnedIds));
  }, [learnedIds]);

  useEffect(() => {
    localStorage.setItem('hsk1_incorrect_ids', JSON.stringify(incorrectIds));
  }, [incorrectIds]);

  useEffect(() => {
    localStorage.setItem('hsk1_incorrect_sentence_ids', JSON.stringify(incorrectSentenceIds));
  }, [incorrectSentenceIds]);

  useEffect(() => {
    if ((mode === 'CHINESE_TO_VIET' || mode === 'VIET_TO_CHINESE' || mode === 'REVIEW' || mode === 'SENTENCE_PRACTICE') && !feedback) {
      inputRef.current?.focus();
    }
  }, [currentIndex, mode, feedback]);

  const startSession = (newMode: Mode, skill?: Skill) => {
    let pool: HSKWord[] = [];
    
    if (newMode === 'SENTENCE_PRACTICE') {
      // Diverse selection: prioritize sentences not in last session
      const availableSentences = hsk1Sentences.filter(s => !lastSessionSentenceIds.includes(s.id));
      let selectedSentences: HSKSentence[] = [];
      
      if (availableSentences.length >= 10) {
        selectedSentences = [...availableSentences].sort(() => Math.random() - 0.5).slice(0, 10);
      } else {
        selectedSentences = [...hsk1Sentences].sort(() => Math.random() - 0.5).slice(0, 10);
      }

      setSessionSentences(selectedSentences);
      setLastSessionSentenceIds(selectedSentences.map(s => s.id));
      setCurrentIndex(0);
      setScore(0);
      setMode(newMode);
      setFeedback(null);
      setUserInput('');
      setShowAnswer(false);
      setCurrentSessionIncorrectSentences([]);
      return;
    }

    if (newMode === 'REVIEW') {
      // Check if we are reviewing sentences or words
      // If skill is not provided, we can default or check if there are incorrect sentences
      if (skill === 'HAN_TO_VIET' || skill === 'VIET_TO_HAN') {
        pool = hsk1Vocab.filter(w => incorrectIds.includes(w.id));
        if (pool.length === 0) {
          setMode('HOME');
          return;
        }
        setReviewSkill(skill);
      } else {
        // Review Sentences mode
        const poolSentences = hsk1Sentences.filter(s => incorrectSentenceIds.includes(s.id));
        if (poolSentences.length === 0) {
          setMode('HOME');
          return;
        }
        setSessionSentences(poolSentences.sort(() => Math.random() - 0.5));
        setCurrentIndex(0);
        setScore(0);
        setMode('SENTENCE_PRACTICE'); // Re-use sentence practice mode for review
        setFeedback(null);
        setUserInput('');
        setShowAnswer(false);
        setCurrentSessionIncorrectSentences([]);
        return;
      }
    } else {
      // Prioritize unlearned words, excluding words from the immediate last session
      const unlearned = hsk1Vocab.filter(w => !learnedIds.includes(w.id) && !lastSessionIds.includes(w.id));
      const poolSize = 20;
      
      if (unlearned.length >= poolSize) {
        pool = [...unlearned].sort(() => Math.random() - 0.5).slice(0, poolSize);
      } else {
        // If not enough unlearned, take all unlearned and fill with others (not from last session if possible)
        const others = hsk1Vocab.filter(w => !unlearned.map(u => u.id).includes(w.id) && !lastSessionIds.includes(w.id));
        pool = [...unlearned, ...others.sort(() => Math.random() - 0.5).slice(0, poolSize - unlearned.length)];
        
        // If still not enough (e.g. very small total vocab), just fill with anything
        if (pool.length < poolSize) {
          const remaining = hsk1Vocab.filter(w => !pool.map(p => p.id).includes(w.id));
          pool = [...pool, ...remaining.sort(() => Math.random() - 0.5).slice(0, poolSize - pool.length)];
        }
      }
    }

    const finalPool = pool.sort(() => Math.random() - 0.5);
    setSessionWords(finalPool);
    setLastSessionIds(finalPool.map(w => w.id));
    setCurrentIndex(0);
    setScore(0);
    setMode(newMode);
    setFeedback(null);
    setUserInput('');
    setShowAnswer(false);
    setCurrentSessionIncorrect([]);
  };

  const currentWord = sessionWords[currentIndex];
  const currentSentence = sessionSentences[currentIndex];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback) return;

    if (mode === 'SENTENCE_PRACTICE') {
      if (!currentSentence) return;
      const normalizedInput = userInput.trim().replace(/[。？！，,.?!]/g, '');
      const normalizedTarget = currentSentence.hanzi.replace(/[。？！，,.?!]/g, '');
      
      if (normalizedInput === normalizedTarget) {
        setFeedback('CORRECT');
        setScore(prev => prev + 1);
        // If correct, remove from incorrect sentences list
        setIncorrectSentenceIds(prev => prev.filter(id => id !== currentSentence.id));
      } else {
        setFeedback('INCORRECT');
        // Add to incorrect sentences list
        if (!incorrectSentenceIds.includes(currentSentence.id)) {
          setIncorrectSentenceIds(prev => [...prev, currentSentence.id]);
        }
        setCurrentSessionIncorrectSentences(prev => [...prev, currentSentence.id]);
      }
      setShowAnswer(true);
      return;
    }

    if (!currentWord) return;

    const normalizedInput = userInput.trim().toLowerCase();
    
    // Determine which skill is being tested
    const isVietToHan = mode === 'VIET_TO_CHINESE' || (mode === 'REVIEW' && reviewSkill === 'VIET_TO_HAN');
    
    const isCorrect = isVietToHan
      ? normalizedInput === currentWord.hanzi
      : currentWord.vietnamese.toLowerCase().split(',').some(v => normalizedInput.includes(v.trim())) || normalizedInput === currentWord.vietnamese.toLowerCase();

    if (isCorrect) {
      setFeedback('CORRECT');
      setScore(prev => prev + 1);
      
      // If correct in review, remove from incorrect list
      if (mode === 'REVIEW') {
        setIncorrectIds(prev => prev.filter(id => id !== currentWord.id));
      }
      
      // Mark as learned
      if (!learnedIds.includes(currentWord.id)) {
        setLearnedIds(prev => [...prev, currentWord.id]);
      }
    } else {
      setFeedback('INCORRECT');
      // Add to incorrect list if not already there
      if (!incorrectIds.includes(currentWord.id)) {
        setIncorrectIds(prev => [...prev, currentWord.id]);
      }
      setCurrentSessionIncorrect(prev => [...prev, currentWord.id]);
    }
    setShowAnswer(true);
  };

  const handleNext = () => {
    const totalItems = mode === 'SENTENCE_PRACTICE' ? sessionSentences.length : sessionWords.length;
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserInput('');
      setFeedback(null);
      setShowAnswer(false);
    } else {
      setMode('RESULT');
    }
  };

  const progress = (currentIndex / (mode === 'SENTENCE_PRACTICE' ? sessionSentences.length : sessionWords.length)) * 100;

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMode('HOME')}>
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
              H
            </div>
            <h1 className="font-semibold tracking-tight">HSK1 Master</h1>
          </div>
          {mode !== 'HOME' && (
            <button 
              onClick={() => setMode('HOME')}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <Home size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {mode === 'HOME' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-light tracking-tight text-black">
                  Chào mừng bạn đến với <span className="font-semibold text-emerald-600 italic">HSK1 Master</span>
                </h2>
                <p className="text-black/50 text-lg">Chọn một chế độ để bắt đầu ôn tập từ vựng của bạn.</p>
              </div>

              <div className="grid gap-4">
                <button
                  onClick={() => startSession('CHINESE_TO_VIET')}
                  className="group relative flex items-center justify-between p-8 bg-white border border-black/5 rounded-3xl shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-left"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <BookOpen size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Hán → Việt</h3>
                      <p className="text-black/40">Từ mới ưu tiên</p>
                    </div>
                  </div>
                  <ChevronRight className="text-black/20 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  onClick={() => startSession('VIET_TO_CHINESE')}
                  className="group relative flex items-center justify-between p-8 bg-white border border-black/5 rounded-3xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Languages size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Việt → Hán</h3>
                      <p className="text-black/40">Từ mới ưu tiên</p>
                    </div>
                  </div>
                  <ChevronRight className="text-black/20 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  onClick={() => startSession('SENTENCE_PRACTICE')}
                  className="group relative flex items-center justify-between p-8 bg-white border border-black/5 rounded-3xl shadow-sm hover:shadow-md hover:border-purple-200 transition-all text-left"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Languages size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Luyện tập câu</h3>
                      <p className="text-black/40">Dịch câu tiếng Việt sang chữ Hán</p>
                    </div>
                  </div>
                  <ChevronRight className="text-black/20 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                </button>

                {incorrectIds.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-orange-600 uppercase tracking-widest text-center">Ôn tập lỗi sai ({incorrectIds.length})</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => startSession('REVIEW', 'HAN_TO_VIET')}
                        className="group relative flex flex-col items-center justify-center p-6 bg-orange-50 border border-orange-100 rounded-3xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-center"
                      >
                        <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors mb-4">
                          <BookOpen size={24} />
                        </div>
                        <h3 className="text-sm font-semibold text-orange-900">Hán → Việt</h3>
                      </button>

                      <button
                        onClick={() => startSession('REVIEW', 'VIET_TO_HAN')}
                        className="group relative flex flex-col items-center justify-center p-6 bg-orange-50 border border-orange-100 rounded-3xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-center"
                      >
                        <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors mb-4">
                          <Languages size={24} />
                        </div>
                        <h3 className="text-sm font-semibold text-orange-900">Việt → Hán</h3>
                      </button>
                    </div>
                    {incorrectSentenceIds.length > 0 && (
                      <button
                        onClick={() => startSession('REVIEW')}
                        className="w-full group relative flex items-center justify-between p-6 bg-orange-50 border border-orange-100 rounded-3xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                            <RotateCcw size={20} />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-orange-900">Ôn tập câu sai</h3>
                            <p className="text-xs text-orange-600/60">{incorrectSentenceIds.length} câu cần ôn lại</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-orange-600/40 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-8 border-t border-black/5 space-y-4">
                <div className="flex items-center justify-between text-sm text-black/40">
                  <span>Đã học: {learnedIds.length} / {hsk1Vocab.length} từ</span>
                  <button 
                    onClick={() => {
                      if(confirm('Bạn có chắc chắn muốn xóa toàn bộ tiến độ học tập?')) {
                        setLearnedIds([]);
                        setIncorrectIds([]);
                        setIncorrectSentenceIds([]);
                        localStorage.removeItem('hsk1_learned_ids');
                        localStorage.removeItem('hsk1_incorrect_ids');
                        localStorage.removeItem('hsk1_incorrect_sentence_ids');
                      }
                    }}
                    className="hover:text-red-500 transition-colors"
                  >
                    Xóa tiến độ
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {(mode === 'CHINESE_TO_VIET' || mode === 'VIET_TO_CHINESE' || mode === 'REVIEW' || mode === 'SENTENCE_PRACTICE') && (currentWord || currentSentence) && (
            <motion.div
              key={`study-${currentIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-black/40 uppercase tracking-widest">
                  <span>{mode === 'REVIEW' ? 'Ôn tập lỗi sai' : mode === 'SENTENCE_PRACTICE' ? 'Luyện tập câu' : 'Tiến độ'}</span>
                  <span>{currentIndex + 1} / {mode === 'SENTENCE_PRACTICE' ? sessionSentences.length : sessionWords.length}</span>
                </div>
                <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${mode === 'REVIEW' ? 'bg-orange-500' : mode === 'SENTENCE_PRACTICE' ? 'bg-purple-500' : 'bg-emerald-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-white border border-black/5 rounded-[40px] p-12 shadow-xl shadow-black/5 flex flex-col items-center text-center space-y-8">
                <div className="space-y-4">
                  <span className={`text-xs font-bold uppercase tracking-[0.2em] ${mode === 'REVIEW' ? 'text-orange-600' : mode === 'SENTENCE_PRACTICE' ? 'text-purple-600' : 'text-emerald-600'}`}>
                    {mode === 'CHINESE_TO_VIET' || (mode === 'REVIEW' && reviewSkill === 'HAN_TO_VIET') ? 'Dịch sang tiếng Việt' : 'Dịch sang chữ Hán'}
                  </span>
                  <h3 className={`font-serif leading-tight ${mode === 'VIET_TO_CHINESE' || (mode === 'REVIEW' && reviewSkill === 'VIET_TO_HAN') || mode === 'SENTENCE_PRACTICE' ? 'text-5xl' : 'text-8xl'}`}>
                    {mode === 'VIET_TO_CHINESE' || (mode === 'REVIEW' && reviewSkill === 'VIET_TO_HAN') ? currentWord.vietnamese : 
                     mode === 'SENTENCE_PRACTICE' ? currentSentence.vietnamese : currentWord.hanzi}
                  </h3>
                </div>

                <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
                  <div className="relative">
                    <input
                      ref={inputRef}
                      autoFocus
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      disabled={!!feedback}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Nhập câu trả lời của bạn..."
                      className={`w-full px-6 py-4 bg-black/5 border-2 rounded-2xl outline-none transition-all text-center text-lg font-medium
                        ${feedback === 'CORRECT' ? 'border-emerald-500 bg-emerald-50' : 
                          feedback === 'INCORRECT' ? 'border-red-500 bg-red-50' : 
                          'border-transparent focus:border-black/10 focus:bg-white'}`}
                    />
                    {feedback === 'CORRECT' && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />}
                    {feedback === 'INCORRECT' && <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500" />}
                  </div>

                  {!feedback ? (
                    <button
                      type="submit"
                      className="w-full py-4 bg-black text-white rounded-2xl font-semibold hover:bg-black/80 transition-all active:scale-95"
                    >
                      Kiểm tra
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                    >
                      Tiếp theo <ChevronRight size={20} />
                    </button>
                  )}
                </form>

                <AnimatePresence>
                  {showAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-6 border-t border-black/5 w-full space-y-2"
                    >
                      <p className="text-sm text-black/40 uppercase tracking-widest font-bold">Đáp án đúng</p>
                      <div className="flex flex-col items-center">
                        <span className="text-3xl font-serif text-black">
                          {mode === 'SENTENCE_PRACTICE' ? currentSentence.hanzi : currentWord.hanzi}
                        </span>
                        <span className="text-lg text-emerald-600 font-medium">
                          {mode === 'SENTENCE_PRACTICE' ? currentSentence.pinyin : currentWord.pinyin}
                        </span>
                        <span className="text-black/60 italic">
                          {mode === 'SENTENCE_PRACTICE' ? currentSentence.vietnamese : currentWord.vietnamese}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => setMode('HOME')}
                className="flex items-center gap-2 text-black/40 hover:text-black transition-colors mx-auto text-sm font-medium"
              >
                <ArrowLeft size={16} /> Thoát phiên học
              </button>
            </motion.div>
          )}

          {mode === 'RESULT' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-12 py-12"
            >
              <div className="relative inline-block">
                <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                  <Trophy size={64} />
                </div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold px-3 py-1 rounded-full"
                >
                  HOÀN THÀNH!
                </motion.div>
              </div>

              <div className="space-y-4">
                <h2 className="text-5xl font-light tracking-tight">Kết quả của bạn</h2>
                <div className="flex justify-center gap-12">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-emerald-600">{score}</p>
                    <p className="text-black/40 text-sm uppercase tracking-widest">Đúng</p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-red-400">
                      {(mode === 'SENTENCE_PRACTICE' ? sessionSentences.length : sessionWords.length) - score}
                    </p>
                    <p className="text-black/40 text-sm uppercase tracking-widest">Sai</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm mx-auto">
                <button
                  onClick={() => setMode('HOME')}
                  className="flex items-center justify-center gap-2 py-4 border border-black/10 rounded-2xl font-semibold hover:bg-black/5 transition-all"
                >
                  Trang chủ
                </button>
                <button
                  onClick={() => startSession(mode === 'RESULT' ? 'CHINESE_TO_VIET' : mode)}
                  className="flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl font-semibold hover:bg-emerald-700 transition-all"
                >
                  <RotateCcw size={18} /> Thử lại
                </button>
                {mode !== 'SENTENCE_PRACTICE' && currentSessionIncorrect.length > 0 && (
                  <div className="sm:col-span-2 space-y-4 pt-4">
                    <p className="text-sm font-bold text-orange-600 uppercase tracking-widest">Ôn tập lỗi sai vừa mắc ({currentSessionIncorrect.length})</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => startSession('REVIEW', 'HAN_TO_VIET')}
                        className="flex items-center justify-center gap-2 py-4 bg-orange-600 text-white rounded-2xl font-semibold hover:bg-orange-700 transition-all"
                      >
                        Hán → Việt
                      </button>
                      <button
                        onClick={() => startSession('REVIEW', 'VIET_TO_HAN')}
                        className="flex items-center justify-center gap-2 py-4 bg-orange-600 text-white rounded-2xl font-semibold hover:bg-orange-700 transition-all"
                      >
                        Việt → Hán
                      </button>
                    </div>
                  </div>
                )}
                {mode === 'SENTENCE_PRACTICE' && currentSessionIncorrectSentences.length > 0 && (
                  <button
                    onClick={() => startSession('REVIEW')}
                    className="sm:col-span-2 flex items-center justify-center gap-2 py-4 bg-orange-600 text-white rounded-2xl font-semibold hover:bg-orange-700 transition-all"
                  >
                    <RotateCcw size={18} /> Ôn tập câu sai vừa mắc ({currentSessionIncorrectSentences.length})
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-black/20 text-xs font-medium uppercase tracking-[0.3em]">
        Học tiếng Trung mỗi ngày • HSK1 Master
      </footer>
    </div>
  );
}