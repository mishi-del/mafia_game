// Mafia Party Game - 8 Player, Pass & Play, Full Logic
const ROLES = [
  { name: "Mafia", count: 2 },
  { name: "Doctor", count: 1 },
  { name: "Detective", count: 1 },
  { name: "Citizen", count: 4 }
];

let players = [];
let roles = [];
let alive = [];
let dead = [];
let phase = "setup"; // setup | reveal | night | doctor | detective | nightResults | day | voteResults | end
let currentReveal = 0;
let mafiaTargets = [];
let mafiaVoted = [];
let doctorTarget = null;
let detectiveTarget = null;
let detectiveResult = "";
let nightVictim = null;
let savedPlayer = null;
let round = 1;
let dayVote = [];
let votedOut = null;

// Utility Functions
function shuffle(arr) {
  let a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function assignRoles() {
  let roleList = [];
  ROLES.forEach(role => {
    for (let i = 0; i < role.count; i++) roleList.push(role.name);
  });
  roleList = shuffle(roleList);
  roles = players.map((p, idx) => ({ name: p, role: roleList[idx], alive: true }));
  alive = roles.map(r => r.name);
  dead = [];
}

// DOM helpers
function $(id) { return document.getElementById(id); }

function render() {
  switch (phase) {
    case "setup": renderSetup(); break;
    case "reveal": renderReveal(); break;
    case "night": renderNight(); break;
    case "doctor": renderDoctor(); break;
    case "detective": renderDetective(); break;
    case "nightResults": renderNightResults(); break;
    case "day": renderDay(); break;
    case "voteResults": renderVoteResults(); break;
    case "end": renderEnd(); break;
  }
}

function renderSetup() {
  $("game-container").innerHTML = `
    <h1 class="kpop-glow">MAFIA PARTY GAME</h1>
    <h2>Enter 8 Player Names</h2>
    <form id="setup-form" autocomplete="off">
      <ul class="player-list" id="setup-list">
        ${players.map((p,i) =>
          `<li>${i+1}. ${p}</li>`).join('')}
      </ul>
      ${players.length < 8 ? `
        <input id="player-input" type="text" maxlength="12" placeholder="Player ${players.length+1} Name" autofocus />
        <button type="submit">Add</button>
      ` : ''}
      <button class="phase" id="start-btn" ${players.length === 8 ? '' : 'disabled'}>
        Start Game
      </button>
    </form>
    <div style="text-align:center;margin-top:20px;">
      <span style="font-size: 0.95em; opacity:0.7;">No bots. Pass device each turn.<br/>K-pop mystery drama style!</span>
    </div>
  `;
  const input = $("player-input");
  if (input) input.focus();
  $("setup-form").onsubmit = function(e) {
    e.preventDefault();
    if (players.length < 8) {
      const val = input.value.trim();
      if (val && !players.includes(val)) {
        players.push(val);
        render();
      }
    }
  }
  $("start-btn").onclick = function(e) {
    e.preventDefault();
    if (players.length === 8) {
      assignRoles();
      currentReveal = 0;
      phase = "reveal";
      render();
    }
  }
}

function renderReveal() {
  const player = roles[currentReveal];
  $("game-container").innerHTML = `
    <h2>Private Role Reveal</h2>
    <div style="margin:28px 0 24px 0;text-align:center;">
      <span style="font-size:1.15em;">
        Pass the device to <b style="color:var(--accent);">${player.name}</b>
      </span>
    </div>
    <div style="text-align:center;">
      <button id="reveal-btn" style="margin-bottom:22px;">Reveal Role</button>
      <div id="role-reveal" style="display:none;">
        <h3>Your Role:</h3>
        <span class="role-badge" style="font-size:1.35em;">${player.role}</span>
        <div style="margin:16px 0 0 0;font-size:1.01em;opacity:0.8;">
          <em>${roleDescription(player.role)}</em>
        </div>
      </div>
      <button id="next-reveal" style="display:none;margin-top:24px;">Next Player</button>
    </div>
    <div style="margin-top:40px;font-size:1em;color:var(--primary);text-align:center;">
      (Everyone else, close your eyes!)
    </div>
  `;
  $("reveal-btn").onclick = () => {
    $("role-reveal").style.display = "block";
    $("reveal-btn").style.display = "none";
    $("next-reveal").style.display = "inline-block";
  }
  $("next-reveal").onclick = () => {
    currentReveal++;
    if (currentReveal < roles.length) {
      renderReveal();
    } else {
      // Begin night phase
      mafiaVoted = [];
      mafiaTargets = [];
      phase = "night";
      render();
    }
  }
}

function roleDescription(role) {
  switch (role) {
    case "Mafia": return "Work with the other Mafia to eliminate others. At night, choose someone to kill.";
    case "Doctor": return "Each night, choose someone to save. If the Mafia targets them, they survive.";
    case "Detective": return "Each night, investigate a player to learn if they are Mafia.";
    case "Citizen": return "No special powers. Discuss and vote to find the Mafia!";
    default: return "";
  }
}

// --- Night Phase ---
function renderNight() {
  // Find next Mafia who hasn't picked yet
  const mafiaPlayers = roles.filter(r => r.role === "Mafia" && r.alive);
  const nextMafia = mafiaPlayers[mafiaVoted.length];
  if (nextMafia) {
    // Mafia pick
    $("game-container").innerHTML = `
      <h2>Night ${round} – Mafia (${mafiaVoted.length+1}/2)</h2>
      <div style="margin-top:22px;text-align:center;">Pass the device to <b style="color:var(--accent);">${nextMafia.name}</b></div>
      <div style="margin:22px 0 18px 0;text-align:center;">
        <span style="font-size:1.02em;opacity:0.8;">
          Choose a player to kill. (Cannot pick yourself or a dead player.)
        </span>
      </div>
      <ul class="vote-list" id="mafia-target-list">
        ${alive.filter(n => n !== nextMafia.name).map(p =>
          `<li class="alive" data-name="${p}">${p}</li>`
        ).join('')}
      </ul>
    `;
    Array.from(document.querySelectorAll("#mafia-target-list li.alive")).forEach(li => {
      li.onclick = () => {
        mafiaTargets.push(li.dataset.name);
        mafiaVoted.push(nextMafia.name);
        renderNight();
      };
    });
  } else {
    // Mafia votes done: pick the victim (majority/random among ties)
    const voteCount = {};
    mafiaTargets.forEach(t => voteCount[t] = (voteCount[t]||0)+1);
    // Find max vote(s)
    let max = 0, victims = [];
    Object.entries(voteCount).forEach(([name, cnt]) => {
      if (cnt > max) { max = cnt; victims = [name]; }
      else if (cnt === max) victims.push(name);
    });
    nightVictim = shuffle(victims)[0]; // random if tie
    phase = "doctor";
    render();
  }
}

function renderDoctor() {
  // Doctor picks someone to save
  const doctor = roles.find(r => r.role === "Doctor" && r.alive);
  if (!doctor) {
    phase = "detective";
    render();
    return;
  }
  $("game-container").innerHTML = `
    <h2>Night ${round} – Doctor</h2>
    <div style="margin-top:22px;text-align:center;">Pass the device to <b style="color:var(--accent);">${doctor.name}</b></div>
    <div style="margin:22px 0 18px 0;text-align:center;">
      <span style="font-size:1.02em;opacity:0.8;">
        Choose a player to save. (Can pick yourself.)
      </span>
    </div>
    <ul class="vote-list" id="doctor-target-list">
      ${alive.map(p =>
        `<li class="alive" data-name="${p}">${p}</li>`
      ).join('')}
    </ul>
  `;
  Array.from(document.querySelectorAll("#doctor-target-list li.alive")).forEach(li => {
    li.onclick = () => {
      doctorTarget = li.dataset.name;
      phase = "detective";
      render();
    };
  });
}

function renderDetective() {
  // Detective picks someone to investigate
  const detective = roles.find(r => r.role === "Detective" && r.alive);
  if (!detective) {
    phase = "nightResults";
    render();
    return;
  }
  $("game-container").innerHTML = `
    <h2>Night ${round} – Detective</h2>
    <div style="margin-top:22px;text-align:center;">Pass the device to <b style="color:var(--accent);">${detective.name}</b></div>
    <div style="margin:22px 0 18px 0;text-align:center;">
      <span style="font-size:1.02em;opacity:0.8;">
        Choose a player to investigate.
      </span>
    </div>
    <ul class="vote-list" id="detective-target-list">
      ${alive.filter(n => n !== detective.name).map(p =>
        `<li class="alive" data-name="${p}">${p}</li>`
      ).join('')}
    </ul>
  `;
  Array.from(document.querySelectorAll("#detective-target-list li.alive")).forEach(li => {
    li.onclick = () => {
      detectiveTarget = li.dataset.name;
      const targetRole = roles.find(r => r.name === detectiveTarget).role;
      detectiveResult = (targetRole === "Mafia") ?
        `${detectiveTarget} <span class="danger">IS</span> Mafia!` :
        `${detectiveTarget} <span class="success">is NOT</span> Mafia.`;
      phase = "nightResults";
      render();
    }
  });
}

function renderNightResults() {
  // Apply night effects
  let killed = null, saved = null, died = null;
  if (nightVictim && alive.includes(nightVictim)) {
    if (doctorTarget === nightVictim) {
      saved = nightVictim;
    } else {
      killed = nightVictim;
      roles.find(r => r.name === nightVictim).alive = false;
      alive = alive.filter(n => n !== nightVictim);
      dead.push(nightVictim);
      died = nightVictim;
    }
  }
  $("game-container").innerHTML = `
    <h2>Night ${round} Results</h2>
    <div class="result">
      ${killed ? `<div><b class="danger">${killed}</b> was attacked!`+
        (saved ? ` But <span class="success">saved by Doctor!</span>` : ` <span class="danger">They died.</span>`)+`</div>` :
        `<div>No one was attacked.</div>`
      }
      ${detectiveResult ? `<div style="margin-top:16px;"><b>Detective:</b> <span class="info">${detectiveResult}</span></div>` : ''}
    </div>
    <button class="phase" id="start-day">Start Day Phase</button>
  `;
  // Reset night state for next round
  mafiaTargets = []; mafiaVoted = []; doctorTarget = null;
  detectiveTarget = null; detectiveResult = ""; nightVictim = null; savedPlayer = null;
  $("start-day").onclick = () => {
    // Check win condition after night
    let res = checkWin();
    if (res) {
      phase = "end";
      render();
      return;
    }
    phase = "day";
    dayVote = [];
    votedOut = null;
    render();
  }
}

// --- Day Phase ---
function renderDay() {
  $("game-container").innerHTML = `
    <h2>Day ${round} – Discussion</h2>
    <div style="margin:18px 0 6px 0;text-align:center;">
      <span style="font-size:1.02em;">
        All alive players: discuss and then vote out a suspect!
      </span>
    </div>
    <ul class="player-list" style="margin-bottom:12px;">
      ${roles.map(r =>
        `<li class="${r.alive ? '' : 'dead'}">${r.name}${r.alive ? '' : ' <span style="color:var(--danger);">(dead)</span>'}</li>`
      ).join('')}
    </ul>
    <button class="phase" id="start-vote">Start Voting</button>
  `;
  $("start-vote").onclick = () => {
    renderVoting();
  }
}

function renderVoting(selected = null) {
  $("game-container").innerHTML = `
    <h2>Day ${round} – Voting</h2>
    <div style="margin:18px 0 6px 0;text-align:center;">
      <span style="font-size:1.02em;">
        Each alive player votes by tapping a player name (no self-vote).
      </span>
    </div>
    <ul class="vote-list" id="vote-list">
      ${alive.map(p =>
        `<li class="alive ${selected === p ? 'selected' : ''}" data-name="${p}">${p}</li>`
      ).join('')}
    </ul>
    <div style="margin:16px 0 0 0;text-align:center;">
      Votes so far: <b>${dayVote.length}/${alive.length}</b>
    </div>
    <button class="phase" id="finish-vote" ${dayVote.length === alive.length ? '' : 'disabled'}>
      Reveal Voted Out
    </button>
  `;
  // Voting logic: each alive player votes (pass device between)
  Array.from(document.querySelectorAll("#vote-list li.alive")).forEach(li => {
    li.onclick = () => {
      // The voter is the next alive player who hasn't voted yet
      const voter = alive[dayVote.length];
      if (li.dataset.name !== voter) { // can't self-vote
        dayVote.push(li.dataset.name);
        if (dayVote.length < alive.length) {
          renderVoting();
        } else {
          $("finish-vote").disabled = false;
        }
      } else {
        li.classList.add("selected");
        setTimeout(() => { li.classList.remove("selected"); }, 400);
      }
    }
  });
  $("finish-vote").onclick = () => {
    // Count votes and reveal who is voted out
    const tally = {};
    dayVote.forEach(name => tally[name] = (tally[name]||0)+1);
    let max = 0, out = [];
    Object.entries(tally).forEach(([name, cnt]) => {
      if (cnt > max) { max = cnt; out = [name]; }
      else if (cnt === max) out.push(name);
    });
    votedOut = shuffle(out)[0]; // random if tie
    roles.find(r => r.name === votedOut).alive = false;
    alive = alive.filter(n => n !== votedOut);
    dead.push(votedOut);
    phase = "voteResults";
    render();
  }
}

function renderVoteResults() {
  const outRole = roles.find(r => r.name === votedOut).role;
  $("game-container").innerHTML = `
    <h2>Day ${round} – Results</h2>
    <div class="result">
      <div><b class="danger">${votedOut}</b> was voted out!</div>
      <div style="margin-top: 8px;">Their role was: <span class="role-badge">${outRole}</span></div>
    </div>
    <button class="phase" id="next-round">Next Night</button>
    <button class="phase" id="check-win">Check Win Condition</button>
  `;
  $("next-round").onclick = () => {
    round++;
    mafiaTargets = []; mafiaVoted = []; doctorTarget = null; detectiveTarget = null;
    detectiveResult = ""; nightVictim = null; savedPlayer = null;
    dayVote = []; votedOut = null;
    phase = "night";
    render();
  }
  $("check-win").onclick = () => {
    let res = checkWin();
    if (res) {
      phase = "end";
      render();
    } else {
      phase = "night";
      round++;
      mafiaTargets = []; mafiaVoted = []; doctorTarget = null; detectiveTarget = null;
      detectiveResult = ""; nightVictim = null; savedPlayer = null;
      dayVote = []; votedOut = null;
      render();
    }
  }
}

function checkWin() {
  const aliveRoles = roles.filter(r => r.alive).map(r => r.role);
  const livingMafia = aliveRoles.filter(r => r === "Mafia").length;
  const livingOthers = aliveRoles.length - livingMafia;
  if (livingMafia === 0) {
    return "Citizens win! 🎉 All Mafia have been eliminated.";
  }
  if (livingMafia >= livingOthers) {
    return "Mafia wins! 😈 Mafia outnumber or equal the rest.";
  }
  return null;
}

function renderEnd() {
  const res = checkWin();
  $("game-container").innerHTML = `
    <h1 class="kpop-glow">Game Over</h1>
    <div class="result" style="font-size:1.4em;margin-bottom:20px;">
      ${res}
    </div>
    <h3>Final Roles:</h3>
    <ul class="player-list">
      ${roles.map(r =>
        `<li class="${r.alive ? '' : 'dead'}">${r.name}
          <span class="role-badge">${r.role}</span>
          ${r.alive ? '' : ' <span style="color:var(--danger);">(dead)</span>'}
        </li>`
      ).join('')}
    </ul>
    <button class="phase" id="restart-btn">Restart Game</button>
  `;
  $("restart-btn").onclick = () => {
    // Reset all state
    players = [];
    roles = [];
    alive = [];
    dead = [];
    phase = "setup";
    currentReveal = 0;
    mafiaTargets = [];
    mafiaVoted = [];
    doctorTarget = null;
    detectiveTarget = null;
    detectiveResult = "";
    nightVictim = null;
    savedPlayer = null;
    round = 1;
    dayVote = [];
    votedOut = null;
    render();
  }
}

// Initial render
render();