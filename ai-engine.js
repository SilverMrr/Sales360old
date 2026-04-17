(() => {
  if (window.Sales360AI) return

  const AI_MODE_STORAGE = 'sales360-ai-mode'
  const OPENAI_KEY_STORAGE = 'sales360-openai-api-key'

  const defaultMode = 'gpt'

  function setMode(mode) {
    const normalized = mode === 'gpt' ? 'gpt' : defaultMode
    localStorage.setItem(AI_MODE_STORAGE, normalized)
    return normalized
  }

  function getMode() {
    return localStorage.getItem(AI_MODE_STORAGE) || defaultMode
  }

  function setApiKey(key) {
    const sanitized = (key || '').trim()
    if (!sanitized) {
      localStorage.removeItem(OPENAI_KEY_STORAGE)
      return ''
    }
    localStorage.setItem(OPENAI_KEY_STORAGE, sanitized)
    return sanitized
  }

  function getApiKey() {
    return localStorage.getItem(OPENAI_KEY_STORAGE) || ''
  }

  async function summarizeCall(transcript) {
    const apiKey = getApiKey()
    if (!apiKey) {
      throw new Error('Clé API GPT manquante. Ajoutez-la dans Paramètres > IA.')
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content:
              'Tu es un assistant commercial. Retourne un JSON avec summary, next_steps (liste), sentiment.',
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Erreur OpenAI (${response.status}): ${errorBody}`)
    }

    return response.json()
  }

  window.Sales360AI = {
    getMode,
    setMode,
    getApiKey,
    setApiKey,
    summarizeCall,
  }
})()
