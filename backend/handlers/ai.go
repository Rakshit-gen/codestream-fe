package handlers

import (
	"encoding/json"
	"net/http"

	"codestream/models"
	"codestream/services"
)

type AIHandler struct {
	ai *services.AIService
}

func NewAIHandler(ai *services.AIService) *AIHandler {
	return &AIHandler{
		ai: ai,
	}
}

func (h *AIHandler) AnalyzeCode(w http.ResponseWriter, r *http.Request) {
	var req models.AIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Code == "" {
		http.Error(w, "code is required", http.StatusBadRequest)
		return
	}

	if req.Language == "" {
		req.Language = "javascript"
	}

	// Set headers for streaming
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	reader, err := h.ai.AnalyzeCode(req.Code, req.Language, true)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := h.ai.StreamResponse(reader, w); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (h *AIHandler) SuggestImprovements(w http.ResponseWriter, r *http.Request) {
	var req models.AIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Code == "" {
		http.Error(w, "code is required", http.StatusBadRequest)
		return
	}

	if req.Language == "" {
		req.Language = "javascript"
	}

	// Set headers for streaming
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	reader, err := h.ai.SuggestImprovements(req.Code, req.Language, true)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := h.ai.StreamResponse(reader, w); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}