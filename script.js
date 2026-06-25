// 1. 單字資料庫 (包含所有單字)
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
];

// 2. 遊戲狀態與記錄變數
let wordPool = [];
let activeEng = [];
let activeCh = [];
let selectedEngSlot = null;
let selectedChSlot = null;
let remainingCount = 0;
let successScore = 0;
let errorScore = 0;
let wrongWordsSet = new Set();
let startTime = null; // 用於計算單輪花費秒數

// ⚠️ 請把你在 Google Apps Script 部署得到的 Web App 網址貼在下方雙引號內：
const GOOGLE_APP_URL = "https://script.google.com/macros/s/AKfycbwxQzgOPKMe8QQE_CZhEyq42uInQ_Nxmf9pT5dLUxBpFUgar9lPZtDtsKmcLneeOJTBBg/exec";

// 3. 亂數洗牌函數 (Fisher-Yates Shuffle)
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// 4. 初始化遊戲
function initGame() {
  let allWords = [...wordBank];
  shuffle(allWords);

  // 每回嚴格抽取 45 個單字測試
  const gameSize = Math.min(45, allWords.length);
  wordPool = allWords.slice(0, gameSize);
  remainingCount = wordPool.length;
  successScore = 0;
  errorScore = 0;
  wrongWordsSet.clear();
  updateScoreboard();

  // ⏱️ 記錄此輪遊戲的起點時間
  startTime = new Date();

  activeEng = [];
  activeCh = [];
  const initialDraw = Math.min(5, wordPool.length);
  for (let i = 0; i < initialDraw; i++) {
    const word = wordPool.pop();
    activeEng.push(word);
    activeCh.push(word);
  }

  shuffle(activeCh);
  renderColumns();

  document.getElementById('result-modal').classList.add('hidden');
  selectedEngSlot = null;
  selectedChSlot = null;
}

// 5. 更新計分板
function updateScoreboard() {
  document.getElementById('remaining-count').textContent = remainingCount;
  document.getElementById('success-score').textContent = successScore;
  document.getElementById('error-score').textContent = errorScore;
}

// 6. 渲染欄位
function renderColumns() {
  const engColumn = document.getElementById('english-column');
  const chColumn = document.getElementById('chinese-column');
  engColumn.innerHTML = '';
  chColumn.innerHTML = '';

  activeEng.forEach(word => {
    const slot = document.createElement('div');
    slot.className = 'slot fade-in';
    slot.textContent = word.eng;
    slot.dataset.type = 'eng';
    slot.dataset.word = word.eng;
    slot.addEventListener('click', handleEngClick);
    engColumn.appendChild(slot);
  });

  activeCh.forEach(word => {
    const slot = document.createElement('div');
    slot.className = 'slot fade-in';
    slot.textContent = word.ch;
    slot.dataset.type = 'ch';
    slot.dataset.word = word.eng;
    slot.addEventListener('click', handleChClick);
    chColumn.appendChild(slot);
  });
}

// 7. 點擊英文欄處理
function handleEngClick(e) {
  if (selectedEngSlot) {
    selectedEngSlot.classList.remove('selected');
  }
  selectedEngSlot = e.target;
  selectedEngSlot.classList.add('selected');

  if (selectedChSlot) {
    checkMatch();
  }
}

// 8. 點擊中文欄處理
function handleChClick(e) {
  if (selectedChSlot) {
    selectedChSlot.classList.remove('selected');
  }
  selectedChSlot = e.target;
  selectedChSlot.classList.add('selected');

  if (selectedEngSlot) {
    checkMatch();
  }
}

// 9. 檢查是否配對成功
function checkMatch() {
  const engWord = selectedEngSlot.dataset.word;
  const chWord = selectedChSlot.dataset.word;

  if (engWord === chWord) {
    // 配對成功
    selectedEngSlot.classList.add('fade-out');
    selectedChSlot.classList.add('fade-out');
    remainingCount--;
    successScore++;
    updateScoreboard();

    selectedEngSlot = null;
    selectedChSlot = null;

    setTimeout(() => {
      // 🎯 關鍵修正：精準找出這顆單字在 activeEng 與 activeCh 陣列中的記憶體位置
      const engIndex = activeEng.findIndex(w => w.eng === engWord);
      const chIndex = activeCh.findIndex(w => w.eng === engWord);

      if (wordPool.length > 0) {
        // 字庫還有字，抽新字精準遞補到該位置
        const nextWord = wordPool.pop();
        if (engIndex !== -1) activeEng[engIndex] = nextWord;
        if (chIndex !== -1) activeCh[chIndex] = nextWord;
      } else {
        // 字庫空了，將此題從記憶體陣列中精準移除（畫面單字開始遞減）
        if (engIndex !== -1) activeEng.splice(engIndex, 1);
        if (chIndex !== -1) activeCh.splice(chIndex, 1);
      }

      // 🎲 每次答對後，將剩下的中文陣列重新亂數洗牌
      shuffle(activeCh);

      // 🔄 關鍵修正：直接呼叫 renderColumns()，徹底杜絕 DOM 節點與資料錯位的卡關 Bug
      renderColumns();

      // 🏁 檢查遊戲是否結束
      if (activeEng.length === 0) {
        showResult();
      }
    }, 500);

  } else {
    // 配對失敗
    errorScore++;
    updateScoreboard();

    const wrongEngText = selectedEngSlot.textContent;
    const correctWordObj = wordBank.find(w => w.eng === wrongEngText);
    if (correctWordObj) {
      wrongWordsSet.add(`${correctWordObj.eng}(${correctWordObj.ch})`);
    }

    selectedEngSlot.classList.add('wrong');
    selectedChSlot.classList.add('wrong');

    const currentEng = selectedEngSlot;
    const currentCh = selectedChSlot;
    selectedEngSlot = null;
    selectedChSlot = null;

    setTimeout(() => {
      currentEng.classList.remove('selected', 'wrong');
      currentCh.classList.remove('selected', 'wrong');
    }, 500);
  }
}

// 10. 顯示結算畫面彈出視窗 + 暗中上傳結果與時間記錄至 Google 試算表
function showResult() {
  document.getElementById('final-success').textContent = successScore;
  document.getElementById('final-error').textContent = errorScore;

  const wrongWordsList = document.getElementById('wrong-words-list');
  wrongWordsList.innerHTML = '';
  let wrongWordsString = "";

  if (wrongWordsSet.size > 0) {
    document.getElementById('wrong-words-box').style.display = 'block';
    let items = [];
    wrongWordsSet.forEach(wordStr => {
      items.push(wordStr);
      const li = document.createElement('li');
      li.textContent = wordStr;
      wrongWordsList.appendChild(li);
    });
    wrongWordsString = items.join(", ");
  } else {
    document.getElementById('wrong-words-box').style.display = 'none';
    wrongWordsString = "無答錯單字";
  }

  // ⏱️ 計算時間花費（秒數）
  const endTime = new Date();
  const timeSpentSeconds = startTime ? Math.round((endTime - startTime) / 1000) : 0;

  // 🤫 修正傳輸格式：改用 text/plain 繞過瀏覽器的 CORS 攔截，確保 100% 成功傳送
  if (GOOGLE_APP_URL && GOOGLE_APP_URL !== "YOUR_PASTED_URL_HERE") {
    fetch(GOOGLE_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        successScore: successScore,
        errorScore: errorScore,
        wrongWords: wrongWordsString,
        timeSpent: timeSpentSeconds
      })
    }).catch(err => console.log("Silent logging status:", err));
  }

  document.getElementById('result-modal').classList.remove('hidden');
}

// 11. 監聽重新開始按鈕與網頁載入
document.getElementById('restart-btn').addEventListener('click', initGame);
window.addEventListener('DOMContentLoaded', initGame);
