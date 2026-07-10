import { useState } from 'react'

export default function InputBar({ onSend, disabled, placeholder }) {
  const [value, setValue] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  return (
    <form className="input-bar" onSubmit={handleSubmit}>
      <span className="input-bar__prompt" aria-hidden="true">
        &gt;
      </span>
      <input
        type="text"
        className="input-bar__field"
        placeholder={placeholder ?? 'Pergunte algo sobre Java...'}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        autoFocus
      />
      <button
        type="submit"
        className="input-bar__send"
        disabled={disabled || !value.trim()}
      >
        Enviar
      </button>
    </form>
  )
}
