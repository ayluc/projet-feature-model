package main

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	os.Exit(m.Run())
}

func TestPing(t *testing.T) {
	router := SetupRouter()

	w := httptest.NewRecorder()

	req, _ := http.NewRequest("GET", EndpointPing, nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assertBodyEmpty(t, w)
}

func TestValidateCreation(t *testing.T) {
	router := SetupRouter()
	const endpoint = EndpointValidateCreation

	// --- Something that isn't JSON

	recorder := httptest.NewRecorder()
	request, _ := http.NewRequest("POST", endpoint, strings.NewReader("Not json"))
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	assertBodyNotEmpty(t, recorder)

	// --- Missing body

	recorder = httptest.NewRecorder()
	request, _ = http.NewRequest("POST", endpoint, nil)
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	assertBodyNotEmpty(t, recorder)

	// --- Empty model

	recorder = httptest.NewRecorder()
	request, _ = http.NewRequest("POST", endpoint, strings.NewReader(`{"nodes": [], "edges": []}`))
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	// TODO: Check body

	// --- Dummy model:

	recorder = httptest.NewRecorder()

	modelDummy := `
	  {
		"nodes": [
		  { "id": "1", "type": "feature" },
		  { "id": "2", "type": "or"      },
		  { "id": "3", "type": "xor"     }
		],
		"edges": [
		  { "id": "a1", "source": "1", "target": "2" },
		  { "id": "a2", "source": "1", "target": "3" }
		]
	  }
	`
	request, _ = http.NewRequest("POST", endpoint, strings.NewReader(modelDummy))
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	// TODO: Check body

	// --- Incorrect data

	recorder = httptest.NewRecorder()

	modelIncorrect := `
	{
		"nodes": [
			{ "id": "1", "type": "bad_type" },
			{ "id": "2", "type": "feature" }
		],
		"edges": [
			{ "id": "a1", "source": "1", "target": "2" }
		]
	}
	`
	request, _ = http.NewRequest("POST", endpoint, strings.NewReader(modelIncorrect))
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	// TODO: Check body

	// --- Save file
	// TODO: Implement it
}

func assertBodyNotEmpty(t *testing.T, w *httptest.ResponseRecorder) {
	_, err := w.Body.ReadByte()
	assert.NotEqual(t, io.EOF, err, "Response body should not be empty")
}

func assertBodyEmpty(t *testing.T, w *httptest.ResponseRecorder) {
	_, err := w.Body.ReadByte()
	errMsg := fmt.Sprintf("Response body should be empty but actually is:\n %s\n", w.Body.String())
	assert.Equal(t, io.EOF, err, errMsg)
}
