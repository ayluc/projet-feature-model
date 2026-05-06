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

	recorder   := httptest.NewRecorder()
	request, _ := http.NewRequest("GET", EndpointPing, nil)
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusOK, recorder.Code)

	// Body must be empty
	_, err := recorder.Body.ReadByte()
	errMsg := fmt.Sprintf("Response body should be empty but actually is:\n %s\n", recorder.Body.String())
	assert.Equal(t, io.EOF, err, errMsg)
}

func TestValidateCreation(t *testing.T) {
	router := SetupRouter()
	const endpoint = EndpointValidateCreation

	payloadsBad := []string{
		"Not json",

		// Wrong type
		`{
			"nodes": [
				{ "id": 1, "type": "bad_type" },
				{ "id": 2, "type": "feature" }
			],
			"edges": [
				{ "id": 1, "source": 1, "target": 2 }
			]
		 }`,

		// Duplicate node id
		`{
			"nodes": [
				{ "id": 1, "type": "feature" },
				{ "id": 2, "type": "feature" },
				{ "id": 2, "type": "feature" }
			],
			"edges": [
				{ "id": 1, "source": 1, "target": 2 }
			]
		 }`,

		// Duplicate Arc id
		`{
			"nodes": [
				{ "id": 1, "type": "feature" },
				{ "id": 2, "type": "feature" },
				{ "id": 3, "type": "feature" }
			],
			"edges": [
				{ "id": 1, "source": 1, "target": 2 }
				{ "id": 1, "source": 3, "target": 2 }
			]
		 }`,
	}

	for i := range payloadsBad {
		recorder   := httptest.NewRecorder()
		request, _ := http.NewRequest("POST", endpoint, strings.NewReader(payloadsBad[i]))
		router.ServeHTTP(recorder, request)

		errMsg := fmt.Sprintf("Case: %d\nPayload:\n%s\nResponse:\n%s\n", i, payloadsBad[i], recorder.Body.String())
		assert.Equal(t, http.StatusBadRequest, recorder.Code, errMsg)
		assertBodyNotEmpty(t, recorder)
	}

	// Nil message
	{
		recorder   := httptest.NewRecorder()
		request, _ := http.NewRequest("POST", endpoint, nil)
		router.ServeHTTP(recorder, request)

		assert.Equal(t, http.StatusBadRequest, recorder.Code)
		assertBodyNotEmpty(t, recorder)
	}

	payloadsOk := []string{
		`{"nodes": [], "edges": []}`,

		`{
			"nodes": [
			  { "id": 1, "type": "feature" },
			  { "id": 2, "type": "or"      },
			  { "id": 3, "type": "xor"     }
			],
			"edges": [
			  { "id": 1, "source": 1, "target": 2 },
			  { "id": 2, "source": 1, "target": 3 }
			]
		 }`,
	}

	for i := range payloadsOk {
		recorder   := httptest.NewRecorder()
		request, _ := http.NewRequest("POST", endpoint, strings.NewReader(payloadsOk[i]))
		router.ServeHTTP(recorder, request)

		errMsg := fmt.Sprintf("Case: %d\nPayload:\n%s\nResponse:\n%s\n", i, payloadsOk[i], recorder.Body.String())
		assert.Equal(t, http.StatusOK, recorder.Code, errMsg)
		assertBodyNotEmpty(t, recorder)
	}

	// --- Test save file
	// TODO: Implement it
}

func assertBodyNotEmpty(t *testing.T, w *httptest.ResponseRecorder) {
	_, err := w.Body.ReadByte()
	assert.NotEqual(t, io.EOF, err, "Response body should not be empty")
}
