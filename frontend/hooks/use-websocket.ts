import { useEffect, useRef, useState, useCallback } from 'react'

export interface WSMessage {
  type: string
  session_id?: string
  user_id?: string
  user?: {
    id: string
    name: string
    email: string
    color: string
    image_url: string
  }
  data?: any
}

export function useWebSocket(
  sessionId: string,
  userId: string,
  userName: string,
  userEmail: string,
  userColor: string,
  userImage: string
) {
  const [connected, setConnected] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [messages, setMessages] = useState<WSMessage[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const messageQueueRef = useRef<WSMessage[]>([])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const wsUrl = `ws://localhost:8080/ws?session=${sessionId}&user_id=${userId}&user_name=${encodeURIComponent(
      userName
    )}&user_email=${encodeURIComponent(userEmail)}&user_color=${encodeURIComponent(
      userColor
    )}&user_image=${encodeURIComponent(userImage)}`

    console.log('Connecting to WebSocket...')
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected successfully')
      setConnected(true)
      reconnectAttemptsRef.current = 0
      
      // Send queued messages
      while (messageQueueRef.current.length > 0) {
        const msg = messageQueueRef.current.shift()
        if (msg) {
          ws.send(JSON.stringify(msg))
        }
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        console.log('Received message:', message.type, message)
        
        setMessages((prev) => [...prev, message])

        if (message.type === 'user_join' && message.user) {
          setUsers((prev) => {
            const exists = prev.find((u) => u.id === message.user!.id)
            if (!exists) {
              console.log('User joined:', message.user)
              return [...prev, message.user!]
            }
            return prev
          })
        } else if (message.type === 'user_leave') {
          setUsers((prev) => {
            console.log('User left:', message.user_id)
            return prev.filter((u) => u.id !== message.user_id)
          })
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason)
      setConnected(false)
      
      // Attempt to reconnect with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
      reconnectAttemptsRef.current += 1
      
      console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    }

    wsRef.current = ws
  }, [sessionId, userId, userName, userEmail, userColor, userImage])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('Sending message:', message.type, message)
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.log('WebSocket not connected, queuing message:', message.type)
      messageQueueRef.current.push(message)
    }
  }, [])

  return {
    connected,
    users,
    messages,
    sendMessage,
  }
}