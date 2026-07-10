export default function TypingIndicator() {
  return (
    <div className="message message--assistant">
      <div className="message__avatar" aria-hidden="true">
        ☕
      </div>
      <div className="message__bubble message__bubble--typing" aria-label="Assistente digitando">
        <span className="steam-dot" />
        <span className="steam-dot" />
        <span className="steam-dot" />
      </div>
    </div>
  )
}
