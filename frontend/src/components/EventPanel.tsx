import type { PublicGameState } from "../types";

export function EventPanel(props: {
  state: PublicGameState;
  busy: boolean;
  onChoose: (choiceId: string) => void;
}) {
  const event = props.state.currentEvent;

  if (!event) {
    return (
      <section className="panel">
        <p>Nenhum evento disponível.</p>
      </section>
    );
  }

  return (
    <section className="panel event">
      <header className="panelHeader">
        <div className="pillRow">
          <span className="pill">
            Dia {props.state.day}/5 · Evento {props.state.slot}/3
          </span>
          <span className="pill subtle">{props.state.role}</span>
        </div>
        <h2>{event.title}</h2>
      </header>
      <p className="eventDescription">{event.description}</p>
      <div className="choices">
        {event.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="choiceButton"
            disabled={props.busy}
            onClick={() => props.onChoose(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
