package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"

	"codestream/models"
)

type RedisService struct {
	client *redis.Client
	ctx    context.Context
}

func NewRedisService() *RedisService {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	client := redis.NewClient(&redis.Options{
		Addr:     redisURL,
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})

	ctx := context.Background()

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("Failed to connect to Redis: %v", err)
	} else {
		log.Println("Connected to Redis successfully")
	}

	return &RedisService{
		client: client,
		ctx:    ctx,
	}
}

func (r *RedisService) Close() error {
	return r.client.Close()
}

// Session management
func (r *RedisService) CreateSession(session *models.Session) error {
	sessionJSON, err := json.Marshal(session)
	if err != nil {
		return err
	}

	key := fmt.Sprintf("session:%s", session.ID)
	return r.client.Set(r.ctx, key, sessionJSON, 24*time.Hour).Err()
}

func (r *RedisService) GetSession(sessionID string) (*models.Session, error) {
	key := fmt.Sprintf("session:%s", sessionID)
	data, err := r.client.Get(r.ctx, key).Result()
	if err != nil {
		return nil, err
	}

	var session models.Session
	if err := json.Unmarshal([]byte(data), &session); err != nil {
		return nil, err
	}

	return &session, nil
}

func (r *RedisService) UpdateSession(session *models.Session) error {
	sessionJSON, err := json.Marshal(session)
	if err != nil {
		return err
	}

	key := fmt.Sprintf("session:%s", session.ID)
	return r.client.Set(r.ctx, key, sessionJSON, 24*time.Hour).Err()
}

func (r *RedisService) AddUserToSession(sessionID string, user models.User) error {
	session, err := r.GetSession(sessionID)
	if err != nil {
		return err
	}

	// Check if user already in session
	for _, u := range session.Users {
		if u.ID == user.ID {
			return nil
		}
	}

	session.Users = append(session.Users, user)
	return r.UpdateSession(session)
}

func (r *RedisService) RemoveUserFromSession(sessionID, userID string) error {
	session, err := r.GetSession(sessionID)
	if err != nil {
		return err
	}

	users := make([]models.User, 0)
	for _, u := range session.Users {
		if u.ID != userID {
			users = append(users, u)
		}
	}

	session.Users = users
	return r.UpdateSession(session)
}

// Pub/Sub
func (r *RedisService) Publish(channel string, message interface{}) error {
	messageJSON, err := json.Marshal(message)
	if err != nil {
		return err
	}

	return r.client.Publish(r.ctx, channel, messageJSON).Err()
}

func (r *RedisService) Subscribe(channel string) *redis.PubSub {
	return r.client.Subscribe(r.ctx, channel)
}

// Code management
func (r *RedisService) UpdateCode(sessionID, code string) error {
	session, err := r.GetSession(sessionID)
	if err != nil {
		return err
	}

	session.Code = code
	return r.UpdateSession(session)
}

func (r *RedisService) GetCode(sessionID string) (string, error) {
	session, err := r.GetSession(sessionID)
	if err != nil {
		return "", err
	}

	return session.Code, nil
}

func (r *RedisService) UpdateLanguage(sessionID, language string) error {
	session, err := r.GetSession(sessionID)
	if err != nil {
		return err
	}

	session.Language = language
	return r.UpdateSession(session)
}
