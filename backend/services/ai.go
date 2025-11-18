package services

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type AIService struct {
	apiKey   string
	client   *http.Client
	provider string
}

func NewAIService(apiKey string) *AIService {
	if apiKey == "" {
		fmt.Println("WARNING: API_KEY is not set!")
	}
	
	provider := "anthropic"
	if strings.HasPrefix(apiKey, "gsk_") {
		provider = "groq"
		fmt.Println("Detected Groq API key")
	} else if strings.HasPrefix(apiKey, "sk-ant-") {
		provider = "anthropic"
		fmt.Println("Detected Anthropic API key")
	}
	
	return &AIService{
		apiKey:   apiKey,
		client:   &http.Client{},
		provider: provider,
	}
}

type ClaudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	Messages  []ClaudeMessage `json:"messages"`
	Stream    bool            `json:"stream"`
}

type ClaudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ClaudeResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
}

type GroqRequest struct {
	Model    string         `json:"model"`
	Messages []GroqMessage  `json:"messages"`
	Stream   bool           `json:"stream"`
	MaxTokens int           `json:"max_tokens,omitempty"`
}

type GroqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type GroqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type StreamChunk struct {
	Type  string `json:"type"`
	Delta struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"delta"`
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
	} `json:"choices"`
}

func (a *AIService) AnalyzeCode(code, language string, stream bool) (io.ReadCloser, error) {
	prompt := fmt.Sprintf(`You are a senior code reviewer. Analyze this %s code and provide a clear, well-formatted analysis.

CODE TO ANALYZE:
%s

Provide your analysis in this exact format:

CODE QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Overall assessment of code structure and readability
- Adherence to coding standards and conventions
- Code organization and maintainability

POTENTIAL ISSUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Bugs or logical errors found
- Edge cases not handled
- Potential runtime errors

SECURITY CONCERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Security vulnerabilities or risks
- Input validation issues
- Data exposure concerns

PERFORMANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Performance bottlenecks
- Memory usage concerns
- Optimization opportunities

BEST PRACTICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Recommended improvements
- Industry best practices to follow
- Code patterns to adopt

Keep it concise and actionable. Use bullet points. No markdown headers. Use plain text with unicode box drawing characters for sections.`, language, code)

	return a.sendRequest(prompt, stream)
}

func (a *AIService) SuggestImprovements(code, language string, stream bool) (io.ReadCloser, error) {
	prompt := fmt.Sprintf(`You are a senior code reviewer. Review this %s code and provide specific, actionable improvements.

ORIGINAL CODE:
%s

Provide a comprehensive review in this format:

QUICK SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Brief overview of the code's purpose and current state.

KEY ISSUES FOUND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ Issue 1: [Description]
✗ Issue 2: [Description]
✗ Issue 3: [Description]

RECOMMENDED IMPROVEMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. [Improvement Title]
   Problem: [What's wrong]
   Solution: [How to fix it]
   
   BEFORE:
   [Show original problematic code]
   
   AFTER:
   [Show improved code]

2. [Next Improvement Title]
   Problem: [What's wrong]
   Solution: [How to fix it]
   
   BEFORE:
   [Show original code]
   
   AFTER:
   [Show improved code]

BEST PRACTICES TO ADOPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- [Best practice 1]
- [Best practice 2]
- [Best practice 3]

FINAL REFACTORED CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Provide the complete refactored version incorporating all improvements]

Keep it practical and actionable. Show concrete code examples. No markdown headers. Use plain text with unicode characters for formatting.`, language, code)

	return a.sendRequest(prompt, stream)
}

func (a *AIService) sendRequest(prompt string, stream bool) (io.ReadCloser, error) {
	if a.apiKey == "" {
		return nil, fmt.Errorf("API_KEY is not configured")
	}

	if a.provider == "groq" {
		return a.sendGroqRequest(prompt, stream)
	}
	return a.sendAnthropicRequest(prompt, stream)
}

func (a *AIService) sendGroqRequest(prompt string, stream bool) (io.ReadCloser, error) {
	reqBody := GroqRequest{
		Model: "llama-3.3-70b-versatile",
		Messages: []GroqMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Stream:    stream,
		MaxTokens: 4096,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+a.apiKey)

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	return resp.Body, nil
}

func (a *AIService) sendAnthropicRequest(prompt string, stream bool) (io.ReadCloser, error) {
	reqBody := ClaudeRequest{
		Model:     "claude-3-5-sonnet-20241022",
		MaxTokens: 4096,
		Messages: []ClaudeMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Stream: stream,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", a.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	return resp.Body, nil
}

func (a *AIService) StreamResponse(reader io.ReadCloser, writer io.Writer) error {
	defer reader.Close()

	if a.provider == "groq" {
		return a.streamGroqResponse(reader, writer)
	}
	return a.streamAnthropicResponse(reader, writer)
}

func (a *AIService) streamGroqResponse(reader io.ReadCloser, writer io.Writer) error {
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		line := scanner.Text()
		if len(line) == 0 {
			continue
		}

		if len(line) > 6 && line[:6] == "data: " {
			data := line[6:]
			if data == "[DONE]" {
				break
			}

			var chunk StreamChunk
			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				continue
			}

			if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
				if _, err := writer.Write([]byte(chunk.Choices[0].Delta.Content)); err != nil {
					return err
				}
				if flusher, ok := writer.(http.Flusher); ok {
					flusher.Flush()
				}
			}
		}
	}

	return scanner.Err()
}

func (a *AIService) streamAnthropicResponse(reader io.ReadCloser, writer io.Writer) error {
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		line := scanner.Text()
		if len(line) == 0 {
			continue
		}

		if len(line) > 6 && line[:6] == "data: " {
			data := line[6:]
			if data == "[DONE]" {
				break
			}

			var chunk StreamChunk
			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				continue
			}

			if chunk.Type == "content_block_delta" && chunk.Delta.Text != "" {
				if _, err := writer.Write([]byte(chunk.Delta.Text)); err != nil {
					return err
				}
				if flusher, ok := writer.(http.Flusher); ok {
					flusher.Flush()
				}
			}
		}
	}

	return scanner.Err()
}

func (a *AIService) GetFullResponse(reader io.ReadCloser) (string, error) {
	defer reader.Close()

	body, err := io.ReadAll(reader)
	if err != nil {
		return "", err
	}

	if a.provider == "groq" {
		var response GroqResponse
		if err := json.Unmarshal(body, &response); err != nil {
			return "", err
		}

		if len(response.Choices) > 0 {
			return response.Choices[0].Message.Content, nil
		}
	} else {
		var response ClaudeResponse
		if err := json.Unmarshal(body, &response); err != nil {
			return "", err
		}

		if len(response.Content) > 0 {
			return response.Content[0].Text, nil
		}
	}

	return "", fmt.Errorf("no content in response")
}