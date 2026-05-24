'use client';

import React, { useCallback, useEffect, useState } from 'react';

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

const STOP_WORDS = new Set([
  'the', 'this', 'that', 'these', 'those', 'with', 'from', 'have', 'has', 'had',
  'your', 'their', 'there', 'were', 'what', 'when', 'where', 'which', 'while',
  'about', 'into', 'after', 'before', 'because', 'would', 'could', 'should',
  'name', 'very', 'much', 'many', 'some', 'every', 'today', 'yesterday', 'tomorrow',
  'they', 'them', 'then', 'than', 'been', 'being', 'also', 'only', 'just', 'over',
  'under', 'again', 'really', 'always', 'usually', 'often', 'sometimes', 'never',
  'play', 'plays', 'study', 'studies', 'like', 'likes', 'went', 'goes', 'school'
]);

const DECOY_WORDS = [
  'music', 'friend', 'morning', 'English', 'guitar', 'city', 'happy', 'library', 'important', 'science', 'teacher', 'student', 'family', 'practice', 'future'
];

// =========================
// ユーティリティ
// =========================
const shuffleArray = (array) => {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
};

const prepareQuestions = (questions, useMock = false) => {
  const cloned = questions.map((item) => ({
    ...item,
    choices: Array.isArray(item.choices) ? [...item.choices] : []
  }));
  if (!useMock) return cloned;

  return shuffleArray(cloned).map((item) => ({
    ...item,
    choices: shuffleArray(item.choices)
  }));
};

const splitSentences = (text) =>
  text.replace(/\r/g, ' ').replace(/\n+/g, ' ').split(/[.!?。！？]/).map((s) => s.trim()).filter(Boolean);

const pickBlankWord = (sentence) => {
  const words = sentence.match(/[A-Za-z']+/g) || [];
  const candidates = Array.from(new Set(words))
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word.toLowerCase()))
    .sort((a, b) => b.length - a.length);
  return candidates[0] || null;
};

const generateQuestionsFromText = (text) => {
  const sentences = splitSentences(text);
  const generated = sentences
    .slice(0, 6)
    .map((sentence) => {
      const cleanSentence = sentence.replace(/\s+/g, ' ').trim();
      const answer = pickBlankWord(cleanSentence);
      if (!answer) return null;

      const blanked = cleanSentence.replace(new RegExp(`\\b${answer}\\b`, 'i'), '_____');
      const sentenceWords = Array.from(new Set((cleanSentence.match(/[A-Za-z']+/g) || []).filter((w) => w.length >= 4)));
      const decoyPool = [...sentenceWords.filter((w) => w.toLowerCase() !== answer.toLowerCase()), ...DECOY_WORDS]
        .filter((word, idx, arr) => arr.findIndex((x) => x.toLowerCase() === word.toLowerCase()) === idx);

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
  // 状態管理
  const [studyMode, setStudyMode] = useState('normal'); // 'normal' | 'review' | 'vocabulary'
  const [mockMode, setMockMode] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState(() => prepareQuestions(defaultQuestions, false));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  
  // スコア・統計
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [mistakes, setMistakes] = useState([]);
  const [aiComment, setAiComment] = useState(DEFAULT_AI_COMMENT);
  
  // タイマー
  const questionTime = mockMode ? 15 : 30;
  const [timer, setTimer] = useState(questionTime);

  // その他入力
  const [uploadedText, setUploadedText] = useState('');
  const dailyGoal = 10;

  const q = activeQuestions[current];
  const isCorrect = selected === q?.answer;

  // クイズ状態の一括リセット用関数
  const startQuizSession = (questions, modeName, comment, isMock = mockMode) => {
    setStudyMode(modeName);
    setAiComment(comment);
    setActiveQuestions(questions);
    setCurrent(0);
    setScore(0);
    setSelected('');
    setShowAnswer(false);
    setTimer(isMock ? 15 : 30);
  };

  // タイマーロジック
  useEffect(() => {
    if (!q || showAnswer) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSelected('');
          setShowAnswer(true);
          setStreak(0);
          setMistakes((prevM) => prevM.some((m) => m.question === q.question) ? prevM : [...prevM, q]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [q, showAnswer]);

  // モード変更ハンドラー
  const handleNormalMode = (forcedMock = mockMode) => {
    const questions = prepareQuestions(defaultQuestions, forcedMock);
    startQuizSession(questions, 'normal', DEFAULT_AI_COMMENT, forcedMock);
  };

  const handleReviewMode = (forcedMock = mockMode) => {
    if (mistakes.length === 0) {
      alert('現在、復習する間違えた問題はありません！');
      return;
    }
    const questions = prepareQuestions(mistakes, forcedMock);
    startQuizSession(questions, 'review', '苦手問題だけを集中して復習します。', forcedMock);
  };

  const handleToggleVocabulary = () => {
    if (studyMode !== 'vocabulary') {
      const questions = prepareQuestions(vocabularyQuestions, mockMode);
      startQuizSession(questions, 'vocabulary', '単語モードです。意味をセットで覚えましょう！');
    } else {
      handleNormalMode();
    }
  };

  const handleToggleMockMode = () => {
    const nextMock = !mockMode;
    setMockMode(nextMock);
    const comment = nextMock ? '模試モードON：1問15秒・ヒントなし・シャッフルです。' : DEFAULT_AI_COMMENT;

    if (studyMode === 'review') {
      if (mistakes.length === 0) {
        handleNormalMode(nextMock);
      } else {
        startQuizSession(prepareQuestions(mistakes, nextMock), 'review', comment, nextMock);
      }
    } else if (studyMode === 'vocabulary') {
      startQuizSession(prepareQuestions(vocabularyQuestions, nextMock), 'vocabulary', comment, nextMock);
    } else {
      startQuizSession(prepareQuestions(defaultQuestions, nextMock), 'normal', comment, nextMock);
    }
  };

  const handleRetry = () => {
    setStreak(0);
    if (studyMode === 'review') {
      handleReviewMode();
    } else if (studyMode === 'vocabulary') {
      startQuizSession(prepareQuestions(vocabularyQuestions, mockMode), 'vocabulary', '単語モードです。');
    } else {
      handleNormalMode();
    }
  };

  // AI問題生成
  const generateAIQuestions = () => {
    if (!uploadedText.trim()) {
      alert('教科書本文を入力してください。');
      return;
    }
    const generated = generateQuestionsFromText(uploadedText);
    startQuizSession(generated, 'normal', 'あなたの本文から自動で問題を作成しました！');
    alert(`本文から ${generated.length} 問の自動生成問題を作りました！`);
  };

  // 回答判定
  const checkAnswer = () => {
    if (!q) return;
    setShowAnswer(true);

    if (selected === q.answer) {
      setScore((prev) => prev + 1);
      setStreak((prev) => prev + 1);
      // 復習モードで正解した場合、全体の誤答リストから外す
      if (studyMode === 'review') {
        setMistakes((prev) => prev.filter((item) => item.question !== q.question));
      }
    } else {
      setStreak(0);
      setMistakes((prev) => prev.some((item) => item.question === q.question) ? prev : [...prev, q]);
    }
  };

  // 次の問題へ
  const nextQuestion = () => {
    const nextCompleted = completed + 1;
    setCompleted(nextCompleted);

    if (nextCompleted >= dailyGoal) {
      setAiComment('今日の目標達成！かなり良いペースです！');
    }

    setCurrent((prev) => prev + 1);
    setSelected('');
    setShowAnswer(false);
    setTimer(questionTime);
  };

  // ヒント表示
  const handleShowHint = () => {
    if (!q) return;
    const hints = {
      文法: '時間を表す言葉（now, yesterday, every day など）に注目！',
      単語: '品詞や、見たことのある語根・接頭辞から推測してみよう！',
      長文: 'Who / What / Where を先に探すと内容が読みやすい！',
      並び替え: 'まず主語→動詞の骨組みを作ろう！',
      会話表現: 'あいさつ・返答の定番表現を思い出そう！',
      教科書: '本文の中の固有名詞や場所・人物に注目！',
      英作文: '時制と語順を先にチェック！'
    };
    alert(hints[q.type] || '落ち着いて、主語・動詞・時を表す語に注目しよう！');
  };

  // 全問終了画面
  if (current >= activeQuestions.length || !q) {
    const isReviewClear = studyMode === 'review' && score === activeQuestions.length;
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-xl w-full text-center">
          <div className="text-5xl mb-4">{isReviewClear ? '🎉' : '📝'}</div>
          <h1 className="text-3xl font-bold mb-4">{isReviewClear ? '復習クリア！' : 'テスト結果'}</h1>
          <p className="text-lg text-gray-600 mb-2">
            {isReviewClear ? '苦手問題をすべて解消しました！' : '今回のセッションが終了しました。'}
          </p>
          <p className="text-2xl font-bold mb-6">{score} / {activeQuestions.length} 点</p>

          <div className="text-left bg-gray-50 rounded-2xl p-4 mb-6">
            <p className="font-bold mb-3">現在の苦手問題数: {mistakes.length}</p>
            <h2 className="font-bold mb-2 text-sm text-gray-700">AIコーチのアドバイス</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
              <li>毎日15分でも英語に触れる習慣をつけましょう。</li>
              <li>間違えた問題は「復習モード」で定期的に解き直すのが効果的です。</li>
              <li>長文や教科書表現は、口に出して音読すると定着しやすくなります。</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button onClick={handleNormalMode} className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-2xl font-bold text-sm">
              通常モードに戻る
            </button>
            <button onClick={handleRetry} className="flex-1 bg-black text-white px-6 py-3 rounded-2xl font-bold text-sm">
              もう一度挑戦
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-2xl w-full">
        {/* ヘッダー */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handleNormalMode()} className={`px-3 py-1 rounded-xl font-medium text-sm ${studyMode === 'normal' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'}`}>
              通常
            </button>
            <button onClick={() => handleReviewMode()} className={`px-3 py-1 rounded-xl font-medium text-sm ${studyMode === 'review' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'}`}>
              復習 ({mistakes.length})
            </button>
          </div>

          <div className="text-right md:text-center">
            <h1 className="text-2xl font-bold text-gray-800">高校1年 英語AIコーチ</h1>
            <p className="text-sm text-gray-500 mt-0.5">高1・1学期 中間テスト対策</p>
          </div>

          <div className="flex gap-2 items-center self-end md:self-auto flex-wrap justify-end">
            <div className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-xl font-bold">🔥 連続: {streak}</div>
            <div className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-xl font-bold">Score: {score}</div>
            <div className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-xl font-bold">{current + 1} / {activeQuestions.length}</div>
          </div>
        </div>

        {/* モード設定セクション */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={handleToggleMockMode} className={`px-4 py-2 rounded-xl text-sm font-bold ${mockMode ? 'bg-red-500 text-white' : 'bg-white border text-gray-700'}`}>
              {mockMode ? '🚨 模試モードON' : '模試モード'}
            </button>
            <button onClick={handleToggleVocabulary} className={`px-4 py-2 rounded-xl text-sm font-bold ${studyMode === 'vocabulary' ? 'bg-blue-500 text-white' : 'bg-white border text-gray-700'}`}>
              {studyMode === 'vocabulary' ? '📖 単語モードON' : '単語1000語'}
            </button>
          </div>

          {mockMode && (
            <div className="bg-white border border-red-100 rounded-xl p-3 mb-3 text-xs text-red-700 leading-relaxed">
              模試モードでは「1問15秒」「ヒントなし」「問題順・選択肢順シャッフル」になります。
            </div>
          )}

          <textarea
            value={uploadedText}
            onChange={(e) => setUploadedText(e.target.value)}
            placeholder="教科書本文を貼り付けると自動で穴埋め問題を生成します"
            className="w-full p-3 rounded-2xl border mb-3 min-h-[100px] text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
          <button onClick={generateAIQuestions} className="bg-black text-white px-5 py-2.5 rounded-2xl text-sm font-bold w-full md:w-auto">
            ✨ 本文から問題生成して挑戦
          </button>
        </div>

        {/* 進捗バー */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-5">
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-purple-900 text-sm">今日の学習状況</p>
            <p className="text-sm font-bold text-purple-900">{completed} / {dailyGoal} 問</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div className="bg-purple-600 h-3 rounded-full transition-all duration-300" style={{ width: `${Math.min((completed / dailyGoal) * 100, 100)}%` }} />
          </div>
          <div className="bg-white rounded-xl p-3 text-sm border border-purple-100">
            <p className="font-bold mb-1 text-purple-700">AI先生コメント</p>
            <p className="text-gray-700">{aiComment}</p>
          </div>
        </div>

        {/* タイマー表示 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-bold text-gray-700">
              {mockMode && <span className="text-red-500 mr-2">【模試】</span>}
              残り時間: <span className={timer <= 5 ? 'text-red-500 font-extrabold text-lg' : 'text-lg'}>{timer}</span> 秒
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all duration-300 ${timer <= 5 ? 'bg-red-500 animate-pulse' : 'bg-black'}`} style={{ width: `${(timer / questionTime) * 100}%` }} />
          </div>
        </div>

        {/* 問題エリア */}
        <div className="mb-2">
          <span className="text-xs bg-gray-800 text-white px-3 py-1 rounded-full font-bold">{q.type}</span>
        </div>
        <h2 className="text-xl font-bold mb-6 whitespace-pre-line leading-relaxed text-gray-800">{q.question}</h2>

        {/* 選択肢ボタン */}
        <div className="grid gap-3 mb-6">
          {q.choices?.map((choice) => (
            <button
              key={choice}
              disabled={showAnswer}
              onClick={() => setSelected(choice)}
              className={`p-4 rounded-2xl border text-left transition text-sm font-medium ${
                selected === choice ? 'border-black bg-gray-100 font-bold' : 'border-gray-300 bg-white hover:bg-gray-50'
              } disabled:opacity-80`}
            >
              {choice}
            </button>
          ))}
        </div>

        {/* アクションボタン */}
        {!showAnswer ? (
          <div className="flex gap-3">
            <button onClick={handleShowHint} disabled={mockMode} className="bg-gray-200 text-gray-800 px-5 py-3 rounded-2xl font-bold text-sm disabled:bg-gray-100 disabled:text-gray-400">
              ヒント
            </button>
            <button onClick={checkAnswer} disabled={!selected} className="flex-1 bg-black text-white px-6 py-3 rounded-2xl font-bold text-sm disabled:bg-gray-300">
              回答する
            </button>
          </div>
        ) : (
          <div>
            <div className={`p-4 rounded-2xl mb-4 border ${isCorrect ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
              <p className="font-bold text-lg mb-1">{isCorrect ? '🎉 正解！' : '❌ 不正解...'}</p>
              <p className="font-semibold text-sm">正解: {q.answer}</p>
              <p className="mt-2 text-xs opacity-90 leading-relaxed">解説: {q.explanation}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMistakes((prev) => prev.some((item) => item.question === q.question) ? prev : [...prev, q]);
                  alert('復習リストに追加しました！');
                }}
                className="bg-gray-200 text-gray-800 px-5 py-3 rounded-2xl font-bold text-sm"
              >
                復習登録
              </button>
              <button onClick={nextQuestion} className="flex-1 bg-black text-white px-6 py-3 rounded-2xl font-bold text-sm">
                次の問題へ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}