export default function PlaceholderPage({ moduleLabel, description, children }) {
  return (
    <section className="panel placeholder-page">
      <span className="badge badge--preview">{moduleLabel}</span>
      <p>{description}</p>
      {children}
    </section>
  );
}
