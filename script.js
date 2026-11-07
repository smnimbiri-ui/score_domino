const TOTAL_MATCHES = 10;
const TARGET_SCORE = 101;
const STORAGE_KEY = "gaplekScoreboardV2";

function createInitialPlayers() {
    return Array.from({ length: 4 }, (_, index) => ({
        id: index,
        name: `Pemain ${index + 1}`,
        score: 0,
        stars: 0
    }));
}

let players = createInitialPlayers();
let match = 1;
let dealer = 0;
let history = [];
let tournamentFinished = false;

// ==============================
// SIMPAN DAN MUAT DATA
// ==============================

function saveData() {
    const data = {
        players,
        match,
        dealer,
        history,
        tournamentFinished
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {
        const data = JSON.parse(saved);

        if (!Array.isArray(data.players) || data.players.length !== 4) {
            return;
        }

        players = data.players;
        match = data.match || 1;
        dealer = Number.isInteger(data.dealer) ? data.dealer : 0;
        history = Array.isArray(data.history) ? data.history : [];
        tournamentFinished = Boolean(data.tournamentFinished);

    } catch (error) {
        console.error("Data scoreboard tidak dapat dibaca:", error);
    }
}

// ==============================
// FORMAT DAN RIWAYAT
// ==============================

function formatScore(score) {
    return score > 0 ? `+${score}` : `${score}`;
}

function addHistory(message) {
    const now = new Date();

    history.unshift({
        message,
        time: now.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        })
    });

    history = history.slice(0, 12);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}

// ==============================
// GANTI NAMA PEMAIN
// ==============================

function renamePlayer(index, value) {
    const newName = value.trim();

    players[index].name = newName || `Pemain ${index + 1}`;

    addHistory(`${players[index].name} mengubah nama pemain.`);

    saveData();
    render();
}

// ==============================
// SISTEM PENGOCOK
// ==============================

function updateDealer() {
    const highestScore = Math.max(...players.map(player => player.score));

    const leaders = players
        .filter(player => player.score === highestScore)
        .map(player => player.id);

    // Jika pengocok sebelumnya masih memiliki skor tertinggi,
    // ia tetap menjadi pengocok.
    if (leaders.includes(dealer)) {
        return;
    }

    // Jika tidak, pengocok berpindah ke pemain dengan skor tertinggi.
    dealer = leaders[0];
}

// ==============================
// TAMBAH SKOR PEMAIN
// ==============================

function addScore(index) {
    if (tournamentFinished) return;

    const input = document.getElementById(`scoreInput${index}`);
    const value = Number(input.value);

    if (input.value.trim() === "" || !Number.isFinite(value)) {
        alert("Masukkan angka skor yang valid.");
        return;
    }

    players[index].score += value;

    addHistory(
        `${players[index].name} mendapat ${formatScore(value)} poin.`
    );

    input.value = "";

    updateDealer();
    saveData();
    render();

    checkMatchEnd();
}

// ==============================
// CEK TARGET 101
// ==============================

function checkMatchEnd() {
    const playerReachedTarget = players.find(
        player => player.score >= TARGET_SCORE
    );

    if (!playerReachedTarget) return;

    finishMatch(playerReachedTarget.id);
}

// ==============================
// AKHIR PERTANDINGAN
// ==============================

function finishMatch(triggerPlayerId) {
    const lowestScore = Math.min(...players.map(player => player.score));

    const winners = players.filter(
        player => player.score === lowestScore
    );

    // Pemain dengan skor terendah mendapat satu bintang.
    winners.forEach(player => {
        player.stars += 1;
    });

    const winnerNames = winners
        .map(player => player.name)
        .join(" & ");

    const triggerPlayer = players[triggerPlayerId];
    const completedMatch = match;

    addHistory(
        `Pertandingan ${match} selesai. ${winnerNames} mendapatkan bintang.`
    );

    // Semua skor direset menjadi 0.
    players.forEach(player => {
        player.score = 0;
    });

    // Pemain yang mencapai 101 menjadi pengocok pertama.
    dealer = triggerPlayerId;

    if (completedMatch >= TOTAL_MATCHES) {
        tournamentFinished = true;

        const highestStars = Math.max(
            ...players.map(player => player.stars)
        );

        const champions = players.filter(
            player => player.stars === highestStars
        );

        const championNames = champions
            .map(player => player.name)
            .join(" & ");

        document.getElementById("resultTitle").textContent =
            champions.length > 1 ? "Juara Bersama!" : championNames;

        document.getElementById("resultDescription").textContent =
            `10 pertandingan telah selesai. ${championNames} menjadi juara dengan ${highestStars} bintang.`;

    } else {
        match = completedMatch + 1;

        document.getElementById("resultTitle").textContent =
            winners.length > 1 ? "Pemenang Bersama!" : winners[0].name;

        document.getElementById("resultDescription").textContent =
            `${winnerNames} mendapatkan 1 bintang pada pertandingan ${completedMatch}. Semua skor kembali ke 0. ${triggerPlayer.name} menjadi pengocok pertama pada pertandingan berikutnya.`;
    }

    saveData();
    render();

    document.getElementById("resultModal").classList.add("show");
}

function closeResultModal() {
    document.getElementById("resultModal").classList.remove("show");
}

// ==============================
// TAMPILKAN KARTU PEMAIN
// ==============================

function renderPlayers() {
    const container = document.getElementById("players");

    container.innerHTML = players.map((player, index) => {
        const isDealer = player.id === dealer;

        const scoreClass =
            player.score > 0 ? "positive" :
            player.score < 0 ? "negative" : "zero";

        const progress = Math.min(
            Math.max((player.score / TARGET_SCORE) * 100, 0),
            100
        );

        return `
            <article class="player-card ${isDealer ? "dealer" : ""}">

                <div class="player-top">
                    <div class="player-identity">

                        <div class="player-avatar">
                            ${index + 1}
                        </div>

                        <div>
                            <input
                                class="player-name"
                                value="${escapeHTML(player.name)}"
                                maxlength="24"
                                onchange="renamePlayer(${index}, this.value)"
                                aria-label="Nama pemain ${index + 1}"
                            >

                            <p class="player-subtitle">
                                ${isDealer ? "Sedang mengocok" : "Pemain"}
                            </p>
                        </div>
                    </div>

                    <div class="star-count">
                        ★ ${player.stars}
                    </div>
                </div>

                <div class="score-area">
                    <p class="score-label">SKOR SEMENTARA</p>

                    <div class="score-value ${scoreClass}">
                        ${formatScore(player.score)}
                    </div>

                    <div class="score-progress">
                        <div
                            class="score-progress-fill"
                            style="width: ${progress}%"
                        ></div>
                    </div>
                </div>

                <div class="score-entry">
                    <input
                        type="number"
                        id="scoreInput${index}"
                        placeholder="Masukkan poin (+ / -)"
                        step="1"
                        ${tournamentFinished ? "disabled" : ""}
                        onkeydown="if(event.key === 'Enter') addScore(${index})"
                    >

                    <button
                        onclick="addScore(${index})"
                        ${tournamentFinished ? "disabled" : ""}
                    >
                        SIMPAN
                    </button>
                </div>

            </article>
        `;
    }).join("");
}

// ==============================
// TAMPILKAN PERTANDINGAN
// ==============================

function renderTopPanel() {
    const dealerPlayer = players[dealer];

    document.getElementById("dealerName").textContent =
        dealerPlayer.name;

    document.getElementById("dealerInfo").textContent =
        `Skor sementara: ${formatScore(dealerPlayer.score)}`;

    document.getElementById("matchNumber").innerHTML =
        `${String(Math.min(match, TOTAL_MATCHES)).padStart(2, "0")} <span>/ ${TOTAL_MATCHES}</span>`;

    document.getElementById("matchDescription").textContent =
        tournamentFinished
            ? "Seluruh pertandingan telah selesai"
            : "Menuju pertandingan berikutnya";

    const progress = tournamentFinished
        ? 100
        : ((match - 1) / TOTAL_MATCHES) * 100;

    document.getElementById("progressFill").style.width =
        `${progress}%`;

    document.getElementById("progressText").textContent =
        `${Math.round(progress)}%`;

    document.getElementById("gameStatus").textContent =
        tournamentFinished
            ? "TURNAMEN SELESAI"
            : "PERTANDINGAN BERLANGSUNG";
}

// ==============================
// PERINGKAT BINTANG
// ==============================

function renderRanking() {
    const container = document.getElementById("rankingList");

    const sortedPlayers = [...players].sort((a, b) => {
        if (b.stars !== a.stars) {
            return b.stars - a.stars;
        }

        return a.score - b.score;
    });

    container.innerHTML = sortedPlayers.map((player, index) => `
        <div class="ranking-item">
            <div class="ranking-left">
                <span class="rank-number">
                    ${String(index + 1).padStart(2, "0")}
                </span>

                <span class="rank-name">
                    ${escapeHTML(player.name)}
                </span>
            </div>

            <span class="rank-stars">
                ★ ${player.stars}
            </span>
        </div>
    `).join("");
}

// ==============================
// RIWAYAT AKTIVITAS
// ==============================

function renderHistory() {
    const container = document.getElementById("historyList");

    if (history.length === 0) {
        container.innerHTML =
            `<p class="empty-state">Belum ada aktivitas permainan.</p>`;
        return;
    }

    container.innerHTML = history.map(item => `
        <div class="history-item">
            <span>${escapeHTML(item.message)}</span>
            <span class="history-time">${escapeHTML(item.time)}</span>
        </div>
    `).join("");
}

// ==============================
// RENDER SEMUA BAGIAN
// ==============================

function render() {
    renderTopPanel();
    renderPlayers();
    renderRanking();
    renderHistory();
}

// ==============================
// RESET SEMUA DATA
// ==============================

function resetAllData() {
    const confirmation = confirm(
        "Apakah kamu yakin ingin menghapus seluruh data permainan, nama pemain, skor, bintang, dan riwayat?"
    );

    if (!confirmation) return;

    players = createInitialPlayers();
    match = 1;
    dealer = 0;
    history = [];
    tournamentFinished = false;

    localStorage.removeItem(STORAGE_KEY);

    document.getElementById("resultModal").classList.remove("show");

    saveData();
    render();
}

// ==============================
// MULAI APLIKASI
// ==============================

loadData();
render();