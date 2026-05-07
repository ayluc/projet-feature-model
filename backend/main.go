package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/Malomalsky/go-minizinc"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type NodeType string

const (
	NodeTypeCardinality NodeType = "cardinalite"
	NodeTypeFeature     NodeType = "feature"
	NodeTypeXor         NodeType = "xor"
	NodeTypeOr          NodeType = "or"
)

type NodeId int

type Node struct {
	Id   NodeId        `json:"id"             binding:"required,gte=1"`
	Type NodeType      `json:"type"           binding:"required,oneof=cardinalite feature xor or"`
	CardinalityMin int `json:"cardinaliteMin" binding:"required_if=type cardinalite,gte=0"`
	CandinalityMax int `json:"cardinaliteMax" binding:"required_if=type cardinalite,gtefield=CardinalityMin"`
}

type ArcId int

type Arc struct {
	Id       ArcId `json:"id"     binding:"required,gte=1"`
	SourceId int   `json:"source" binding:"required,gte=1"`
	TargetId int   `json:"target" binding:"required,gte=1"`
}

type FeatureModel struct {
	Nodes []Node `json:"nodes" binding:"required,unique=Id,dive"`
	Arcs  []Arc  `json:"edges" binding:"required,unique=Id,unique=TargetId,dive"`
}

const (
	EndpointPing             = "/ping"
	EndpointValidateCreation = "/validate-creation"
)

func SetupRouter() *gin.Engine {
	router := gin.Default()

	router.Use(cors.Default())

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
