const socket = io();
let myId = "";
let latestState = null;

function formatTimer(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function join() {
  const input = document.getElementById("name");
  const name = input.value.trim();

  if (!name) {
    document.getElementById("joinHint").innerText = "Lutfen bir isim yaz.";
    return;
  }

  socket.emit("join", name);
}

function renderVillage(state) {
  const village = document.getElementById("village");
  village.innerHTML = "";

  state.players.forEach(player => {
    const card = document.createElement("button");
    card.className = `house-card ${player.alive ? "" : "is-dead"}`.trim();
    card.type = "button";

    const isNightAction = state.phase === "night" && ["vampire", "doctor", "detective", "guardian", "seer"].includes(state.me.role) && state.me.alive;
    const canVote = state.phase === "day" && state.me.alive;

    card.onclick = () => {
      if (!player.alive || player.id === state.me.id) {
        return;
      }

      if (isNightAction) {
        socket.emit("nightAction", player.name);
        return;
      }

      if (canVote) {
        socket.emit("vote", player.name);
      }
    };

    const roof = document.createElement("div");
    roof.className = "roof";

    const body = document.createElement("div");
    body.className = "house-body";

    const title = document.createElement("strong");
    title.innerText = `Ev ${player.houseIndex}`;

    const owner = document.createElement("span");
    owner.innerText = player.name;

    const status = document.createElement("span");
    status.className = "status";
    status.innerText = player.alive ? "Hayatta" : "Elendi";

    body.appendChild(title);
    body.appendChild(owner);
    body.appendChild(status);

    if (player.roleTitle) {
      const badge = document.createElement("span");
      badge.className = "role-badge";
      badge.innerText = player.roleTitle;
      body.appendChild(badge);
    }

    card.appendChild(roof);
    card.appendChild(body);
    village.appendChild(card);
  });

  const aliveCount = state.players.filter(player => player.alive).length;
  document.getElementById("aliveCount").innerText = `${aliveCount}/${state.requiredPlayers} hayatta`;
}

function renderActions(state) {
  const actions = document.getElementById("actions");
  actions.innerHTML = "";

  const text = document.createElement("p");
  text.className = "muted";

  if (!state.gameStarted) {
    text.innerText = `Lobide ${state.players.length}/${state.requiredPlayers} oyuncu var. Oyun 10 kisi ile baslar.`;
    actions.appendChild(text);
    return;
  }

  if (!state.me.alive) {
    text.innerText = "Elendin. Kalan oyunculari izleyebilir ve sohbete yazabilirsin.";
    actions.appendChild(text);
    return;
  }

  if (state.phase === "night") {
    const activeRoles = {
      vampire: "Bir evi sec. Vampirler ayni hedefte bulusursa saldiri olur.",
      doctor: "Koruyacagin oyuncuyu sec.",
      detective: "Incelemek istedigin oyuncuyu sec.",
      guardian: "Muhurlenecek evi sec.",
      seer: "Rolunu gormek istedigin oyuncuyu sec."
    };

    text.innerText = activeRoles[state.me.role] || "Bu gece aktif bir yetenegin yok. Sohbeti ve davranislari takip et.";
    actions.appendChild(text);
    return;
  }

  text.innerText = "Gunduz fazi acik. Suphelendigin oyuncunun evine tiklayarak oy verebilirsin.";
  actions.appendChild(text);
}

function applyState(state) {
  latestState = state;
  myId = state.me.id;

  document.getElementById("login").style.display = "none";
  document.getElementById("game").style.display = "block";
  document.getElementById("phase").innerText = state.phase === "night" ? "Gece" : state.phase === "day" ? "Gunduz" : "Lobi";
  document.getElementById("timer").innerText = formatTimer(state.timer || 0);
  document.getElementById("announcement").innerText = state.announcement || "";
  document.getElementById("myRole").innerText = state.me.roleTitle || "Beklemede";
  document.getElementById("roleDescription").innerText = state.me.roleDescription || "";
  document.getElementById("nightResult").innerText = state.me.nightResult || "";

  renderVillage(state);
  renderActions(state);
}

function sendChat() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();

  if (!message) {
    return;
  }

  socket.emit("chat", message);
  input.value = "";
}

socket.on("state", state => {
  applyState(state);
});

socket.on("message", msg => {
  const div = document.createElement("div");
  div.className = "system-message";
  div.innerText = msg;
  document.getElementById("messages").appendChild(div);
  document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;

  if (!latestState) {
    document.getElementById("joinHint").innerText = msg;
  }
});

socket.on("chat", data => {
  const div = document.createElement("div");
  div.className = "chat-message";
  div.innerText = `[${data.time}] ${data.name}: ${data.msg}`;
  const messages = document.getElementById("messages");
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

document.getElementById("chatInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    sendChat();
  }
});

document.getElementById("name").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    join();
  }
});
