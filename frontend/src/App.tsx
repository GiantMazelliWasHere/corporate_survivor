import { useEffect, useState } from "react";
import {
  createPlayer,
  loadActiveGame,
  loadRanking,
  startGame,
  submitChoice,
} from "./api/client";
import { AttributePanel } from "./components/AttributePanel";
import { EventPanel } from "./components/EventPanel";
import type { ChoiceResponse, PublicGameState } from "./types";

type View = "welcome" | "playing" | "results" | "ranking";

const STORAGE_PLAYER_ID = "corporate_survivor_player_id";
const STORAGE_PLAYER_NAME = "corporate_survivor_player_name";

const ATTRIBUTE_LABEL_PT: Record<string, string> = {
  energy: "Energia",
  reputation: "Reputação",
  networking: "Networking",
  anxiety: "Ansiedade",
  productivity: "Produtividade",
  learning: "Aprendizado",
};

function loadStoredPlayer(): { id: string; name: string } | null {
  const id = localStorage.getItem(STORAGE_PLAYER_ID);
  const name = localStorage.getItem(STORAGE_PLAYER_NAME);
  if (!id || !name) return null;
  return { id, name };
}

export default function App() {
  const [view, setView] = useState<View>("welcome");
  const [playerNameInput, setPlayerNameInput] = useState(() => loadStoredPlayer()?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [lastChoice, setLastChoice] = useState<ChoiceResponse["decision"] | null>(null);

  const showBanner = (message: string) => setBanner(message);

  const persistPlayer = (player: { id: string; name: string }) => {
    localStorage.setItem(STORAGE_PLAYER_ID, player.id);
    localStorage.setItem(STORAGE_PLAYER_NAME, player.name);
  };

  const handleRegisterAndStart = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const trimmed = playerNameInput.trim();
      if (!trimmed) {
        showBanner("Informe um nome para começar.");
        return;
      }

      const player = await createPlayer(trimmed);
      persistPlayer(player);

      const state = await startGame(player.id, false);
      setLastChoice(null);
      setGameState(state);

      if (state.status === "completed") {
        setView("results");
      } else {
        setView("playing");
      }
    } catch (error) {
      showBanner(error instanceof Error ? error.message : "Falha ao iniciar.");
    } finally {
      setBusy(false);
    }
  };

  const handleContinue = async () => {
    const stored = loadStoredPlayer();
    if (!stored) {
      showBanner("Nenhum jogador salvo neste navegador.");
      return;
    }

    setBusy(true);
    setBanner(null);
    try {
      const state = await loadActiveGame(stored.id);
      setLastChoice(null);
      setGameState(state);

      if (state.status === "completed") {
        setView("results");
      } else {
        setView("playing");
      }
    } catch (error) {
      showBanner(error instanceof Error ? error.message : "Não há partida ativa salva.");
    } finally {
      setBusy(false);
    }
  };

  const handleRestart = async () => {
    const stored = loadStoredPlayer();
    if (!stored) {
      showBanner("Cadastre um nome antes de reiniciar.");
      return;
    }

    setBusy(true);
    setBanner(null);
    try {
      const state = await startGame(stored.id, true);
      setLastChoice(null);
      setGameState(state);

      if (state.status === "completed") {
        setView("results");
      } else {
        setView("playing");
      }
    } catch (error) {
      showBanner(error instanceof Error ? error.message : "Falha ao reiniciar.");
    } finally {
      setBusy(false);
    }
  };

  const handleChoose = async (choiceId: string) => {
    if (!gameState?.currentEvent) return;

    setBusy(true);
    setBanner(null);
    try {
      const response = await submitChoice(gameState.gameId, gameState.currentEvent.id, choiceId);
      setLastChoice(response.decision);
      setGameState(response.nextState);

      if (response.nextState.status === "completed") {
        setView("results");
      }
    } catch (error) {
      showBanner(error instanceof Error ? error.message : "Não foi possível registrar a escolha.");
    } finally {
      setBusy(false);
    }
  };

  const handleOpenRanking = () => {
    setBanner(null);
    setView("ranking");
  };

  return (
    <div className="appShell">
      <header className="hero">
        <div className="heroTitle">
          <p className="eyebrow">Mini RPG corporativo</p>
          <h1>Corporate Survivor</h1>
          <p className="lede">
            Sobreviva à primeira semana como trainee. Cada escolha altera seu estado mental, reputação e ritmo de
            trabalho — e algumas decisões abrem ou fecham caminhos futuros.
          </p>
        </div>
      </header>

      {banner ? (
        <div className="banner" role="status">
          {banner}
        </div>
      ) : null}

      <main className="layout">
        {view === "welcome" ? (
          <section className="panel welcome">
            <h2>Bem-vindo ao onboarding</h2>
            <p className="muted">
              Cadastre seu nome para começar. O progresso é salvo automaticamente no servidor ao escolher uma opção.
            </p>

            <label className="fieldLabel" htmlFor="player-name">
              Seu nome
            </label>
            <input
              id="player-name"
              className="textInput"
              value={playerNameInput}
              onChange={(event) => setPlayerNameInput(event.target.value)}
              placeholder="Ex.: Ana Silva"
              autoComplete="nickname"
            />

            <div className="buttonRow">
              <button type="button" className="primaryButton" disabled={busy} onClick={handleRegisterAndStart}>
                Começar jornada
              </button>
              <button type="button" className="ghostButton" disabled={busy} onClick={handleContinue}>
                Continuar partida salva
              </button>
              <button type="button" className="ghostButton" disabled={busy} onClick={handleRestart}>
                Reiniciar do zero
              </button>
              <button type="button" className="ghostButton" disabled={busy} onClick={handleOpenRanking}>
                Ranking global
              </button>
            </div>
          </section>
        ) : null}

        {view === "playing" && gameState ? (
          <>
            <AttributePanel attributes={gameState.attributes} />

            <div className="stack">
              <EventPanel state={gameState} busy={busy} onChoose={handleChoose} />

              {lastChoice ? (
                <section className="panel subtle">
                  <h3>Último impacto</h3>
                  <ul className="effectsList">
                    {Object.entries(lastChoice.effects).map(([key, delta]) => (
                      <li key={key}>
                        <span className="effectKey">{ATTRIBUTE_LABEL_PT[key] ?? key}</span>
                        <span className={delta >= 0 ? "effectPos" : "effectNeg"}>
                          {delta > 0 ? `+${delta}` : `${delta}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </>
        ) : null}

        {view === "results" && gameState ? (
          <section className="panel results">
            <h2>Fim da semana</h2>
            <p className="muted">
              Resultado para <strong>{gameState.player.name}</strong>.
            </p>
            <div className="resultGrid">
              <div className="resultCard">
                <p className="muted">Final</p>
                <p className="resultHighlight">{gameState.ending ?? "—"}</p>
              </div>
              <div className="resultCard">
                <p className="muted">Score final</p>
                <p className="resultHighlight">{gameState.score ?? "—"}</p>
              </div>
            </div>

            <AttributePanel attributes={gameState.attributes} />

            <div className="buttonRow">
              <button type="button" className="primaryButton" disabled={busy} onClick={handleRestart}>
                Jogar novamente
              </button>
              <button type="button" className="ghostButton" disabled={busy} onClick={handleOpenRanking}>
                Ver ranking global
              </button>
              <button type="button" className="ghostButton" disabled={busy} onClick={() => setView("welcome")}>
                Voltar ao menu
              </button>
            </div>
          </section>
        ) : null}

        {view === "ranking" ? <RankingView onBack={() => setView("welcome")} /> : null}
      </main>

      <footer className="footer">
        <span>SQLite no backend · Eventos via JSON · Front só renderiza estado</span>
      </footer>
    </div>
  );
}

function RankingView(props: { onBack: () => void }) {
  const [rows, setRows] = useState<Array<{ playerName: string; score: number; ending: string; completedAt: string }>>(
    [],
  );
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOnce() {
      setLoading(true);
      setError(null);
      try {
        const data = await loadRanking();
        if (!cancelled) {
          setRows(data);
          setLoaded(true);
        }
      } catch (loadErr) {
        if (!cancelled) {
          setError(loadErr instanceof Error ? loadErr.message : "Falha ao carregar ranking.");
          setLoaded(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOnce();

    return () => {
      cancelled = true;
    };
  }, []);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadRanking();
      setRows(data);
      setLoaded(true);
    } catch (loadErr) {
      setError(loadErr instanceof Error ? loadErr.message : "Falha ao carregar ranking.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel ranking">
      <header className="panelHeader">
        <h2>Ranking global</h2>
        <p className="muted">Somente partidas finalizadas com pontuação registrada.</p>
      </header>

      {loading ? <p className="muted">Carregando ranking...</p> : null}
      {error ? (
        <div className="banner" role="status">
          {error}
        </div>
      ) : null}

      <div className="tableWrap">
        <table className="rankTable">
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Score</th>
              <th>Final</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.playerName}-${row.completedAt}-${index}`}>
                <td>{index + 1}</td>
                <td>{row.playerName}</td>
                <td>{row.score}</td>
                <td>{row.ending}</td>
                <td>{new Date(row.completedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && loaded ? <p className="muted">Ainda não há partidas completas.</p> : null}

      <div className="buttonRow">
        <button type="button" className="ghostButton" disabled={loading} onClick={() => void reload()}>
          Atualizar
        </button>
        <button type="button" className="primaryButton" disabled={loading} onClick={props.onBack}>
          Voltar
        </button>
      </div>
    </section>
  );
}
