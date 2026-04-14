const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const PORT = 3000;
const PLAYER_LIMIT = 10;
const DAY_DURATION = 45;
const NIGHT_DURATION = 90;

let players = [];
let gameStarted = false;
let phase = "lobby";
let timer = 0;
let interval = null;
let lastAnnouncement = "Koy toplaniyor. 10 oyuncu oldugunda oyun baslar.";

const ROLES = [
  "vampire",
  "vampire",
  "doctor",
  "detective",
  "guardian",
  "seer",
  "hunter",
  "villager",
  "villager",
  "mad"
];

const ROLE_INFO = {
  vampire: {
    team: "vampires",
    title: "Vampir",
    description: "Gece bir hedef secip diger vampirle birlikte saldirirsiniz."
  },
  doctor: {
    team: "village",
    title: "Doktor",
    description: "Gece bir oyuncuyu koruyarak oldurulmesini engellersin."
  },
  detective: {
    team: "village",
    title: "Dedektif",
    description: "Gece sectigin oyuncunun karanlik tarafta olup olmadigini ogrenirsin."
  },
  guardian: {
    team: "village",
    title: "Koruyucu",
    description: "Gece bir evi muhurlersin; o oyuncu saldiriya karsi daha guvenli olur."
  },
  seer: {
    team: "village",
    title: "Kahin",
    description: "Gece bir oyuncunun tam rolunu gorursun."
  },
  hunter: {
    team: "village",
    title: "Avci",
    description: "Gunduz oylamada dikkatli ol; olumunden sonra bile koye destek olursun."
  },
  villager: {
    team: "village",
    title: "Koylu",
    description: "Gunduz oylamada etkili ol ve davranislari takip et."
  },
  mad: {
    team: "chaos",
    title: "Deli",
    description: "Amacin hayatta kalip koyu yaniltmak. Gunduz konusmalarin kritik."
  }
};

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function createPlayer(socketId, name) {
  return {
    id: socketId,
    name,
    alive: true,
    role: null,
    vote: null,
    nightAction: null,
    nightResult: "",
    protected: false,
    houseIndex: 0
  };
}

function sanitizePlayersFor(viewerId) {
  return players.map(player => ({
    id: player.id,
    name: player.name,
    alive: player.alive,
    vote: player.vote,
    houseIndex: player.houseIndex,
    role: player.id === viewerId || !player.alive ? player.role : null,
    roleTitle: player.id === viewerId || !player.alive ? ROLE_INFO[player.role]?.title ?? "" : null
  }));
}

function emitSystemMessage(message) {
  lastAnnouncement = message;
  io.emit("message", message);
}

function broadcastState() {
  players.forEach(player => {
    io.to(player.id).emit("state", {
      players: sanitizePlayersFor(player.id),
      phase,
      timer,
      gameStarted,
      requiredPlayers: PLAYER_LIMIT,
      me: {
        id: player.id,
        name: player.name,
        alive: player.alive,
        role: player.role,
        roleTitle: ROLE_INFO[player.role]?.title ?? "Beklemede",
        roleDescription: ROLE_INFO[player.role]?.description ?? "Oyun baslayinca rolun gorunecek.",
        nightResult: player.nightResult || ""
      },
      announcement: lastAnnouncement
    });
  });
}

function resetSelections() {
  players.forEach(player => {
    player.vote = null;
    player.nightAction = null;
    player.protected = false;
  });
}

function alivePlayers() {
  return players.filter(player => player.alive);
}

function startTimer() {
  clearInterval(interval);
  timer = phase === "night" ? NIGHT_DURATION : DAY_DURATION;
  broadcastState();

  interval = setInterval(() => {
    timer -= 1;

    if (timer <= 0) {
      nextPhase();
      return;
    }

    broadcastState();
  }, 1000);
}

function assignRoles() {
  const mixedRoles = shuffle(ROLES);

  players.forEach((player, index) => {
    player.role = mixedRoles[index];
    player.alive = true;
    player.vote = null;
    player.nightAction = null;
    player.nightResult = `Rolun: ${ROLE_INFO[player.role].title}. ${ROLE_INFO[player.role].description}`;
    player.protected = false;
    player.houseIndex = index + 1;
  });
}

function startGame() {
  if (players.length !== PLAYER_LIMIT) {
    return;
  }

  assignRoles();
  gameStarted = true;
  phase = "night";
  emitSystemMessage("Gece basladi. Herkes kendi rolune gore aksiyon secsin.");
  startTimer();
}

function getTopTarget(votes) {
  const counts = {};

  votes.forEach(vote => {
    if (!vote) {
      return;
    }

    counts[vote] = (counts[vote] || 0) + 1;
  });

  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (ranked.length === 0) {
    return null;
  }

  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) {
    return null;
  }

  return ranked[0][0];
}

function resolveNight() {
  const alive = alivePlayers();
  const vampires = alive.filter(player => player.role === "vampire");
  const doctors = alive.filter(player => player.role === "doctor");
  const guardians = alive.filter(player => player.role === "guardian");
  const detectives = alive.filter(player => player.role === "detective");
  const seers = alive.filter(player => player.role === "seer");

  const vampireTargetName = getTopTarget(vampires.map(player => player.nightAction));
  const protectedName = doctors[0]?.nightAction || guardians[0]?.nightAction || null;

  if (protectedName) {
    const protectedPlayer = players.find(player => player.name === protectedName && player.alive);
    if (protectedPlayer) {
      protectedPlayer.protected = true;
    }
  }

  detectives.forEach(player => {
    const target = players.find(candidate => candidate.name === player.nightAction);
    if (!target) {
      player.nightResult = "Dedektif raporu: Bu gece kimseyi incelemedin.";
      return;
    }

    const alignment = target.role === "vampire" ? "karanlik tarafa yakin" : "supheli gorunmuyor";
    player.nightResult = `Dedektif raporu: ${target.name} ${alignment}.`;
  });

  seers.forEach(player => {
    const target = players.find(candidate => candidate.name === player.nightAction);
    if (!target) {
      player.nightResult = "Kahin vizyonu: Bu gece net bir goruntu alamadin.";
      return;
    }

    player.nightResult = `Kahin vizyonu: ${target.name} rol olarak ${ROLE_INFO[target.role].title}.`;
  });

  if (!vampireTargetName) {
    emitSystemMessage("Gece sessiz gecti. Vampirler ortak bir hedefte bulusamadi.");
    return;
  }

  const target = players.find(player => player.name === vampireTargetName && player.alive);

  if (!target) {
    emitSystemMessage("Gece saldirisi bosa gitti.");
    return;
  }

  if (target.protected) {
    emitSystemMessage(`${target.name} bu gece korundu ve hayatta kaldi.`);
    return;
  }

  target.alive = false;
  target.nightResult = `Bu gece hayatini kaybettin. Rolun ${ROLE_INFO[target.role].title} olarak ortaya cikti.`;
  emitSystemMessage(`${target.name} gece saldirisinda hayatini kaybetti.`);
}

function resolveDay() {
  const alive = alivePlayers();
  const targetName = getTopTarget(alive.map(player => player.vote));

  if (!targetName) {
    emitSystemMessage("Gunduz oylamasi beraberlikle bitti, kimse asilmadi.");
    return;
  }

  const target = players.find(player => player.name === targetName && player.alive);

  if (!target) {
    emitSystemMessage("Gunduz oylamasi gecersiz kaldi.");
    return;
  }

  target.alive = false;
  target.nightResult = `Gunduz oylamasinda elendin. Rolun ${ROLE_INFO[target.role].title} olarak aciga cikti.`;
  emitSystemMessage(`${target.name} gunduz oylamasi sonucu oyundan dustu.`);
}

function checkWin() {
  const alive = alivePlayers();
  const vampires = alive.filter(player => player.role === "vampire").length;
  const villagers = alive.filter(player => player.role !== "vampire").length;

  if (vampires === 0) {
    emitSystemMessage("Koy kazandi. Tum vampirler yakalandi.");
    clearInterval(interval);
    resetGame();
    return true;
  }

  if (vampires >= villagers) {
    emitSystemMessage("Vampirler kazandi. Koy karanliga gomuldu.");
    clearInterval(interval);
    resetGame();
    return true;
  }

  return false;
}

function nextPhase() {
  clearInterval(interval);

  if (phase === "night") {
    resolveNight();

    if (checkWin()) {
      broadcastState();
      return;
    }

    const nightSummary = lastAnnouncement;
    phase = "day";
    resetSelections();
    emitSystemMessage(`${nightSummary} Gunduz basladi, simdi tartisip oy verin.`);
    startTimer();
    return;
  }

  if (phase === "day") {
    resolveDay();

    if (checkWin()) {
      broadcastState();
      return;
    }

    const daySummary = lastAnnouncement;
    phase = "night";
    resetSelections();
    emitSystemMessage(`${daySummary} Gece yeniden coktu, roller devrede.`);
    startTimer();
  }
}

function resetGame() {
  gameStarted = false;
  phase = "lobby";
  timer = 0;
  players = players.map(player => ({
    ...player,
    alive: true,
    role: null,
    vote: null,
    nightAction: null,
    nightResult: "Oyun bitti. Yeni tur icin 10 oyuncu bekleniyor.",
    protected: false
  }));
}

io.on("connection", socket => {
  socket.on("join", rawName => {
    const name = String(rawName || "").trim().slice(0, 20);

    if (!name) {
      socket.emit("message", "Gecerli bir isim yazman gerekiyor.");
      return;
    }

    if (gameStarted) {
      socket.emit("message", "Oyun basladi. Yeni turu beklemen gerekiyor.");
      return;
    }

    if (players.length >= PLAYER_LIMIT) {
      socket.emit("message", "Lobi dolu.");
      return;
    }

    if (players.some(player => player.name.toLowerCase() === name.toLowerCase())) {
      socket.emit("message", "Bu isim zaten kullaniliyor.");
      return;
    }

    players.push(createPlayer(socket.id, name));
    emitSystemMessage(`${name} koye katildi. (${players.length}/${PLAYER_LIMIT})`);
    broadcastState();

    if (players.length === PLAYER_LIMIT) {
      startGame();
    }
  });

  socket.on("vote", targetName => {
    if (!gameStarted || phase !== "day") {
      return;
    }

    const player = players.find(candidate => candidate.id === socket.id);
    if (!player || !player.alive) {
      return;
    }

    const target = players.find(candidate => candidate.name === targetName && candidate.alive);
    if (!target || target.id === player.id) {
      return;
    }

    player.vote = target.name;
    socket.emit("message", `Oyun ${target.name} icin gunduz oyun kaydetti.`);
    broadcastState();
  });

  socket.on("nightAction", targetName => {
    if (!gameStarted || phase !== "night") {
      return;
    }

    const player = players.find(candidate => candidate.id === socket.id);
    if (!player || !player.alive) {
      return;
    }

    const actionableRoles = ["vampire", "doctor", "detective", "guardian", "seer"];
    if (!actionableRoles.includes(player.role)) {
      socket.emit("message", "Bu rolun gece aktif bir yetenegi yok.");
      return;
    }

    const target = players.find(candidate => candidate.name === targetName && candidate.alive);
    if (!target || target.id === player.id) {
      socket.emit("message", "Kendini secemezsin veya hedef gecerli degil.");
      return;
    }

    player.nightAction = target.name;
    socket.emit("message", `Gece aksiyonun ${target.name} icin kaydedildi.`);
    broadcastState();
  });

  socket.on("chat", rawMessage => {
    const player = players.find(candidate => candidate.id === socket.id);
    const msg = String(rawMessage || "").trim().slice(0, 220);

    if (!player || !msg) {
      return;
    }

    io.emit("chat", {
      name: player.name,
      msg,
      time: new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    });
  });

  socket.on("disconnect", () => {
    const departing = players.find(player => player.id === socket.id);
    players = players.filter(player => player.id !== socket.id);

    if (departing) {
      emitSystemMessage(`${departing.name} baglantidan ayrildi.`);
    }

    if (players.length < PLAYER_LIMIT && gameStarted) {
      clearInterval(interval);
      gameStarted = false;
      phase = "lobby";
      timer = 0;
      emitSystemMessage("Oyuncu eksildigi icin tur durduruldu. Yeni tur icin 10 oyuncu gerekiyor.");
    }

    broadcastState();
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
