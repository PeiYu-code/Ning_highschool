// 已填入您的 Google Apps Script Web App 部署 URL
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxYLpKNLpg_Keau68B-xMg-kZSfm_Z4luO-PcyzWjM0hhhuotfe2KPRHOjD7GVKLq9w/exec';

const wordBank = [
 { eng: "about", ch: "關於(介)" },
    { eng: "memorable", ch: "難忘的(形)" },
    { eng: "reply", ch: "回覆(動、名) +to" },
    { eng: "a few", ch: "一些(+可數名詞)" },
    { eng: "perfect", ch: "完美的(形)" },
    { eng: "yell", ch: "大吼(動) +at" },
    { eng: "in person", ch: "親自" },
    { eng: "the rest of", ch: "剩下的、其餘的" },
    { eng: "start", ch: "開始(動、名)" },
    { eng: "accidentally", ch: "意外地(副)" },
  {eng: "recall", ch: "回想(動)" },
    {eng: "presentation", ch: "(上台)報告(名)" },
    {eng: "take...seriously", ch: "認真看待..." },
    {eng: "skip", ch: "跳過、略過(動)" },
    {eng: "ruin", ch: "破壞(動)" },
    {eng: "embarrassed", ch: "尷尬的(形)" },
    {eng: "depressed", ch: "低落沮喪的(形)" },
    {eng: "let... down", ch: "讓...失望" },
    {eng: "upset", ch: "使...沮喪(動)" },
    {eng: "reflect on", ch: "在...事情上反省(動)" },
    {eng: "make sure", ch: "確保" },
    {eng: "put... first", ch: "把...放在首位" },
    {eng: "feel", ch: "感覺、感到(動)" },
    {eng: "in front of", ch: "在...前" },
    {eng: "prepare", ch: "準備(動)" },
    {eng: "meeting", ch: "會議(名)" },
  { eng: "failure", ch: "失敗(n.)" },
  { eng: "remind", ch: "提醒、使...想起(v.)" },
  { eng: "realize", ch: "了解(v.)" },
  { eng: "traditional", ch: "傳統的(adj.)" },
  { eng: "fortunately", ch: "幸運地(adv.)" },
  { eng: "take... seriously", ch: "認真看待..." },
  { eng: "let down", ch: "讓...失望" },
  { eng: "dress up", ch: "裝扮" },
  { eng: "relationship", ch: "關係、戀愛關係(n.)"},
   { eng: "satisfying", ch: "令人滿意的(adj.)"},
   { eng: "inspire", ch: "激勵(v.)"},
   { eng: "inspiration", ch: "靈感(n.)"},
   { eng: "connect", ch: "與他人建立良好關係(v.)"},
   { eng: "communicate", ch: "溝通(v.)"},
   { eng: "introduce (+to)", ch: "介紹、引進(v.)"},
    { eng: "throughout", ch: "自始至終(介)"},
   { eng: "message", ch: "訊息(n.)"},
   { eng: "refresh", ch: "刷新(v.)"},
   { eng: "romantic", ch: "浪漫的(adj.)"},
   { eng: "focus (+on)", ch: "專注(v.)"},
   { eng: "ignore", ch: "忽略(v.)"},
   { eng: "attention", ch: "注意力(n.)"},
    { eng: "deny", ch: "否認(v.)"},
   { eng: "respond (+to)", ch: "回應(v.)"},
   { eng: "disappointed", ch: "感到失望的(adj.)"},
   { eng: "personally", ch: "針對某人地(adv.)"},
   { eng: "personal", ch: "個人的(adj.)"},
   { eng: "in fact", ch: "事實上"},
   { eng: "take... personally", ch: "認為...是針對個人"},
    { eng: "turn to", ch: "轉向(某人)、求助於(某人)"},
   { eng: "hang out", ch: "與某人一起出去玩"},
   { eng: "in addition", ch: "除此之外"},
   { eng: "in case", ch: "以防萬一"},
   { eng: "go through", ch: "徹底瀏覽"}
];

let currentQueue = [];
let activeEng = [null, null, null, null, null];
let activeCh = [null, null, null, null, null];
let selectedEngSlot = null;
let selectedChSlot = null;
let startTime = 0;
let timerInterval = null;
let completedCount = 0;

// 追蹤答錯相關數據
let wrongCount = 0;
let wrongWordsSet = new Set();

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function initGame() {
  clearInterval(timerInterval);
  completedCount = 0;
  wrongCount = 0;
  wrongWordsSet.clear();
  selectedEngSlot = null;
  selectedChSlot = null;

  document.getElementById('progress').textContent = `0 / ${wordBank.length}`;
  document.getElementById('timer').textContent = '00:00';
  document.getElementById('result-modal').classList.add('hidden');

  const indexedWords = wordBank.map((item, index) => ({ ...item, id: index }));
  currentQueue = shuffle(indexedWords);

  // 初始化前 5 個單字
  const initialItems = [];
  for (let i = 0; i < 5 && currentQueue.length > 0; i++) {
    initialItems.push(currentQueue.pop());
  }

  activeEng = [...initialItems];
  activeCh = shuffle([...initialItems]);

  // 開局初始化不執行 fade out 動畫，直接渲染
  updateSlotContentsSmoothly(-1, false);

  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
}

function updateSlotContentsSmoothly(replacedEngIndex = -1, animate = true) {
  const engSlots = document.querySelectorAll('#english-column .slot');
  const chSlots = document.querySelectorAll('#chinese-column .slot');

  // 定義要觸發 fade 動畫的文字元素 (Span)
  let fadingSpans = [];

  if (animate) {
    // 右側全部中文均套用淡入淡出
    chSlots.forEach(slot => {
      const span = slot.querySelector('.slot-text');
      if (span) fadingSpans.push(span);
    });

    // 左側英文只針對「新替補位置」的文字套用淡入淡出
    if (replacedEngIndex !== -1 && engSlots[replacedEngIndex]) {
      const span = engSlots[replacedEngIndex].querySelector('.slot-text');
      if (span) fadingSpans.push(span);
    }
  }

  const updateTexts = () => {
    // 1. 更新左側英文 (維持原位，僅替換指定 Index)
    engSlots.forEach((slot, i) => {
      const span = slot.querySelector('.slot-text');
      if (activeEng[i]) {
        span.textContent = activeEng[i].eng;
        slot.dataset.id = activeEng[i].id;
        slot.style.visibility = 'visible';
      } else {
        slot.style.visibility = 'hidden';
        slot.dataset.id = '';
      }
      slot.classList.remove('selected', 'wrong');
    });

    // 2. 更新右側中文 (全新打亂後的順序)
    chSlots.forEach((slot, i) => {
      const span = slot.querySelector('.slot-text');
      if (activeCh[i]) {
        span.textContent = activeCh[i].ch;
        slot.dataset.id = activeCh[i].id;
        slot.style.visibility = 'visible';
      } else {
        slot.style.visibility = 'hidden';
        slot.dataset.id = '';
      }
      slot.classList.remove('selected', 'wrong');
    });

    // 文字替換後，移除透明度遮罩觸發 Fade In
    fadingSpans.forEach(span => span.classList.remove('text-fade-out'));
  };

  if (animate && fadingSpans.length > 0) {
    // 觸發 Fade Out
    fadingSpans.forEach(span => span.classList.add('text-fade-out'));
    // 等待 Fade Out 完成後更換文字，再 Fade In
    setTimeout(updateTexts, 600);
  } else {
    updateTexts();
  }
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  document.getElementById('timer').textContent = `${minutes}:${seconds}`;
}

function handleEngClick(e) {
  const slot = e.currentTarget;
  if (!slot.dataset.id) return;

  document.querySelectorAll('#english-column .slot').forEach(s => s.classList.remove('selected', 'wrong'));
  slot.classList.add('selected');
  selectedEngSlot = slot;

  checkMatch();
}

function handleChClick(e) {
  const slot = e.currentTarget;
  if (!slot.dataset.id) return;

  document.querySelectorAll('#chinese-column .slot').forEach(s => s.classList.remove('selected', 'wrong'));
  slot.classList.add('selected');
  selectedChSlot = slot;

  checkMatch();
}

function checkMatch() {
  if (!selectedEngSlot || !selectedChSlot) return;

  const engId = selectedEngSlot.dataset.id;
  const chId = selectedChSlot.dataset.id;

  if (engId === chId) {
    completedCount++;
    document.getElementById('progress').textContent = `${completedCount} / ${wordBank.length}`;

    // 取得配對成功的英文索引
    const engIndex = activeEng.findIndex(item => item && String(item.id) === engId);

    // 抽出一組新單字
    const newItem = currentQueue.length > 0 ? currentQueue.pop() : null;

    // 1. 左側英文：只更新被消除的那格，其他 4 格不變
    activeEng[engIndex] = newItem;

    // 2. 右側中文：扣除舊單字、加入新單字並洗牌
    activeCh = activeCh.filter(item => item && String(item.id) !== chId);
    if (newItem) {
      activeCh.push(newItem);
    }
    activeCh = shuffle(activeCh);

    selectedEngSlot = null;
    selectedChSlot = null;

    // 若英文全數清空，宣告通關
    if (activeEng.every(item => item === null)) {
      setTimeout(showResult, 600);
    } else {
      // 傳入 engIndex，讓系統知道「只有該格英文需要 fade 效果」
      updateSlotContentsSmoothly(engIndex, true);
    }
  } else {
    // 答錯時：紀錄錯題數與錯過的英文單字
    wrongCount++;
    const wrongWordObj = wordBank[parseInt(engId, 10)];
    if (wrongWordObj) {
      wrongWordsSet.add(wrongWordObj.eng);
    }

    selectedEngSlot.classList.add('wrong');
    selectedChSlot.classList.add('wrong');

    const eSlot = selectedEngSlot;
    const cSlot = selectedChSlot;

    setTimeout(() => {
      eSlot.classList.remove('selected', 'wrong');
      cSlot.classList.remove('selected', 'wrong');
    }, 500);

    selectedEngSlot = null;
    selectedChSlot = null;
  }
}

// 發送詳細數據至 Google Sheets
function sendResultToGoogleSheet(timeSpent, correctCount, wrongCount, wrongWords) {
  if (!GOOGLE_SHEET_URL) return;

  const payload = {
    timestamp: new Date().toLocaleString('zh-TW'), // 學生做測驗的時間
    timeSpent: timeSpent,                          // 做了多久
    correctCount: correctCount,                    // 對了幾題
    wrongCount: wrongCount,                        // 錯了幾題
    wrongWords: wrongWords                         // 考錯的單字
  };

  fetch(GOOGLE_SHEET_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }).catch(error => console.error('Error sending data to Google Sheet:', error));
}

function showResult() {
  clearInterval(timerInterval);
  const finalTime = document.getElementById('timer').textContent;
  document.getElementById('final-time').textContent = finalTime;
  document.getElementById('result-modal').classList.remove('hidden');

  // 對題數為總題數 (所有單字皆完成配對)
  const correctCount = wordBank.length;
  // 將錯字 Set 轉為以逗點分隔的字串
  const wrongWordsString = wrongWordsSet.size > 0 ? Array.from(wrongWordsSet).join(', ') : '無';

  // 通關時發送資料
  sendResultToGoogleSheet(finalTime, correctCount, wrongCount, wrongWordsString);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#english-column .slot').forEach(slot => {
    slot.addEventListener('click', handleEngClick);
  });

  document.querySelectorAll('#chinese-column .slot').forEach(slot => {
    slot.addEventListener('click', handleChClick);
  });

  document.getElementById('restart-btn').addEventListener('click', initGame);
  document.getElementById('modal-restart-btn').addEventListener('click', initGame);

  initGame();
});
