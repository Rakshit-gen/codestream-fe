package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"time"
)

type CodeRunnerHandler struct{}

func NewCodeRunnerHandler() *CodeRunnerHandler {
	return &CodeRunnerHandler{}
}

type RunCodeRequest struct {
	Code     string `json:"code"`
	Language string `json:"language"`
	Input    string `json:"input"`
}

type RunCodeResponse struct {
	Output string `json:"output"`
	Error  string `json:"error"`
	Time   string `json:"time"`
}

func (h *CodeRunnerHandler) RunCode(w http.ResponseWriter, r *http.Request) {
	var req RunCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Code == "" {
		http.Error(w, "code is required", http.StatusBadRequest)
		return
	}

	start := time.Now()
	output, errMsg := h.executeCode(req.Code, req.Language, req.Input)
	elapsed := time.Since(start)

	response := RunCodeResponse{
		Output: output,
		Error:  errMsg,
		Time:   elapsed.String(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *CodeRunnerHandler) executeCode(code, language, input string) (string, string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var cmd *exec.Cmd
	var stdout, stderr bytes.Buffer

	switch language {
	case "javascript", "typescript":
		cmd = exec.CommandContext(ctx, "node", "-e", code)
	case "python":
		cmd = exec.CommandContext(ctx, "python3", "-c", code)
	case "go":
		return "", "Go execution requires compilation. Use a Go playground instead."
	case "bash", "shell":
		cmd = exec.CommandContext(ctx, "bash", "-c", code)
	case "ruby":
		cmd = exec.CommandContext(ctx, "ruby", "-e", code)
	case "php":
		cmd = exec.CommandContext(ctx, "php", "-r", code)
	case "java":
		return "", "Java execution requires compilation. Please use an online Java compiler."
	case "c", "cpp":
		return "", "C/C++ execution requires compilation. Please use an online compiler."
	default:
		return "", fmt.Sprintf("Language '%s' is not supported for execution", language)
	}

	if input != "" {
		cmd.Stdin = bytes.NewBufferString(input)
	}

	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	
	output := stdout.String()
	errorMsg := stderr.String()

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return output, "Execution timeout (10 seconds)"
		}
		if errorMsg == "" {
			errorMsg = err.Error()
		}
	}

	return output, errorMsg
}