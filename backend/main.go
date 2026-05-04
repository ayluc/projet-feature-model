package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/Malomalsky/go-minizinc"
	"github.com/gin-gonic/gin"
)

type Position struct {
	x, y int
}

type Node struct {
	Id       string   `json:"id"`
	Type     string   `json:"type"`
	Data     string   `json:"label"`
	Position Position `json:"position"`
}

type Arc struct {
	Id       string `json:"id"`
	SourceId string `json:"source"`
	TargetId string `json:"target"`
}

func main() {
	router := gin.Default()

	router.POST("/validate", func (c *gin.Context) {
		c.IndentedJSON(http.StatusBadRequest, nil)
	})

	router.Run("localhost:8080")

	solver, err := minizinc.FindSolver("or-tools")
	if (err != nil) {
		log.Fatal(err)
	}

	fmt.Printf("%s\n", solver.Description)

	fmt.Printf("Hello world!")
}
