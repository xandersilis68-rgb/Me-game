// Me-game — Improved UI + persistence + drag & drop + search & filters
// NOTE: add images to images/players and images/flags and a placeholder at images/placeholder-player.png

const STORAGE_KEY = 'megame:v2';

const teams = [
  { id: 'eng', name: 'England', flag: 'images/flags/england.png' },
  { id: 'bra', name: 'Brazil', flag: 'images/flags/brazil.png' },
  { id: 'esp', name: 'Spain', flag: 'images/flags/spain.png' },
  { id: 'ger', name: 'Germany', flag: 'images/flags/germany.png' }
];

// Example players — replace or expand. Each id must be unique.
const defaultPlayers = [
  { id: 'p1', name: 'Alex Carter', position: 'Goalkeeper', image: 'images/players/p1.jpg', owned: false, selected: false, team: 'eng' },
  { id: 'p2', name: 'Sam Ruiz',    position: 'Defender',   image: 'images/players/p2.jpg', owned: false, selected: false, team: 'eng' },
  { id: 'p3', name: 'Lee Park',    position: 'Midfielder', image: 'images/players/p3.jpg', owned: false, selected: false, team: 'bra' },
  { id: 'p4', name: 'M. Silva',    position: 'Forward',    image: 'images/players/p4.jpg', owned: false, selected: false, team: 'esp' },
  { id: 'p5', name: 'A. Gomez',    position: 'Midfielder', image: 'images/players/p5.jpg', owned: false, selected: false, team: 'ger' }
];

const fallbackImage = 'images/placeholder-player.png';

// App state
let players = [];
let selectedTeam = teams[0].id;
let filters = { search: '', position: '', team: '' };

// Elements
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

// Initialize app
function init(){
  loadState();
  if(!players || players.length === 0) players = structuredClone(defaultPlayers);

  populateTeamControls();
  populatePositionFilter();
  attachEvents();
  render();
}

// Persistence helpers
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const parsed = JSON.parse(raw);
    players = parsed.players || [];
    selectedTeam = parsed.selectedTeam || teams[0].id;
  }catch(e){
    console.warn('Failed to load state', e);
  }
}

function saveState(){
  const data = { players, selectedTeam };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  alert('Saved locally.');
}

// Reset to defaults
function resetAll(){
  if(!confirm('Reset game data to defaults? This will clear saved local state.')) return;
  players = structuredClone(defaultPlayers);
  selectedTeam = teams[0].id;
  saveState();
  render();
}

// UI builders
function populateTeamControls(){
  teamSelect.innerHTML = '';
  teamFilter.innerHTML = '';
  teams.forEach((t, idx) => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    teamSelect.appendChild(opt);

    const opt2 = opt.cloneNode(true);
    teamFilter.appendChild(opt2);
  });
  teamSelect.value = selectedTeam;
  teamFilter.value = filters.team || '';
  updateTeamFlag();
  updateFilterFlag();
}

function populatePositionFilter(){
  const positions = Array.from(new Set([...defaultPlayers.map(p=>p.position), ...players.map(p=>p.position)])).filter(Boolean).sort();
  positionFilter.innerHTML = '<option value="">All</option>';
  positions.forEach(pos => {
    const opt = document.createElement('option');
    opt.value = pos;
    opt.textContent = pos;
    positionFilter.appendChild(opt);
  });
  positionFilter.value = filters.position || '';
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// Render players list
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
        <button class="small own-btn" ${player.owned ? 'disabled' : ''}>${player.owned ? 'Owned' : 'Own'}</button>
        <button class="small select-btn ${player.selected ? 'primary' : ''}" ${player.selected ? 'disabled' : ''}>${player.selected ? 'Selected' : 'Select'}</button>
        <button class="small assign-btn">Assign →</button>
      </div>
    `;
    // image fallback
    const img = card.querySelector('.player-image');
    img.onerror = () => img.src = fallbackImage;

    // button handlers
    card.querySelector('.own-btn').addEventListener('click', () => onOwn(player.id));
    card.querySelector('.select-btn').addEventListener('click', () => onSelect(player.id));
    card.querySelector('.assign-btn').addEventListener('click', () => assignToTeam(player.id, teamSelect.value));

    // drag handlers
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', player.id);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));

    playersContainer.appendChild(card);
  });
}

// Render roster (players assigned to selected team)
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
    // fallback image
    const img = item.querySelector('img');
    img.onerror = () => img.src = fallbackImage;

    item.querySelector('.unassign').addEventListener('click', () => {
      p.team = '';
      render();
    });

    rosterEl.appendChild(item);
  });
}

// Actions
function onOwn(playerId){
  const p = players.find(x => x.id === playerId);
  if(!p) return;
  if(p.owned) return alert('Player already owned.');
  p.owned = true;
  // assign to current team optionally
  p.team = teamSelect.value;
  saveState();
  render();
}

function onSelect(playerId){
  const p = players.find(x => x.id === playerId);
  if(!p) return;
  if(p.selected) return alert('Player already selected.');
  // enforce unique selection: deselect others
  players.forEach(x => x.selected = false);
  p.selected = true;
  saveState();
  render();
}

function assignToTeam(playerId, teamId){
  const p = players.find(x => x.id === playerId);
  if(!p) return;
  p.team = teamId;
  saveState();
  render();
}

// Filters
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

// Helpers
function getTeamName(id){ const t = teams.find(x => x.id === id); return t ? t.name : '—'; }
function updateTeamFlag(){ const t = teams.find(x=>x.id===teamSelect.value); teamFlag.src = t ? t.flag : ''; teamFlag.onerror = () => teamFlag.src = ''; }
function updateFilterFlag(){ const t = teams.find(x=>x.id===teamFilter.value); filterFlag.src = t ? t.flag : ''; filterFlag.onerror = () => filterFlag.src = ''; }

// Render everything
function render(){
  populatePositionFilter();
  renderPlayers();
  renderRoster();
  updateTeamFlag();
  updateFilterFlag();
}

// Events
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
  saveBtn.addEventListener('click', saveState);

  exportBtn.addEventListener('click', () => {
    const data = JSON.stringify({ players, selectedTeam }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'megame-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
          saveState();
          render();
          alert('Import successful');
        }catch(e){
          alert('Import failed: ' + e.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  // Roster drop area drag & drop
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

  // keyboard accessibility: allow Enter on roster to open quick assign prompt
  rosterEl.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') {
      const id = prompt('Assign player id to this team (player id):');
      if(id) assignToTeam(id, teamSelect.value);
    }
  });
}

// Run app
init();