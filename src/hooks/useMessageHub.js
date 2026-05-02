import { useState, useCallback, useRef } from 'react';

/**
 * useMessageHub — sends structured receipt payloads to a message hub.
 *
 * Supports three transport types:
 *   'rest'      — HTTP POST via fetch
 *   'websocket' — socket.io or native WebSocket
 *   'mock'      — local in-memory log (default / fallback)
 *
 * @param {object} config
 * @param {string} config.type        - 'rest' | 'websocket' | 'mock'
 * @param {string} config.endpoint    - URL for REST or WS
 * @param {string} config.apiKey      - Bearer token / API key
 * @param {string} config.topic       - Message topic / event name
 */
export const useMessageHub = (config = {}) => {
  const { type = 'mock', endpoint, apiKey, topic = 'receipt.uploads' } = config;

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  /* ── REST transport ─────────────────────────────────────────── */
  const sendViaRest = useCallback(async (payload) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json().catch(() => ({ ok: true }));
  }, [endpoint, apiKey]);

  /* ── WebSocket transport ────────────────────────────────────── */
  const sendViaWebSocket = useCallback((payload) => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState > 1) {
        wsRef.current = new WebSocket(endpoint);
      }
      const ws = wsRef.current;

      const send = () => {
        ws.send(JSON.stringify({ topic, ...payload }));
        resolve({ ok: true });
      };

      if (ws.readyState === WebSocket.OPEN) {
        send();
      } else {
        ws.onopen = send;
        ws.onerror = (e) => reject(new Error('WebSocket connection failed'));
      }
    });
  }, [endpoint, topic]);

  /* ── Mock transport ─────────────────────────────────────────── */
  const sendViaMock = useCallback(async (payload) => {
    await new Promise(r => setTimeout(r, 800));
    console.info('[MessageHub:mock] payload:', payload);
    return { ok: true, mocked: true };
  }, []);

  /* ── Main send function ─────────────────────────────────────── */
  const sendMessage = useCallback(async (messageData) => {
    setIsLoading(true);
    setError(null);

    const payload = {
      type: 'receipt_upload',
      timestamp: new Date().toISOString(),
      topic,
      ...messageData,
    };

    try {
      let result;
      if (type === 'rest' && endpoint) {
        result = await sendViaRest(payload);
      } else if (type === 'websocket' && endpoint) {
        result = await sendViaWebSocket(payload);
      } else {
        result = await sendViaMock(payload);
      }

      const record = { id: Date.now(), ...payload, result };
      setMessages(prev => [record, ...prev]);
      return { success: true, result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [type, endpoint, topic, sendViaRest, sendViaWebSocket, sendViaMock]);

  return { messages, sendMessage, isLoading, error };
};

export default useMessageHub;
