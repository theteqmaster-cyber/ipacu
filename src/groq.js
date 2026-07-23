/* ==========================================================================
   IPACU :: GROQ AI DEMON LORD PUPPET MASTER SERVICE
   ========================================================================== */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_URL = import.meta.env.VITE_GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';

class GroqAIService {
  constructor() {
    this.apiKey = GROQ_API_KEY;
    this.apiUrl = GROQ_URL;
    this.model = MODEL;
    this.cache = new Map();
  }

  async getDemonLordCommentary({ zone, playerXp, generalsLeft, eventType }) {
    const cacheKey = `${zone}_${eventType}_${generalsLeft}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const prompt = `You are the sinister Demon Lord Puppet Master of Labyrinth Ipacu actively manipulating the labyrinth. 
The Hunter (Player) is currently in zone: "${zone}" with ${playerXp} XP. ${generalsLeft} of your 5 Lord Generals remain standing.
Current Event: ${eventType}.
Give a 1-sentence dramatic, sinister, tactical taunt or command to your High Knights (max 20 words). Strictly no emojis.`;

    // 1. Try server backend proxy (/api/groq) which reads runtime environment variables on Render
    try {
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, zone, playerXp, generalsLeft, eventType })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.commentary) {
          this.cache.set(cacheKey, data);
          return data;
        }
      }
    } catch (err) {
      console.warn('Backend Groq proxy error:', err);
    }

    // 2. Try direct client-side fetch if API key was bundled in Vite client
    if (this.apiKey && this.apiKey.trim() !== '' && this.apiKey !== 'your_groq_api_key_here') {
      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: 'You are the Demon Lord Puppet Master of Labyrinth Ipacu. Keep responses dramatic, concise, under 20 words, strictly no emojis.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 60
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content?.trim() || "THE DEMON LORD WATCHES YOUR EVERY STEP IN THE DARKNESS.";
          let actionType = null;
          if (zone === 'HOLY CHURCH (SAINT)' || zone === 'DARK VOID (LORD GENERAL)') {
            actionType = Math.random() > 0.4 ? 'SUMMON_MINION' : 'AURA_SURGE';
          }
          const result = { commentary: text, actionType };
          this.cache.set(cacheKey, result);
          return result;
        }
      } catch (e) {
        console.warn('Direct Groq client error:', e);
      }
    }

    // 3. Dynamic local fallbacks
    const fallbacks = [
      { commentary: "THE DEMON LORD SENSES YOUR PRESENCE IN THE LABYRINTH.", actionType: null },
      { commentary: "HIGH KNIGHTS, DEFEND THE HOLY CHURCH AT ALL COSTS!", actionType: 'SUMMON_MINION' },
      { commentary: "YOU MAY CAPTURE UNDEAD, HUNTER, BUT THE VOID AWAITS YOU.", actionType: null },
      { commentary: "THE DARKNESS IN IPACU SURGES FOR YOUR XP!", actionType: 'AURA_SURGE' }
    ];
    const fb = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    this.cache.set(cacheKey, fb);
    return fb;
  }
}

export const groqAI = new GroqAIService();
