package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"codestream/handlers"
	"codestream/services"
)

func main() {
	godotenv.Load()

	redisService := services.NewRedisService()
	defer redisService.Close()

	aiService := services.NewAIService(os.Getenv("ANTHROPIC_API_KEY"))

	wsHandler := handlers.NewWebSocketHandler(redisService)
	sessionHandler := handlers.NewSessionHandler(redisService)
	aiHandler := handlers.NewAIHandler(aiService)
	codeRunnerHandler := handlers.NewCodeRunnerHandler()

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:3001"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/ws", wsHandler.HandleWebSocket)

	r.Route("/api", func(r chi.Router) {
		r.Post("/sessions", sessionHandler.CreateSession)
		r.Get("/sessions/{id}", sessionHandler.GetSession)
		r.Post("/sessions/{id}/join", sessionHandler.JoinSession)

		r.Post("/analyze", aiHandler.AnalyzeCode)
		r.Post("/suggest", aiHandler.SuggestImprovements)
		
		r.Post("/run", codeRunnerHandler.RunCode)
	})

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}