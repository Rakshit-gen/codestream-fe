package models

import "time"

type Session struct {
	ID        string    `json:"id"`
	Code      string    `json:"code"`
	Language  string    `json:"language"`
	CreatedAt time.Time `json:"created_at"`
	Users     []User    `json:"users"`
}

type User struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Color    string `json:"color"`
	ImageURL string `json:"image_url"`
}

type WSMessage struct {
	Type      string      `json:"type"`
	SessionID string      `json:"session_id"`
	UserID    string      `json:"user_id"`
	User      *User       `json:"user,omitempty"`
	Data      interface{} `json:"data,omitempty"`
}

type CursorPosition struct {
	Line   int    `json:"line"`
	Column int    `json:"column"`
	UserID string `json:"user_id"`
}

type CodeChange struct {
	Code      string `json:"code"`
	UserID    string `json:"user_id"`
	Timestamp int64  `json:"timestamp"`
}

type AIRequest struct {
	Code     string `json:"code"`
	Language string `json:"language"`
	Prompt   string `json:"prompt,omitempty"`
}

type AIResponse struct {
	Analysis string `json:"analysis"`
	Stream   bool   `json:"stream"`
}
