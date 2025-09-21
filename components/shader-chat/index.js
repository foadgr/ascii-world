import { useChat } from '@ai-sdk/react'
import { IconWand } from '@tabler/icons-react'
import { track } from '@vercel/analytics'
import { useState } from 'react'
import { shaderRegistry } from '../shader-effect/ShaderRegistry'
import s from './shader-chat.module.scss'

export function ShaderChat({ onShaderCreated, hidden = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')

  const { messages, sendMessage, isLoading } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('Chat error:', error)
    },
    onToolCall: async ({ toolCall }) => {
      console.log('Tool call received:', toolCall)
      
      // Handle registerAndApplyShader tool calls by registering and applying the shader
      if (toolCall.toolName === 'registerAndApplyShader' && toolCall.result?.success) {
        const { shaderData } = toolCall.result
        try {
          console.log('Registering and applying shader:', shaderData)
          
          // Register the shader using the shader registry
          const shaderId = shaderRegistry.importFromLLM(
            shaderData.name,
            shaderData.description,
            shaderData.fragmentShader,
            shaderData.uniforms || {},
            shaderData.controls || []
          )
          
          // Apply the shader to the canvas
          onShaderCreated?.(shaderId)
          track('Shader Chat', { action: 'shader_registered_and_applied', shaderId })
          console.log('Shader registered and applied successfully:', shaderId)
        } catch (error) {
          console.error('Failed to register shader:', error)
        }
      }
    },
  })


  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (input?.trim() && !isLoading) {
      sendMessage({ text: input })
      setInput('') // Clear input after sending
      track('Shader Chat', { action: 'send_message' })
    }
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
  }

  const handleClose = () => {
    setIsOpen(false)
    track('Shader Chat', { action: 'close' })
  }

  if (hidden) return null

  return (
    <div className={s.container}>
      {/* Trigger Button */}
      <button
        type="button"
        className={s.trigger}
        onClick={() => {
          track('Shader Chat', { action: 'open' })
          setIsOpen(!isOpen)
        }}
        title="Chat to create shader"
        aria-label="Chat to create shader"
      >
        <IconWand size={23} />
      </button>

      {/* Chat Sidebar */}
      {isOpen && (
        <>
          <div
            className={s.overlay}
            onClick={handleClose}
            onKeyDown={(e) => e.key === 'Escape' && handleClose()}
            role="button"
            tabIndex={0}
            aria-label="Close shader chat"
          />
          <div className={s.sidebar}>
            <div className={s.header}>
              <h3 className={s.title}>Create Shader</h3>
              <button
                type="button"
                className={s.closeButton}
                onClick={handleClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={s.chatContainer}>
              <div className={s.messages}>
                {messages.length === 0 && (
                  <div className={s.welcomeMessage}>
                    <div className={s.terminalHeader}>
                      <span className={s.terminalPrompt}>shader_ai $</span>
                      <span className={s.terminalBlink}>_</span>
                    </div>
                    <p className={s.welcomeText}>
                      Describe a visual effect to generate a custom shader
                    </p>
                    <div className={s.examplesList}>
                      <div className={s.examplesHeader}>Examples:</div>
                      <button
                        type="button"
                        className={s.exampleItem}
                        onClick={() => setInput('Create and apply a water ripple effect shader')}
                      >
                        {'>'} create_water_ripple_shader
                      </button>
                      <button
                        type="button"
                        className={s.exampleItem}
                        onClick={() =>
                          setInput('Generate and apply a glitch distortion shader with scanlines')
                        }
                      >
                        {'>'} create_glitch_shader
                      </button>
                      <button
                        type="button"
                        className={s.exampleItem}
                        onClick={() =>
                          setInput('Build and apply a plasma energy field shader that pulses')
                        }
                      >
                        {'>'} create_plasma_shader
                      </button>
                      <button
                        type="button"
                        className={s.exampleItem}
                        onClick={() =>
                          setInput('Generate and apply a vintage film grain shader with scratches')
                        }
                      >
                        {'>'} create_vintage_shader
                      </button>
                      <button
                        type="button"
                        className={s.exampleItem}
                        onClick={() => setInput('Create and apply a matrix digital rain shader effect')}
                      >
                        {'>'} create_matrix_shader
                      </button>
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${s.message} ${s[message.role]}`}
                  >
                    <div className={s.messageContent}>
                      {message.parts?.map((part, index) => {
                        if (part.type === 'text') {
                          return (
                            <span key={`${message.id}-part-${index}`}>
                              {part.text}
                            </span>
                          )
                        }
                        if (part.type === 'tool-call') {
                          return (
                            <div key={`${message.id}-tool-${index}`} className={s.toolCall}>
                              <div className={s.toolName}>🔧 {part.toolName}</div>
                              <div className={s.toolArgs}>
                                {JSON.stringify(part.args, null, 2)}
                              </div>
                            </div>
                          )
                        }
                        if (part.type === 'tool-result') {
                          return (
                            <div key={`${message.id}-result-${index}`} className={s.toolResult}>
                              <div className={s.resultIndicator}>
                                {part.result?.success ? '✅' : '❌'} Tool Result
                              </div>
                              <div className={s.resultContent}>
                                {part.result?.message || JSON.stringify(part.result, null, 2)}
                              </div>
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className={`${s.message} ${s.assistant}`}>
                    <div className={s.messageContent}>
                      <div className={s.typing}>
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleFormSubmit} className={s.inputForm}>
                <div className={s.inputWrapper}>
                  <span className={s.prompt}>{'>'}</span>
                  <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleFormSubmit(e)
                      }
                    }}
                    placeholder="describe the effect you want..."
                    disabled={isLoading}
                    className={s.textInput}
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input || !input.trim()}
                  className={s.sendButton}
                >
                  {isLoading ? (
                    <div className={s.spinner} />
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-label="Send message"
                    >
                      <title>Send message</title>
                      <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
