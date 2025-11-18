package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"codestream/models"
	"codestream/services"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Client struct {
	conn      *websocket.Conn
	send      chan []byte
	sessionID string
	user      models.User
}

type WebSocketHandler struct {
	redis      *services.RedisService
	clients    map[string]map[*Client]bool // sessionID -> clients
	register   chan *Client
	unregister chan *Client
	broadcast  chan *BroadcastMessage
	mu         sync.RWMutex
}

type BroadcastMessage struct {
	sessionID string
	message   []byte
	exclude   *Client
}

func NewWebSocketHandler(redis *services.RedisService) *WebSocketHandler {
	h := &WebSocketHandler{
		redis:      redis,
		clients:    make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *BroadcastMessage, 256),
	}

	go h.run()
	return h
}

func (h *WebSocketHandler) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.sessionID] == nil {
				h.clients[client.sessionID] = make(map[*Client]bool)
			}
			h.clients[client.sessionID][client] = true
			h.mu.Unlock()

			// Send current session state to the newly connected client
			session, err := h.redis.GetSession(client.sessionID)
			if err == nil {
				// Send current code state
				codeStateMsg := models.WSMessage{
					Type:      "code_change",
					SessionID: client.sessionID,
					Data: map[string]interface{}{
						"code": session.Code,
					},
				}
				if data, err := json.Marshal(codeStateMsg); err == nil {
					select {
					case client.send <- data:
					default:
						// Channel full, skip
					}
				}

				// Send current language state
				langStateMsg := models.WSMessage{
					Type:      "language_change",
					SessionID: client.sessionID,
					Data: map[string]interface{}{
						"language": session.Language,
					},
				}
				if data, err := json.Marshal(langStateMsg); err == nil {
					select {
					case client.send <- data:
					default:
						// Channel full, skip
					}
				}
			}

			// Notify others about new user
			h.broadcastToSession(client.sessionID, models.WSMessage{
				Type:      "user_join",
				SessionID: client.sessionID,
				User:      &client.user,
			}, client)

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.sessionID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.send)

					if len(clients) == 0 {
						delete(h.clients, client.sessionID)
					}
				}
			}
			h.mu.Unlock()

			// Remove user from session
			h.redis.RemoveUserFromSession(client.sessionID, client.user.ID)

			// Notify others about user leaving
			h.broadcastToSession(client.sessionID, models.WSMessage{
				Type:      "user_leave",
				SessionID: client.sessionID,
				UserID:    client.user.ID,
			}, nil)

		case msg := <-h.broadcast:
			h.mu.RLock()
			if clients, ok := h.clients[msg.sessionID]; ok {
				for client := range clients {
					if client != msg.exclude {
						select {
						case client.send <- msg.message:
						default:
							close(client.send)
							delete(clients, client)
						}
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *WebSocketHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	sessionID := r.URL.Query().Get("session")
	userID := r.URL.Query().Get("user_id")
	userName := r.URL.Query().Get("user_name")
	userEmail := r.URL.Query().Get("user_email")
	userColor := r.URL.Query().Get("user_color")
	userImage := r.URL.Query().Get("user_image")

	if sessionID == "" || userID == "" {
		conn.Close()
		return
	}

	user := models.User{
		ID:       userID,
		Name:     userName,
		Email:    userEmail,
		Color:    userColor,
		ImageURL: userImage,
	}

	client := &Client{
		conn:      conn,
		send:      make(chan []byte, 256),
		sessionID: sessionID,
		user:      user,
	}

	// Add user to session
	h.redis.AddUserToSession(sessionID, user)

	h.register <- client

	// Start goroutines
	go h.writePump(client)
	go h.readPump(client)
}

func (h *WebSocketHandler) readPump(client *Client) {
	defer func() {
		h.unregister <- client
		client.conn.Close()
	}()

	client.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	client.conn.SetPongHandler(func(string) error {
		client.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := client.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var wsMsg models.WSMessage
		if err := json.Unmarshal(message, &wsMsg); err != nil {
			log.Printf("JSON unmarshal error: %v", err)
			continue
		}

		// Handle different message types
		switch wsMsg.Type {
		case "cursor_move":
			// Broadcast cursor position to other clients
			h.broadcastToSession(client.sessionID, wsMsg, client)

		case "code_change":
			// Update code in Redis
			if codeData, ok := wsMsg.Data.(map[string]interface{}); ok {
				if code, ok := codeData["code"].(string); ok {
					h.redis.UpdateCode(client.sessionID, code)
				}
			}
			// Broadcast to other clients
			h.broadcastToSession(client.sessionID, wsMsg, client)

		case "language_change":
			// Update language in Redis
			if langData, ok := wsMsg.Data.(map[string]interface{}); ok {
				if language, ok := langData["language"].(string); ok {
					h.redis.UpdateLanguage(client.sessionID, language)
				}
			}
			// Broadcast to other clients
			h.broadcastToSession(client.sessionID, wsMsg, client)

		case "ping":
			// Respond with pong
			response := models.WSMessage{
				Type:      "pong",
				SessionID: client.sessionID,
			}
			if data, err := json.Marshal(response); err == nil {
				client.send <- data
			}
		}
	}
}

func (h *WebSocketHandler) writePump(client *Client) {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		client.conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.send:
			client.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				client.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := client.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages
			n := len(client.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-client.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			client.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := client.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *WebSocketHandler) broadcastToSession(sessionID string, message models.WSMessage, exclude *Client) {
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("JSON marshal error: %v", err)
		return
	}

	h.broadcast <- &BroadcastMessage{
		sessionID: sessionID,
		message:   data,
		exclude:   exclude,
	}
}
