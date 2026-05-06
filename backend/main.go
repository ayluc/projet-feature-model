package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/Malomalsky/go-minizinc"
	"github.com/gin-gonic/gin"
)

type NodeType string
const (
	NodeTypeCardinality NodeType = "combinaison"
	NodeTypeFeature     NodeType = "feature"
	NodeTypeXor         NodeType = "xor"
	NodeTypeOr          NodeType = "or"
)

type Node struct {
	Id   int      `json:"id"   binding:"required"`
	Type NodeType `json:"type" binding:"required,oneof=combinaison feature xor or"`
}

type Arc struct {
	Id       int `json:"id"     binding:"required"`
	SourceId int `json:"source" binding:"required"`
	TargetId int `json:"target" binding:"required"`
}

type FeatureModel struct {
	Nodes []Node `json:"nodes" binding:"required,unique=Id,dive"`
	Arcs  []Arc  `json:"edges" binding:"required,unique=Id,dive"`
}

const (
	EndpointPing = "/ping"
	EndpointValidateCreation = "/validate-creation"
)

func SetupRouter() *gin.Engine {
	router := gin.Default()

	router.GET(EndpointPing, func(c *gin.Context) {
		c.Data(http.StatusOK, "text/plain", nil)
	})

	router.POST(EndpointValidateCreation, func(c *gin.Context) {
		var req FeatureModel
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

	return router
}

func main() {
	// For the library to find the solver a minizinc solver config file must
	// be created at ~/.minizinc/solvers/<your_solver_config>.msc
	// XDG standard is not supported :(
	solver, err := minizinc.FindSolver("Gecode")
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Solver loaded: %s\n", solver.Name)

	router := SetupRouter()

	// TODO: Read the url from the CLI
	router.Run("localhost:8080")
}
