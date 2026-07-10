export default function MessageBubble({ role, content, error }) {
  const isUser = role === 'user'

  return (
    <div className={`message ${isUser ? 'message--user' : 'message--assistant'}`}>
      {!isUser && (
        <div className="message__avatar" aria-hidden="true">
          ☕
        </div>
      )}
      <div className={`message__bubble ${error ? 'message__bubble--error' : ''}`}>
        <p>{content}</p>
      </div>
    </div>
  )
}
