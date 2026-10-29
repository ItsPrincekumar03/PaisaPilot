import Icon from './Icon.jsx';

export default function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Icon name="wallet" size={28} />
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}
