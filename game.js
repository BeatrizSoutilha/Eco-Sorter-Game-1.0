// Game initialization
let musicEnabled = true;
let isPaused = false;
let savedProgressInterval;
const backgroundMusic = document.getElementById("background-music");
const correctSound = document.getElementById("correct-sound");
const errorSound = document.getElementById("error-sound");
const criticalErrorSound = document.getElementById("critical-error-sound");
let touchStartX = 0;
let touchStartY = 0;
let currentTouchItem = null;
let activeTouch = null;
let currentDragItem = null;
let touchActive = false;
let currentTouchElement = null;
let difficulty = "medium";
let spawnInterval;
let progressInterval;
let gameActive = false;
let score = 0;
let progress = 100;
let gameOverTriggered = false;

const DIFFICULTY_SETTINGS = {
    easy: { spawnRate: 2000, fallSpeed: 8, progressDrain: 0.8 },
    medium: { spawnRate: 1500, fallSpeed: 5, progressDrain: 1 },
    hard: { spawnRate: 800, fallSpeed: 3, progressDrain: 1.5 },
};

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
}

function toggleMusic() {
    musicEnabled = !musicEnabled;
    const button = document.getElementById("music-toggle");
    button.textContent = musicEnabled ? "🎵 Som" : "🎵 Mudo";

    if (musicEnabled) {
        backgroundMusic.play();
    } else {
        backgroundMusic.pause();
    }
}

function initAudioElements() {
    // Garantir pré-carregamento e configuração
    [correctSound, errorSound, criticalErrorSound].forEach((audio) => {
        audio.preload = "auto";
        audio.volume = 0.7;
        audio.load();
    });
}

document.querySelectorAll(".difficulty-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
        difficulty = this.getAttribute("data-level");
        document.getElementById("start-button").classList.remove("hidden");
    });
});

function updateElementPosition(touch) {
    const rect = currentTouchElement.getBoundingClientRect();
    const x = touch.clientX - rect.width / 2;
    const y = touch.clientY - rect.height / 2;

    currentTouchElement.style.position = "fixed";
    currentTouchElement.style.left = `${x}px`;
    currentTouchElement.style.top = `${y}px`;
}

function handleTouchStart(e) {
    if (!gameActive || isPaused || touchActive) return;
    touchActive = true;

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (element?.classList.contains("item")) {
        // Forçar layout recálculo para animação
        element.getBoundingClientRect();

        currentTouchElement = element;
        element.style.transition = "none";
        element.style.transform = "scale(1.5)";
        element.style.zIndex = "9999";
        element.style.animation = "none";
        updateElementPosition(touch);
    }
}

function updateScoreDisplay() {
    document.getElementById("score").textContent = score;
    document.getElementById("progress-bar").style.width = `${progress}%`;
}

function handleTouchMove(e) {
    if (!currentTouchElement) return;
    const touch = e.touches[0];
    updateElementPosition(touch);

    // Destacar apenas a lixeira sob o dedo
    const bins = document.querySelectorAll(".bin");
    bins.forEach((bin) => {
        const binRect = bin.getBoundingClientRect();
        const isOver =
            touch.clientX > binRect.left &&
            touch.clientX < binRect.right &&
            touch.clientY > binRect.top &&
            touch.clientY < binRect.bottom;

        bin.style.transform = isOver ? "scale(1.2)" : "scale(1)";
        bin.style.backgroundColor = isOver
            ? `${getComputedStyle(bin).backgroundColor}99`
            : getComputedStyle(bin).backgroundColor;
    });
}
function processDrop(item, bin) {
    const success = item.dataset.type === bin.dataset.type;

    item.style.transition = "all 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55)";
    item.style.transform = success
        ? "translate(-50%, -50%) scale(0) rotate(360deg)"
        : "translate(-50%, -50%) scale(1.8) rotate(-45deg)";

    item.style.opacity = "0";

    setTimeout(() => {
        item.remove();
        if (success) {
            score += 10;
            createParticles(bin);
        } else {
            score = Math.max(0, score - 5);
        }
        updateScoreDisplay();
    }, 400);
}

function resetElementPosition() {
    currentTouchElement.style.transition = "all 0.5s";
    currentTouchElement.style.transform = "scale(1)";
    currentTouchElement.style.zIndex = "10";
    setTimeout(() => {
        currentTouchElement.style.position = "absolute";
    }, 500);
}

function cleanupTouch() {
    touchActive = false;
    currentTouchElement = null;
    document
        .querySelectorAll(".bin")
        .forEach((b) => (b.style.transform = "scale(1)"));
}

function handleTouchEnd(e) {
    if (!currentTouchElement) return;

    const touch = e.changedTouches[0];
    const bin = document.elementFromPoint(touch.clientX, touch.clientY);
    const currentItem = currentTouchElement;

    // Verificar colisão precisa com as bins
    const bins = document.querySelectorAll(".bin");
    let targetBin = null;

    bins.forEach((bin) => {
        const binRect = bin.getBoundingClientRect();
        if (
            touch.clientX >= binRect.left &&
            touch.clientX <= binRect.right &&
            touch.clientY >= binRect.top &&
            touch.clientY <= binRect.bottom
        ) {
            targetBin = bin;
        }
    });

    if (targetBin) {
        processDrop(currentItem, targetBin);

        // Atualização imediata da pontuação
        const success = currentItem.dataset.type === targetBin.dataset.type;
        if (success) {
            score += 10;
            progress = Math.min(100, progress + 5);
            if (musicEnabled) correctSound.play().catch(() => {});
        } else {
            score = Math.max(0, score - 5);
            progress = Math.max(0, progress - 5);
            if (musicEnabled) errorSound.play().catch(() => {});
        }

        updateScoreDisplay();
    } else {
        currentItem.style.transform = "translateY(0) scale(1)";
        currentItem.style.transition = "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
        currentItem.style.animation = `fall linear ${getComputedStyle(
            document.documentElement
        ).getPropertyValue("--fall-speed")} forwards`;
    }

    currentItem.classList.remove("dragging");
    cleanupTouch();
}

function handleDrop(item, bin) {
    // Simular evento de drop
    const event = new Event("drop");
    event.dataTransfer = {
        getData: () => item.dataset.type,
        setData: () => {},
    };

    // Processar imediatamente
    bin.dispatchEvent(event);

    // Animação de sucesso/erro
    if (item.dataset.type === bin.dataset.type) {
        item.style.transform = "scale(0) rotate(360deg)";
        item.style.opacity = "0";
        setTimeout(() => item.remove(), 300);
    } else {
        item.style.transform = "scale(1.5)";
        item.style.opacity = "0";
        item.style.transition = "all 0.3s";
        setTimeout(() => item.remove(), 300);
    }
}

function highlightBin(x, y) {
    document.querySelectorAll(".bin").forEach((bin) => {
        const rect = bin.getBoundingClientRect();
        bin.style.transform =
            x > rect.left && x < rect.right && y > rect.top && y < rect.bottom
                ? "scale(1.15)"
                : "scale(1)";
    });
}

function removeBinHighlight() {
    document.querySelectorAll(".bin").forEach((bin) => {
        bin.style.transform = "scale(1)";
    });
}

function resetItemPosition() {
    if (currentDragItem) {
        currentDragItem.style.transform = "translateY(0) scale(1)";
        currentDragItem.style.transition =
            "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
        setTimeout(() => {
            if (currentDragItem) {
                currentDragItem.style.transform = "";
                currentDragItem.style.transition = "";
            }
        }, 500);
    }
}

function startGame() {
    document.getElementById("difficulty-screen").classList.add("hidden");
    document.getElementById("game-container").classList.remove("hidden");
    initGame();
}

function updateScoreDisplay() {
    document.getElementById("score").textContent = score;
    document.getElementById("progress-bar").style.width = `${progress}%`;
}

// Função auxiliar para reiniciar intervalos
function initIntervals() {
    const settings = DIFFICULTY_SETTINGS[difficulty];
    progressInterval = setInterval(updateProgress, 500);
    spawnInterval = setInterval(spawnItem, settings.spawnRate);
}

function initGame() {
    // Limpar os intervalos
    gameActive = true;
    isPaused = false;
    if (spawnInterval) clearInterval(spawnInterval);
    if (progressInterval) clearInterval(progressInterval);

    // Setando níveis de dificuldade
    const settings = {
        easy: { spawnRate: 2000, fallSpeed: 8, progressDrain: 0.8 },
        medium: { spawnRate: 1500, fallSpeed: 5, progressDrain: 1 },
        hard: { spawnRate: 800, fallSpeed: 3, progressDrain: 1.5 },
    }[difficulty];

    // Barra de progresso
    progressInterval = setInterval(() => {
        progress -= settings.progressDrain;
        document.getElementById("progress-bar").style.width = `${progress}%`;

        if (progress <= 0) {
            endGame();
        }
    }, 500);

    // Intervalo de spawn
    spawnInterval = setInterval(spawnItem, settings.spawnRate);

    // Configuração de animação
    document.documentElement.style.setProperty(
        "--fall-speed",
        `${settings.fallSpeed}s`
    );

    // Resetando estado do jogo
    score = 0;
    progress = 100;
    document.getElementById("score").textContent = score;
    document.getElementById("progress-bar").style.width = "100%";

    // Removendo itens existentes
    document.querySelectorAll(".item").forEach((item) => item.remove());

    if (musicEnabled) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play();
    }
}

function togglePause() {
    isPaused = !isPaused;
    const pauseButton = document.getElementById("pause-button");
    const overlay = document.querySelector(".pause-overlay");

    if (isPaused) {
        // Pausar animações
        clearInterval(spawnInterval);
        clearInterval(progressInterval);
        document.querySelectorAll(".item").forEach((item) => {
            item.style.animationPlayState = "paused";
        });

        // Criar overlay
        const newOverlay = document.createElement("div");
        newOverlay.className = "pause-overlay";
        newOverlay.innerHTML = `
            <div class="pause-content">
                <h2>Jogo Pausado ⏸️</h2>
                <button class="resume-btn" onclick="togglePause()">
                    <i class="fas fa-play"></i> Continuar
                </button>
            </div>
        `;
        document.body.appendChild(newOverlay);
    } else {
        // Remover overlay
        if (overlay) overlay.remove();

        // Reiniciar elementos
        document.querySelectorAll(".item").forEach((item) => {
            item.style.animationPlayState = "running";
        });
        initIntervals();
    }

    // Atualizar estado do botão
    pauseButton.innerHTML = isPaused
        ? '<i class="fas fa-play"></i>'
        : '<i class="fas fa-pause"></i>';
    pauseButton.classList.toggle("paused", isPaused);

    // Resetar estado do touch
    touchActive = false;
    currentTouchElement = null;
}

// Game state

const items = [
    { type: "plastic", emoji: ["🥤", "🛍️", "🧴", "💿", "🎈", "🍼"] },
    { type: "paper", emoji: ["📰", "📦", "🧻", "📚", "📄", "✉️", "📝"] },
    { type: "glass", emoji: ["🍷", "🥃", "🧂", "🫙", "🔍", "🥛"] },
    {
        type: "organic",
        emoji: ["🍌", "🍎", "🥕", "🌽", "🥦", "🍓", "🥑", "🍊", "🍆"],
    },
    {
        type: "metal",
        emoji: ["⛓️", "🔩", "🥄", "🗝️", "🔧", "⚙️", "📎", "🖇️", "🥫"],
    },
    { type: "ewaste", emoji: ["🔌", "📱", "💻", "🖥️", "🖨️", "🎮", "⌨️"] },
];

const contaminants = [
    {
        type: "battery",
        emoji: "🔋",
        message: "Baterias precisam de reciclagem especial! -15 pontos",
        penalty: 15,
    },
];

function handleDragStart(e) {
    if (isMobile()) return;
    e.dataTransfer.setData("text/plain", e.target.dataset.type);
    setTimeout(() => e.target.remove(), 0);
}

document.addEventListener("DOMContentLoaded", initAudioElements);
document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
    document.querySelectorAll(".item").forEach((item) => {
        item.addEventListener("dragstart", handleDragStart);
    });
});

function updateProgress() {
    if (isPaused) return;

    progress -= DIFFICULTY_SETTINGS[difficulty].progressDrain;
    document.getElementById("progress-bar").style.width = `${progress}%`;

    if (progress <= 0) {
        endGame();
    }
}

function spawnItem() {
    if (isPaused || !gameActive) return;

    // Forçar reflow para reiniciar animação
    const forceReflow = (element) => element.offsetHeight;

    if (Math.random() < 0.2) {
        const cont =
            contaminants[Math.floor(Math.random() * contaminants.length)];
        const elem = document.createElement("div");
        elem.className = "item contaminant";
        elem.textContent = cont.emoji;
        elem.dataset.type = cont.type;
        elem.draggable = true;
        elem.style.left = `${Math.random() * 80 + 10}%`;
        elem.style.top = "-100px";

        // ID único para rastreamento
        elem.id = `cont-${Date.now()}-${Math.random()}`;

        const removeTimeout = setTimeout(() => {
            if (document.contains(elem)) {
                elem.remove();
                progress -= cont.penalty;
            }
        }, 5000);

        elem.addEventListener("dragstart", (e) => {
            if (isMobile()) return; // Ignorar em dispositivos móveis
            e.dataTransfer.setData("text/plain", cont.type);
            setTimeout(() => elem.remove(), 0);
        });

        // Evento de drop específico para contaminantes
        elem.addEventListener("dragend", () => {
            clearTimeout(removeTimeout);
            elem.remove();
        });

        document.body.appendChild(elem);
        forceReflow(elem);
        setTimeout(() => elem.remove(), 5000);
        return;
    }
    const item = items[Math.floor(Math.random() * items.length)];
    const elem = document.createElement("div");
    const emojis = item.emoji;
    elem.className = "item";
    //elem.textContent = item.emoji;
    elem.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    elem.dataset.type = item.type;
    elem.draggable = true;
    elem.style.left = `${Math.random() * 80 + 10}%`;
    elem.style.top = "-50px"; // Start above visible area

    // ID único para rastreamento
    elem.addEventListener("dragstart", (e) => {
        if (isMobile()) return; // Ignorar em dispositivos móveis
        e.dataTransfer.setData("text/plain", item.type);
        setTimeout(() => elem.remove(), 0);
    });
    document.body.appendChild(elem);
    forceReflow(elem);

    // Animação de queda
    setTimeout(() => {
        if (document.body.contains(elem)) {
            elem.remove();
            progress -= 3;
        }
    }, 5000);
}

// Função para adicionar eventos de arrastar e soltar
document.querySelectorAll(".bin").forEach((bin) => {
    bin.addEventListener("dragover", (e) => e.preventDefault());

    bin.addEventListener("drop", (e) => {
        e.preventDefault();
        const itemType = e.dataTransfer.getData("text/plain");
        const binType = e.target.dataset.type;
        const binElement = e.target.closest(".bin");

        // Encontrar o item sendo arrastado
        const items = document.querySelectorAll(".item");
        const draggedItem = Array.from(items).find(
            (item) =>
                parseFloat(item.style.left) === e.clientX &&
                parseFloat(item.style.top) === e.clientY
        );

        // Feedback visual padrão (scale up)
        binElement.style.transform = "scale(1.1)";
        setTimeout(() => (binElement.style.transform = "scale(1)"), 200);

        // Caso 1: Bateria (erro grave)
        if (itemType === "battery") {
            criticalErrorSound.currentTime = 0;
            if (musicEnabled) criticalErrorSound.play().catch(() => {});
            binElement.classList.add("critical-error-effect");
            setTimeout(
                () => binElement.classList.remove("critical-error-effect"),
                800
            );
            createCriticalParticles(binElement);
            score = Math.max(0, score - 15);
            progress = Math.max(0, progress - 10);
            document.getElementById("score").textContent = score;
            document.getElementById(
                "progress-bar"
            ).style.width = `${progress}%`;
            return;
        }

        // Visual feedback
        e.target.style.transform = "scale(1.1)";
        setTimeout(() => (e.target.style.transform = "scale(1)"), 200);

        // Scoring

        // Caso 2: Item correto (sucesso)
        if (itemType === binType) {
            // Adicione classe para animação
            if (draggedItem) {
                draggedItem.classList.add("correct");
                setTimeout(() => draggedItem.remove(), 500);
            }
            correctSound.currentTime = 0;
            if (musicEnabled) correctSound.play().catch(() => {});
            binElement.classList.add("success-effect"); // Efeito verde
            setTimeout(
                () => binElement.classList.remove("success-effect"),
                500
            );
            score += 10;
            progress = Math.min(100, progress + 5);
            createParticles(binElement);
        }

        // Caso 3: Item errado (erro comum)
        else {
            if (draggedItem) {
                draggedItem.classList.add("incorrect");
                setTimeout(() => draggedItem.remove(), 600);
            }
            errorSound.currentTime = 0;
            if (musicEnabled) errorSound.play().catch(() => {});
            binElement.classList.add("error-effect");
            setTimeout(() => binElement.classList.remove("error-effect"), 400);
            createErrorParticles(binElement);
            score = Math.max(0, score - 5);
            progress = Math.max(0, progress - 5);
        }

        document.getElementById("score").textContent = score;
        document.getElementById("progress-bar").style.width = `${progress}%`;
    });
});

function createCriticalParticles(element) {
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < 25; i++) {
        // Mais partículas
        const particle = document.createElement("div");
        particle.className = "particle critical";
        particle.style.width = `${Math.random() * 12 + 6}px`; // Partículas maiores

        // Animação mais intensa
        particle.animate(
            [
                { transform: "scale(1)", opacity: 1 },
                { transform: "scale(2.5)", opacity: 0 },
            ],
            {
                duration: 800,
                easing: "cubic-bezier(0.68, -0.55, 0.27, 1.55)",
            }
        );
    }
}

function createErrorParticles(element) {
    const rect = element.getBoundingClientRect();
    const particles = document.getElementById("particles");

    for (let i = 0; i < 15; i++) {
        const particle = document.createElement("div");
        particle.style.background = "#ff4444";
        particle.className = "particle error";
        particle.style.left = `${rect.left + rect.width / 2}px`;
        particle.style.top = `${rect.top}px`;
        particle.style.width = `${Math.random() * 8 + 4}px`;
        particle.style.height = particle.style.width;

        particles.appendChild(particle);

        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 40 + 40;
        const duration = Math.random() * 600 + 400;

        particle.animate(
            [
                { transform: "translate(0,0)", opacity: 1 },
                {
                    transform: `translate(${Math.cos(angle) * distance}px, 
                             ${Math.sin(angle) * distance}px)`,
                    opacity: 0,
                },
            ],
            { duration, easing: "ease-out" }
        );

        setTimeout(() => particle.remove(), duration);
    }
}

// Função para criar partículas de sucesso
function createParticles(element) {
    const rect = element.getBoundingClientRect();
    const particles = document.getElementById("particles");

    for (let i = 0; i < 15; i++) {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.style.left = `${rect.left + rect.width / 2}px`;
        particle.style.top = `${rect.top}px`;
        particle.style.width = `${Math.random() * 10 + 5}px`;
        particle.style.height = particle.style.width;
        particle.style.background = getComputedStyle(element).background;
        particle.style.boxShadow = `0 0 15px ${particle.style.background}`;

        particles.appendChild(particle);

        // Animar
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 50 + 50;
        const duration = Math.random() * 1000 + 500;

        particle.animate(
            [
                { transform: "translate(0,0)", opacity: 1 },
                {
                    transform: `translate(${Math.cos(angle) * distance}px, ${
                        Math.sin(angle) * distance
                    }px)`,
                    opacity: 0,
                },
            ],
            { duration, easing: "cubic-bezier(0,0.8,0.2,1)" }
        );

        setTimeout(() => particle.remove(), duration);
    }
}

// Função para salvar a pontuação mais alta
function saveHighScore(score) {
    const highScore = localStorage.getItem("highScore") || 0;
    if (score > highScore) {
        localStorage.setItem("highScore", score);
        return true; // New record
    }
    return false;
}

// Função para mostrar a tela de dificuldade
const recyclingFacts = [
    "Reciclar uma tonelada de papel salva 17 árvores e economiza 26.500 litros de água!",
    "O vidro pode ser reciclado infinitamente sem perder qualidade!",
    "Uma lata de alumínio reciclada economiza energia suficiente para manter uma TV ligada por 3 horas!",
    "O plástico pode levar até 450 anos para se decompor na natureza!",
    "O Brasil é um dos líderes mundiais em reciclagem de latas de alumínio, com índice de 98%!",
    "Reciclar 1 kg de plástico economiza 1,5 kg de emissões de CO₂!",
    "O lixo eletrônico contém metais preciosos como ouro e cobre que podem ser recuperados!",
    "A reciclagem de uma única garrafa PET pode economizar energia para acender uma lâmpada de 60W por 6 horas!",
    "São Paulo produz cerca de 20 mil toneladas de lixo por dia, sendo que 40% poderia ser reciclado!",
    "O óleo de cozinha despejado na pia contamina 25 mil litros de água - recicle em postos de coleta!",
    "A reciclagem de pneus velhos é obrigatória no Brasil desde 1999!",
    "Uma pilha comum pode contaminar 30 mil litros de água - descarte em locais apropriados!",
    "O Brasil recicla apenas 3% do lixo orgânico, que poderia virar adubo!",
    "Cada brasileiro produz em média 1 kg de lixo por dia!",
    "A reciclagem de eletrônicos recupera metais equivalentes a 10% da produção nacional de ouro!",
];

// Fato temporário
function showDifficultyScreen() {
    document.getElementById("game-container").classList.add("hidden");
    document.getElementById("difficulty-screen").classList.remove("hidden");
    // Limpar os intervalos
    if (spawnInterval) clearInterval(spawnInterval);
    if (progressInterval) clearInterval(progressInterval);
    document.querySelectorAll(".item").forEach((item) => item.remove());
}

// Função para finalizar o jogo
function endGame() {
    gameActive = false;
    if (gameOverTriggered) return; 
    gameOverTriggered = true;
    const isNewRecord = saveHighScore(score);
    const highScore = localStorage.getItem("highScore") || 0;

    const availableFacts = [
        ...recyclingFacts.filter((fact) => !fact.startsWith("Novos fatos")),
    ];
    if (availableFacts.length === 0) {
        availableFacts.push(
            "Novos fatos de reciclagem serão adicionados na próxima partida! ♻️"
        );
    }

    // Selecionar um fato único
    const randomIndex = Math.floor(Math.random() * availableFacts.length);
    const selectedFact = availableFacts[randomIndex];

    if (!selectedFact.includes("Novos fatos")) {
        availableFacts.splice(randomIndex, 1);
    }

    // Mostrar tela de game over
    const modal = document.getElementById("game-over-modal");
    document.getElementById("recycling-fact").textContent = selectedFact;

    document.getElementById(
        "final-score-text"
    ).textContent = `Pontuação: ${score}`;
    document.getElementById(
        "high-score-text"
    ).textContent = `Recorde: ${highScore}`;
    document.getElementById("recycling-fact").textContent = selectedFact;
    document.getElementById("game-over-modal").classList.remove("hidden");

    modal.classList.remove("hidden");

    document.getElementById("reset-button").onclick = () => {
        modal.classList.add("hidden");
        resetGame();
    };

    document.getElementById("menu-button").onclick = () => {
        modal.classList.add("hidden");
        showDifficultyScreen();
    };
    backgroundMusic.pause();
}

// Resetar o jogo
function resetGame() {
    gameActive = false;
    gameOverTriggered = false;
    clearInterval(spawnInterval);
    clearInterval(progressInterval);
    availableFacts = [...originalRecyclingFacts];

    // Resetar todos os estados
    score = 0;
    progress = 100;
    environmentalImpact = { co2Saved: 0, waterSaved: 0, energySaved: 0 };

    document.getElementById("score").textContent = score;
    document.getElementById("progress-bar").style.width = "100%";
    document.querySelectorAll(".item").forEach((item) => item.remove());

    // Resetar animações
    updateImpactDisplay();

    // Reiniciar o jogo
    initGame();
    if (musicEnabled) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play();
    }
}

// Adicionar atalho de teclado
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !gameActive) {
        document.getElementById("game-over-modal").classList.add("hidden");
        resetGame();
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isPaused) {
        togglePause();
    }
});
