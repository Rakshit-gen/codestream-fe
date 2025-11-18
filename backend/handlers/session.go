package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"codestream/models"
	"codestream/services"
)

type SessionHandler struct {
	redis *services.RedisService
}

func NewSessionHandler(redis *services.RedisService) *SessionHandler {
	return &SessionHandler{
		redis: redis,
	}
}

type CreateSessionRequest struct {
	Language string `json:"language"`
	Code     string `json:"code"`
}

type CreateSessionResponse struct {
	Session models.Session `json:"session"`
}

func (h *SessionHandler) CreateSession(w http.ResponseWriter, r *http.Request) {
	var req CreateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Language == "" {
		req.Language = "javascript"
	}

	session := &models.Session{
		ID:        uuid.New().String(),
		Code:      req.Code,
		Language:  req.Language,
		CreatedAt: time.Now(),
		Users:     []models.User{},
	}

	if err := h.redis.CreateSession(session); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CreateSessionResponse{
		Session: *session,
	})
}

func (h *SessionHandler) GetSession(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	if sessionID == "" {
		http.Error(w, "session ID required", http.StatusBadRequest)
		return
	}

	session, err := h.redis.GetSession(sessionID)
	if err != nil {
		http.Error(w, "session not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

type JoinSessionRequest struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	Email    string `json:"email"`
	Color    string `json:"color"`
	ImageURL string `json:"image_url"`
}

func (h *SessionHandler) JoinSession(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	if sessionID == "" {
		http.Error(w, "session ID required", http.StatusBadRequest)
		return
	}

	var req JoinSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	session, err := h.redis.GetSession(sessionID)
	if err != nil {
		http.Error(w, "session not found", http.StatusNotFound)
		return
	}

	user := models.User{
		ID:       req.UserID,
		Name:     req.UserName,
		Email:    req.Email,
		Color:    req.Color,
		ImageURL: req.ImageURL,
	}

	if err := h.redis.AddUserToSession(sessionID, user); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}
