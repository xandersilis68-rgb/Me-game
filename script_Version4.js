// Me-game — Fun update: images, points, money, playful feedback!

const STORAGE_KEY = 'megame:v3';

const teams = [
  { id: 'eng', name: 'England', flag: 'images/flags/england.png' },
  { id: 'bra', name: 'Brazil',  flag: 'images/flags/brazil.png' },
  { id: 'esp', name: 'Spain',   flag: 'images/flags/spain.png' },
  { id: 'ger', name: 'Germany', flag: 'images/flags/germany.png' }
];
const teamIdToIso = { eng: 'gb', bra: 'br', esp: 'es', ger: 'de' };

// Each player now has a fun image by default!
const defaultPlayers = [
  { id: 'p1', name: 'Alex Carter', position: 'Goalkeeper', image: 'https://randomuser.me/api/portraits/men/11.jpg', owned: false, selected: false, team: 'eng' },
  { id: 'p2', name: 'Sam Ruiz',    position: 'Defender',   image: 'https://randomuser.me/api/portraits/men/22.jpg', owned: false, selected: false, team: 'eng' },
  { id: 'p3', name: 'Lee Park',    position: 'Midfielder', image: 'https://randomuser.me/api/portraits/men/33.jpg', owned: false, selected: false, team: 'bra' },
  { id: 'p4', name: 'M. Silva',    position: 'Forward',    image: 'https://randomuser.me/api/portraits/women/44.jpg', owned: false, selected: false, team: 'esp' },
  { id: 'p5', name: 'A. Gomez',    position: 'Midfielder', image: 'https://randomuser.me/api/portraits/women/55.jpg', owned: false, selected: false, team: 'ger' }
];

const fallbackImage = 'https://avatars.dicebear.com/api/avataaars/default.svg';

let players = [];
let selectedTeam = teams[0].id;
let filters = { search: '', position: '', team: '' };
let points = 10; // Starting points
let money = 100; // Starting money

const playersContainer = document.getElementById('players-container');
const rosterEl = document.getElementById('roster');
const teamSelect = document.getElementById('team-select');
const teamFlag = document.getElementById('team-flag');
const teamFilter = document.getElementById('team-filter');
const filterFlag = document.getElementById('filter-flag');
const positionFilter = document.getElementById('position-filter');
const searchInput = document.getElementById('search-input');
const resetBtn = document.getElementById('reset-btn');
const saveBtn = document.getElementById('save-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const pointsEl = document.getElementById('points');
const moneyEl = document.getElementById('money');
const losePointBtn = document.getElementById('lose-point-btn');
const loseMoneyBtn = document.getElementById('lose-money-btn');
const feedbackEl = document.getElementById('feedback');

function init(){
  loadState();
  if(!players || players.length === 0) players = structuredClone(defaultPlayers);
  populateTeamControls();
  populatePositionFilter();
  attachEvents();
  render();
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const parsed = JSON.parse(raw);
    players = parsed.players || [];
    selectedTeam = parsed.selectedTeam || teams[0].id;
    points = typeof parsed.points === 'number' ? parsed.points : 10;
    money = typeof parsed.money === 'number' ? parsed.money : 100;
  }catch(e){}
}

function saveState(){
  const data = { players, selectedTeam, points, money };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function resetAll(){
  if(!confirm('Reset game data to defaults? This will clear saved local state.')) return;
  players = structuredClone(defaultPlayers);
  selectedTeam = teams[0].id;
  points = 10;
  money = 100;
  saveState();
  render();
  showFeedback("Game reset! 🎮");
}

function populateTeamControls(){
  teamSelect.innerHTML = '';
  teamFilter.innerHTML = '';
  teams.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    teamSelect.appendChild(opt);
    teamFilter.appendChild(opt.cloneNode(true));
  });
  teamSelect.value = selectedTeam;
  teamFilter.value = filters.team || '';
  updateTeamFlag();
  updateFilterFlag();
}

function populatePositionFilter(){
  const positions = Array.from(new Set([...defaultPlayers.map(p=>p.position), ...players.map(p=>p.position)])).filter(Boolean).sort();
  positionFilter.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = '';
  allOpt.textContent = 'All';
  positionFilter.appendChild(allOpt);
  positions.forEach(pos => {
    const opt = document.createElement('option');
    opt.value = pos;
    opt.textContent = pos;
    positionFilter.appendChild(opt);
  });
  positionFilter.value = filters.position || '';
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function renderPlayers(){
  playersContainer.innerHTML = '';
  const list = applyFilters(players);
  if(list.length === 0){
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'No players match your filters.';
    playersContainer.appendChild(p);
    return;
  }
  list.forEach(player=>{
    const card = document.createElement('article');
    card.className = 'player-card';
    card.setAttribute('draggable','true');
    card.dataset.playerId = player.id;
    card.innerHTML = `
      <img class="player-image" src="${escapeHtml(player.image)}" alt="${escapeHtml(player.name)} photo" />
      <div class="meta">
        <div>
          <div class="name">${escapeHtml(player.name)}</div>
          <div class="position">${escapeHtml(player.position)}</div>
        </div>
        <div class="muted small">${getTeamName(player.team)}</div>
      </div>
      <div class="actions">
        <button class="small own-btn" ${player.owned ? 'disabled' : ''}>${player.owned ? 'Owned' : 'Own ($10)</button>
        <button class="small select-btn ${player.selected ? 'primary' : ''}" ${player.selected ? 'disabled' : ''}>${player.selected ? 'Selected' : 'Select ($5)'}</button>
        <button class="small assign-btn">Assign →</button>
      </div>
    `;
    // fallback image
    const img = card.querySelector('.player-image');
    img.onerror = () => img.src = fallbackImage;

    card.querySelector('.own-btn').addEventListener('click', () => onOwn(player.id, card));
    card.querySelector('.select-btn').addEventListener('click', () => onSelect(player.id, card));
    card.querySelector('.assign-btn').addEventListener('click', () => assignToTeam(player.id, teamSelect.value, card));

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', player.id);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));

    playersContainer.appendChild(card);
  });
}

function renderRoster(){
  rosterEl.innerHTML = '';
  const assigned = players.filter(p => p.team === teamSelect.value);
  if(assigned.length === 0){
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'No players assigned to this team yet. Drag players here or click "Assign".';
    rosterEl.appendChild(p);
    return;
  }
  assigned.forEach(p => {
    const item = document.createElement('div');
    item.className = 'roster-item';
    item.dataset.playerId = p.id;
    item.innerHTML = `
      <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" style="width:46px;height:46px;border-radius:6px;object-fit:cover" />
      <div style="flex:1">
        <div style="font-weight:700">${escapeHtml(p.name)}</div>
        <div class="muted" style="font-size:0.9rem">${escapeHtml(p.position)}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="small unassign">Remove</button>
      </div>
    `;
    const img = item.querySelector('img');
    img.onerror = () => img.src = fallbackImage;
    item.querySelector('.unassign').addEventListener('click', () => {
      p.team = '';
      saveState();
      render();
      showFeedback(`Removed ${p.name} from your team! 😢`);
    });
    rosterEl.appendChild(item);
  });
}

function renderScoreboard(){
  pointsEl.textContent = `Points: ${points}`;
  moneyEl.textContent = `Money: $${money}`;
}

function onOwn(playerId, card){
  const p = players.find(x => x.id === playerId);
  if(!p) return;
  if(p.owned) return showFeedback('Player already owned!');
  if(money < 10) return showFeedback("Not enough money!");
  p.owned = true;
  p.team = teamSelect.value;
  money -= 10;
  saveState();
  animateCard(card);
  render();
  showFeedback(`You owned ${p.name}! -$10 💸`);
}

function onSelect(playerId, card){
  const p = players.find(x => x.id === playerId);
  if(!p) return;
  if(p.selected) return showFeedback("Player already selected!");
  if(money < 5) return showFeedback("Not enough money!");
  players.forEach(x => x.selected = false);
  p.selected = true;
  money -= 5;
  points += 1;
  saveState();
  animateCard(card);
  render();
  showFeedback(`You selected ${p.name}! -$5, +1pt 🎯`);
}

function assignToTeam(playerId, teamId, card){
  const p = players.find(x => x.id === playerId);
  if(!p) return;
  p.team = teamId;
  saveState();
  animateCard(card);
  render();
  showFeedback(`Assigned ${p.name} to ${getTeamName(teamId)}!`);
}

function losePoint(){
  if(points <= 0) return showFeedback("You can't go below 0 points!");
  points--;
  saveState();
  renderScoreboard();
  showFeedback("Oops! You lost a point. 😟");
}
function loseMoney(){
  if(money < 10) return showFeedback("You can't go below $0!");
  money -= 10;
  saveState();
  renderScoreboard();
  showFeedback("Lost $10! 💸");
}

function showFeedback(msg){
  feedbackEl.textContent = msg;
  feedbackEl.classList.add('show');
  setTimeout(() => feedbackEl.classList.remove('show'), 1800);
}
function animateCard(card){
  card.classList.add('animated');
  setTimeout(()=>card.classList.remove('animated'), 800);
}

function applyFilters(list){
  let out = [...list];
  if(filters.search){
    const q = filters.search.toLowerCase();
    out = out.filter(p => (p.name + ' ' + p.position + ' ' + (p.team || '')).toLowerCase().includes(q));
  }
  if(filters.position) out = out.filter(p => p.position === filters.position);
  if(filters.team) out = out.filter(p => p.team === filters.team);
  return out;
}

function getTeamName(id){ const t = teams.find(x => x.id === id); return t ? t.name : '—'; }
function updateTeamFlag(){
  const t = teams.find(x=>x.id===teamSelect.value);
  if(!t) {
    teamFlag.src = '';
    return;
  }
  teamFlag.src = t.flag;
  teamFlag.onerror = () => teamFlag.src = `https://flagcdn.com/w80/${teamIdToIso[t.id]}.png`;
}
function updateFilterFlag(){
  const t = teams.find(x=>x.id===teamFilter.value);
  if(!t) {
    filterFlag.src = '';
    return;
  }
  filterFlag.src = t.flag;
  filterFlag.onerror = () => filterFlag.src = `https://flagcdn.com/w80/${teamIdToIso[t.id]}.png`;
}

function render(){
  populatePositionFilter();
  renderPlayers();
  renderRoster();
  renderScoreboard();
  updateTeamFlag();
  updateFilterFlag();
}

function attachEvents(){
  teamSelect.addEventListener('change', () => {
    selectedTeam = teamSelect.value;
    saveState();
    render();
  });
  teamFilter.addEventListener('change', () => {
    filters.team = teamFilter.value || '';
    updateFilterFlag();
    render();
  });
  positionFilter.addEventListener('change', () => {
    filters.position = positionFilter.value || '';
    render();
  });
  searchInput.addEventListener('input', (e) => {
    filters.search = e.target.value.trim();
    render();
  });
  resetBtn.addEventListener('click', resetAll);
  saveBtn.addEventListener('click', () => { saveState(); showFeedback("Saved! 💾"); });
  exportBtn.addEventListener('click', () => {
    const data = JSON.stringify({ players, selectedTeam, points, money }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'megame-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showFeedback("Exported game data! 📤");
  });
  importBtn.addEventListener('click', async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try{
          const obj = JSON.parse(reader.result);
          if(obj.players) players = obj.players;
          if(obj.selectedTeam) selectedTeam = obj.selectedTeam;
          if(typeof obj.points === 'number') points = obj.points;
          if(typeof obj.money === 'number') money = obj.money;
          saveState();
          render();
          showFeedback('Import successful! 📥');
        }catch(e){
          showFeedback('Import failed.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
  losePointBtn.addEventListener('click', losePoint);
  loseMoneyBtn.addEventListener('click', loseMoney);

  rosterEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    rosterEl.style.borderColor = '#cfe3ff';
  });
  rosterEl.addEventListener('dragleave', () => {
    rosterEl.style.borderColor = '#e6e9f0';
  });
  rosterEl.addEventListener('drop', (e) => {
    e.preventDefault();
    rosterEl.style.borderColor = '#e6e9f0';
    const id = e.dataTransfer.getData('text/plain');
    if(id) assignToTeam(id, teamSelect.value);
  });
  rosterEl.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') {
      const id = prompt('Assign player id to this team (player id):');
      if(id) assignToTeam(id, teamSelect.value);
    }
  });
}

init();