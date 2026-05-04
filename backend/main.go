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

type ValidateRequest struct {
	Nodes []Node `json:"nodes"`
	Arcs  []Arc  `json:"arcs"`
}

func main() {
	router := gin.Default()

	// For the library to find the solver a minizinc solver config file must
	// be created at ~/.minizinc/solvers/<your_solver_config>.msc
	// XDG standard is not supported :(
	solver, err := minizinc.FindSolver("Gecode")
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Solver loaded: %s\n", solver.Name)

	router.POST("/validate", func(c *gin.Context) {
		var req ValidateRequest
		err := c.ShouldBindJSON(&req)
		if err != nil {
			c.IndentedJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// TODO: validate the feature model using the solver

		c.IndentedJSON(http.StatusOK, gin.H{
			"valid":     true,
			"nodeCount": len(req.Nodes),
			"arcCount":  len(req.Arcs),
		})
	})

	router.Run("localhost:8080")
}
