import type { Attributes } from "../types";

const LABELS: Record<keyof Attributes, string> = {
  energy: "Energia",
  reputation: "Reputação",
  networking: "Networking",
  anxiety: "Ansiedade",
  productivity: "Produtividade",
  learning: "Aprendizado",
};

export function AttributePanel(props: { attributes: Attributes }) {
  const entries = Object.entries(props.attributes) as Array<[keyof Attributes, number]>;

  return (
    <section className="panel attributes">
      <header className="panelHeader">
        <h3>Status</h3>
      </header>
      <div className="attributeGrid">
        {entries.map(([key, value]) => (
          <div key={key} className="attributeRow">
            <div className="attributeLabel">{LABELS[key]}</div>
            <div className="meter">
              <div className="meterFill" style={{ width: `${value * 10}%` }} />
            </div>
            <div className="attributeValue">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
