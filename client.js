const socket = io();
const role = document.body.dataset.role;
socket.emit('join', role);

let soundEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep() {
  if (!soundEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = 800;
  gain.gain.value = 0.3;
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

// تحديث الإعدادات
socket.on('settings', (settings) => {
  soundEnabled = settings.soundEnabled;
  document.getElementById('competition-name') && (document.getElementById('competition-name').textContent = settings.competitionName);
  // تحديث أسماء الفرق في الأزرار إذا وجدت
  const t1Labels = document.querySelectorAll('.team1-label');
  const t2Labels = document.querySelectorAll('.team2-label');
  t1Labels.forEach(el => el.textContent = `نقطة لـ ${settings.team1Name}`);
  t2Labels.forEach(el => el.textContent = `نقطة لـ ${settings.team2Name}`);
  const modeBtn = document.getElementById('host-mode-toggle');
  if (modeBtn) modeBtn.textContent = 'وضع المقدم: ' + (settings.hostMode === 'auto' ? 'آلي' : 'بشري');
});

// لوحة السداسيات
if (role === 'display') {
  const board = document.getElementById('hex-board');
  function renderBoard(state) {
    board.innerHTML = '';
    state.cells.forEach((cell, i) => {
      const hex = document.createElement('div');
      hex.className = 'hex';
      if (cell.color) {
        hex.style.backgroundColor = cell.color;
      }
      hex.textContent = cell.letter;
      hex.onclick = () => socket.emit('select-cell', i);
      board.appendChild(hex);
    });
  }
  socket.on('game-state', renderBoard);
  socket.on('cell-update', (data) => {
    const hex = board.children[data.cellIndex];
    if (hex) hex.style.backgroundColor = data.color;
  });

  // إظهار النافذة المنبثقة
  function showModal(html) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-body').innerHTML = html;
    modal.classList.remove('hidden');
  }
  window.closeModal = () => document.getElementById('modal').classList.add('hidden');

  socket.on('new-question', (data) => {
    showModal(`
      <h3>حرف ${data.letter}</h3>
      <p>${data.question}</p>
      <div id="answer-area" class="hidden"><p>${data.answer}</p></div>
      <button id="reveal-btn">إظهار الإجابة</button>
      <div class="team-btns hidden" id="team-btns">
        <button class="team1-btn team1-label">نقطة للفريق 1</button>
        <button class="team2-btn team2-label">نقطة للفريق 2</button>
      </div>
      <button onclick="closeModal()">إغلاق</button>
    `);
    document.getElementById('reveal-btn').onclick = () => {
      document.getElementById('answer-area').classList.remove('hidden');
      document.getElementById('team-btns').classList.remove('hidden');
      socket.emit('reveal-answer');
    };
    document.querySelector('.team1-btn').onclick = () => socket.emit('assign-point', { teamIndex: 0 });
    document.querySelector('.team2-btn').onclick = () => socket.emit('assign-point', { teamIndex: 1 });
  });

  socket.on('cell-selected', (data) => {
    showModal(`<h3>حرف ${data.letter}</h3><p>تم اختيار الحرف. السؤال عند المقدم.</p>`);
  });

  socket.on('question-cleared', () => {
    document.getElementById('modal').classList.add('hidden');
  });

  // مؤقت
  const timerDisplay = document.getElementById('timer-display');
  socket.on('timer-update', (data) => {
    timerDisplay.classList.remove('hidden');
    timerDisplay.textContent = `الوقت المتبقي: ${data.remaining}`;
  });
  socket.on('timer-ended', () => {
    timerDisplay.classList.add('hidden');
  });
  socket.on('buzzer-winner', (data) => {
    showModal(`<h3>${data.name} من فريق ${data.teamName} ضغط أولاً!</h3>`);
    setTimeout(() => document.getElementById('modal').classList.add('hidden'), 3000);
  });
  socket.on('buzzer-winner-clear', () => {
    document.getElementById('modal').classList.add('hidden');
  });

  // القائمة الجانبية
  document.getElementById('sidebar-toggle').onclick = () => {
    document.getElementById('sidebar-content').classList.toggle('hidden');
  };
  document.getElementById('toggle-sound').onclick = function () {
    soundEnabled = !soundEnabled;
    this.textContent = soundEnabled ? 'الصوت: مفعل' : 'الصوت: صامت';
    socket.emit('update-settings', { soundEnabled });
  };
}