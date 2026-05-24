'use client';

import React, { useEffect, useState } from 'react';

// =========================
// 基本データ & 定数
// =========================
const DEFAULT_AI_COMMENT = '毎日続けることが一番大切です！';

const defaultQuestions = [
  { type: '教科書', question: 'My name is Ken. I am from Osaka. Where is Ken from?', choices: ['Tokyo', 'Osaka', 'Kyoto', 'Nara'], answer: 'Osaka', explanation: 'I am from Osaka. と書かれている。' },
  { type: '会話表現', question: 'A: How are you?\nB: ( )', choices: ['I am fine, thank you.', 'Goodbye.', 'See you yesterday.', 'I play soccer.'], answer: 'I am fine, thank you.', explanation: '定番の会話表現。' },
  { type: '単語', question: '「usually」の意味は？', choices: ['めったに〜ない', 'たいてい', 'すぐに', '昨日'], answer: 'たいてい', explanation: 'usually = たいてい' },
  { type: '文法', question: 'He ( ) breakfast every morning.', choices: ['eat', 'eats', 'eating', 'ate'], answer: 'eats', explanation: '三人称単数なので eats。' },
  { type: '英作文', question: '「私は毎日英語を勉強します。」に最も近いものを選びなさい。', choices: ['I study English every day.', 'I studying English every day.', 'I studied English every day.', 'I am study English every day.'], answer: 'I study English every day.', explanation: '現在の習慣なので現在形。' },
  { type: '単語', question: '「important」の意味は？', choices: ['重要な', '美しい', '難しい', '危険な'], answer: '重要な', explanation: 'important = 重要な' },
  { type: '文法', question: 'I ( ) soccer yesterday.', choices: ['play', 'played', 'playing', 'plays'], answer: 'played', explanation: 'yesterday があるので過去形 played。' },
  { type: '並び替え', question: '次の語を並び替えなさい。\nI / to / school / go / every day', choices: ['I go to school every day.', 'I school go to every day.', 'Go I to school every day.', 'I every day go school to.'], answer: 'I go to school every day.', explanation: '主語→動詞→場所→頻度 の順番。' },
  { type: '文法', question: 'She ( ) TV now.', choices: ['watch', 'watched', 'is watching', 'watches'], answer: 'is watching', explanation: 'now があるので現在進行形。' },
  { type: '長文', question: 'Tom likes music. He plays the guitar every day. What does Tom play?', choices: ['Piano', 'Baseball', 'Guitar', 'Tennis'], answer: 'Guitar', explanation: 'He plays the guitar every day と書かれている。' }
];

const vocabularyQuestions = [
  { type: '単語', question: '「environment」の意味は？', choices: ['環境', '政府', '経済', '社会'], answer: '環境', explanation: 'environment = 環境' },
  { type: '単語', question: '「accept」の意味は？', choices: ['拒絶する', '受け入れる', '期待する', '不平を言う'], answer: '受け入れる', explanation: 'accept = 受け入れる' },
  { type: '単語', question: '「improve」の意味は？', choices: ['証明する', '改善する', '承認する', '提供する'], answer: '改善する', explanation: 'improve = 改善する' },
  { type: '単語', question: '「culture」の意味は？', choices: ['文化', '農業', '病気', '地図'], answer: '文化', explanation: 'culture = 文化' },
  { type: '単語', question: '「decision」の意味は？', choices: ['質問', '決定', '失敗', '招待'], answer: '決定', explanation: 'decision = 決定' }
];

const STOP_WORDS_GLOBAL = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'am', 'are', 'was', 'were']);
const DECOY_WORDS_GLOBAL = ['apple', 'banana', 'orange', 'grape'];

// =========================
// ユーティリティ
// =========================
const shuffleArray = (array: any) => {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
};

const prepareQuestions = (questions: any, useMock = false) => {
  const cloned = questions.map((item: any) => ({
    ...item,
    choices: Array.isArray(item.choices) ? [...item.choices] : []
  }));
  if (!useMock) return cloned;

  return shuffleArray(cloned).map((item: any) => ({
    ...item,
    choices: shuffleArray(item.choices)
  }));
};

const splitSentences = (text: any) =>
  text.replace(/\r/g, ' ').replace(/\n+/g, ' ').split(/[.!?。！？]/).map((s: any) => s.trim()).filter(Boolean);

const pickBlankWord = (sentence: any) => {
  const words = sentence.match(/[A-Za-z']+/g) || [];
  const candidates = Array.from(new Set(words))
    .filter((word: any) => word.length >= 4 && !STOP_WORDS_GLOBAL.has(word.toLowerCase()))
    .sort((a: any, b: any) => b.length - a.length);
  return candidates[0] || null;
};

const generateQuestionsFromText = (text: any) => {
  const sentences = splitSentences(text);
  const generated = sentences
    .slice(0, 6)
    .map((sentence: any) => {
      const cleanSentence = sentence.replace(/\s+/g, ' ').trim();
      const answer = pickBlankWord(cleanSentence);
      if (!answer) return null;

      const blanked = cleanSentence.replace(new RegExp(`\\b${answer}\\b`, 'i'), '_____');
      const sentenceWords = Array.from(new Set((cleanSentence.match(/[A-Za-z']+/g) || []).filter((w: any) => w.length >= 4)));
      const decoyPool = [...sentenceWords.filter((w: any) => w.toLowerCase() !== answer.toLowerCase()), ...DECOY_WORDS_GLOBAL]
        .filter((word: any, idx: any, arr: any) => arr.findIndex((x: any) => x.toLowerCase() === word.toLowerCase()) === idx);

      return {
        type: 'AI生成（穴埋め）',
        question: `次の文の空欄に入る最も適切な語を選びなさい。\n${blanked}.`,
        choices: shuffleArray([answer, ...shuffleArray(decoyPool).slice(0, 3)]),
        answer,
        explanation: `本文中の元の文は「${cleanSentence}.」です。`
      };
    })
    .filter(Boolean)
    .slice(0, 5);

  return generated.length > 0 ? generated : [{
    type: 'AI生成（読解）',
    question: `以下の本文に最も関係が深いものを選びなさい。\n「${text.trim().slice(0, 70)}...」`,
    choices: ['英文の内容理解', '数学の計算', '理科の実験', '地理の地図読み取り'],
    answer: '英文の内容理解',
    explanation: '貼り付けられた英文をもとにした基本的な内容把握問題です。'
  }];
};

// =========================
// メインコンポーネント
// =========================
export default function HighSchoolEnglishCoach() {
  const [studyMode, setStudyMode] = useState('normal');
  const [mockMode, setMockMode] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<any[]>(() => prepareQuestions(defaultQuestions, false));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [aiComment, setAiComment] = useState(DEFAULT_AI_COMMENT);
  const [timer, setTimer] = useState(30);
  const [uploadedText, setUploadedText] = useState('');
  
  const dailyGoal = 10;
  const q = activeQuestions[current];
  const isCorrect = selected === q?.answer;
  const questionTime = mockMode ? 15 : 30;

  const startQuizSession = (questions: any[], modeName: string, comment: string, isMock = mockMode) => {
    setStudyMode(modeName);
    setAiComment(comment);
    setActiveQuestions(questions);
    setCurrent(0);
    setScore(0);
    setSelected('');
    setShowAnswer(false);
    setTimer(isMock ? 15 : 30);
  };

  useEffect(() => {
    if (!q || showAnswer) return;
    const interval = setInterval(() => {
      setTimer((prev: any) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSelected('');
          setShowAnswer(true);
          setStreak(0);
          setMistakes((prevM: any[]) => prevM.some((m: any) => m.question === q.question) ? prevM : [...prevM, q]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [q, showAnswer]);

  const handleNormalMode = (forcedMock = mockMode) => {
    startQuizSession(prepareQuestions(defaultQuestions, forcedMock), 'normal', DEFAULT_AI_COMMENT, forcedMock);
  };

  const handleReviewMode = (forcedMock = mockMode) => {
    if (mistakes.length === 0) {
      alert('現在、復習する間違えた問題はありません！');
      return;
    }
    startQuizSession(prepareQuestions(mistakes, forcedMock), 'review', '苦手問題だけを集中して復習します。', forcedMock);
  };

  const handleToggleVocabulary = () => {
    if (studyMode !== 'vocabulary') {
      startQuizSession(prepareQuestions(vocabularyQuestions, mockMode), 'vocabulary', '単語モードです。意味をセットで覚えましょう！');
    } else {
      handleNormalMode();
    }
  };

  const handleToggleMockMode = () => {
    const nextMock = !mockMode;
    setMockMode(nextMock);
    const comment = nextMock ? '模試モードON：1問15秒・ヒントなし・シャッフルです。' : DEFAULT_AI_COMMENT;
    startQuizSession(prepareQuestions(studyMode === 'vocabulary' ? vocabularyQuestions : (studyMode === 'review' ? mistakes : defaultQuestions), nextMock), studyMode, comment, nextMock);
  };

  const handleRetry = () => {
    setStreak(0);
    if (studyMode === 'review') handleReviewMode();
    else if (studyMode === 'vocabulary') startQuizSession(prepareQuestions(vocabularyQuestions, mockMode), 'vocabulary', '単語モードです。');
    else handleNormalMode();
  };

  const generateAIQuestions = () => {
    if (!uploadedText.trim()) {
      alert('教科書本文を入力してください。');
      return;
    }
    const generated = generateQuestionsFromText(uploadedText);
    startQuizSession(generated, 'normal', 'あなたの本文から自動で問題を作成しました！');
  };

  const checkAnswer = () => {
    if (!q) return;
    setShowAnswer(true);
    if (selected === q.answer) {
      setScore((prev: any) => prev + 1);
      setStreak((prev: any) => prev + 1);
      if (studyMode === 'review') setMistakes((prev: any[]) => prev.filter((item: any) => item.question !== q.question));
    } else {
      setStreak(0);
      setMistakes((prev: any[]) => prev.some((item: any) => item.question === q.question) ? prev : [...prev, q]);
    }
  };

  const nextQuestion = () => {
    setCompleted((prev: any) => prev + 1);
    setCurrent((prev: any) => prev + 1);
    setSelected('');
    setShowAnswer(false);
    setTimer(questionTime);
  };

  if (current >= activeQuestions.length || !q) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-xl w-full text-center">
          <h1 className="text-3xl font-bold mb-4">テスト終了！</h1>
          <p className="text-2xl font-bold mb-6">{score} / {activeQuestions.length} 点</p>
          <div className="flex gap-3">
            <button onClick={handleNormalMode} className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-2xl font-bold text-sm">戻る</button>
            <button onClick={handleRetry} className="flex-1 bg-black text-white px-6 py-3 rounded-2xl font-bold text-sm">もう一度</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-xl p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button onClick={() => handleNormalMode()} className={`px-3 py-1 rounded-xl text-xs font-bold ${studyMode === 'normal' ? 'bg-black text-white' : 'bg-gray-200'}`}>通常</button>
            <button onClick={() => handleReviewMode()} className={`px-3 py-1 rounded-xl text-xs font-bold ${studyMode === 'review' ? 'bg-black text-white' : 'bg-gray-200'}`}>復習({mistakes.length})</button>
          </div>
          <div className="text-sm font-bold">残り: {timer}秒</div>
        </div>

        <div className="bg-red-50 p-4 rounded-2xl mb-4">
           <button onClick={handleToggleMockMode} className={`px-4 py-2 rounded-xl text-xs font-bold mb-2 ${mockMode ? 'bg-red-500 text-white' : 'bg-white border'}`}>模試モード</button>
           <textarea value={uploadedText} onChange={(e) => setUploadedText(e.target.value)} placeholder="本文貼り付け" className="w-full p-2 text-xs border rounded-xl mb-2" />
           <button onClick={generateAIQuestions} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold">✨AI問題生成</button>
        </div>

        <div className="mb-4">
          <span className="text-xs bg-gray-800 text-white px-2 py-1 rounded-full">{q.type}</span>
          <h2 className="text-lg font-bold mt-2 whitespace-pre-line">{q.question}</h2>
        </div>

        <div className="grid gap-2 mb-6">
          {q.choices?.map((choice: any) => (
            <button key={choice} disabled={showAnswer} onClick={() => setSelected(choice)} className={`p-3 rounded-xl border text-left text-sm ${selected === choice ? 'bg-gray-100 border-black font-bold' : 'bg-white'}`}>{choice}</button>
          ))}
        </div>

        {!showAnswer ? (
          <button onClick={checkAnswer} disabled={!selected} className="w-full bg-black text-white py-3 rounded-2xl font-bold">回答する</button>
        ) : (
          <div className="bg-gray-50 p-4 rounded-2xl">
            <p className="font-bold mb-1">{isCorrect ? '⭕ 正解！' : '❌ 不正解...'}</p>
            <p className="text-xs mb-3">正解: {q.answer}</p>
            <button onClick={nextQuestion} className="w-full bg-black text-white py-3 rounded-2xl font-bold">次へ</button>
          </div>
        )}
      </div>
    </div>
  );
}