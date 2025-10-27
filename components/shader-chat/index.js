import { useChat } from '@ai-sdk/react'
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
  })

  const registerStructuredShader = (shaderData) => {
    try {
      // Register the shader with structured data
      const shaderId = shaderRegistry.importFromLLM(
        shaderData.name,
        shaderData.description,
        shaderData.fragmentShader,
        shaderData.uniforms || {},
        shaderData.controls || []
      )

      onShaderCreated?.(shaderId)
      track('Shader Chat', { action: 'structured_shader_generated', shaderId })
      console.log('Structured shader registered:', shaderId, shaderData)
    } catch (error) {
      console.error('Failed to register structured shader:', error)
    }
  }

  const extractAndRegisterShader = (content) => {
    // Look for GLSL code blocks in the response
    const glslMatch = content.match(/```glsl\n([\s\S]*?)\n```/)
    if (glslMatch) {
      const fragmentShader = glslMatch[1]

      // Extract shader name and description from the content
      const nameMatch = content.match(/name[:\s]*([^\n]+)/i)
      const descMatch = content.match(/description[:\s]*([^\n]+)/i)

      const name = nameMatch
        ? nameMatch[1].trim().replace(/['"]/g, '')
        : 'Generated Shader'
      const description = descMatch
        ? descMatch[1].trim().replace(/['"]/g, '')
        : 'AI-generated visual effect'

      try {
        // Register the shader
        const shaderId = shaderRegistry.importFromLLM(
          name,
          description,
          fragmentShader,
          {}, // uniforms will be parsed from the shader
          [] // controls can be added later
        )

        onShaderCreated?.(shaderId)
        track('Shader Chat', { action: 'shader_generated', shaderId })
      } catch (error) {
        console.error('Failed to register shader:', error)
      }
    }
  }

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
        CHAT
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
              <h3 className={s.title}>SHADER CHAT</h3>
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
                        onClick={() => setInput('Create a water ripple effect')}
                      >
                        {'>'} water_ripple_effect
                      </button>
                      <button
                        type="button"
                        className={s.exampleItem}
                        onClick={() =>
                          setInput('Make a glitch distortion with scanlines')
                        }
                      >
                        {'>'} glitch_distortion_scanlines
                      </button>
                      <button
                        type="button"
                        className={s.exampleItem}
                        onClick={() =>
                          setInput('Plasma energy field that pulses')
                        }
                      >
                        {'>'} plasma_energy_pulse
                      </button>
                      <button
                        type="button"
                        className={s.exampleItem}
                        onClick={() =>
                          setInput('Vintage film grain with scratches')
                        }
                      >
                        {'>'} vintage_film_grain
                      </button>
                      <button
                        type="button"
                        className={s.exampleItem}
                        onClick={() => setInput('Matrix digital rain effect')}
                      >
                        {'>'} matrix_digital_rain
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
