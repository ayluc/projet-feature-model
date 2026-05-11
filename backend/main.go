package main

import (
	"fmt"
	"html/template"

	//"log"
	"encoding/json"
	"net/http"
	"os"

	// "github.com/Malomalsky/go-minizinc"
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

type OperatorType string

const (
    OperatorTypeOr          OperatorType = "or"
    OperatorTypeXor         OperatorType = "xor"
    OperatorTypeCardinality OperatorType = "cardinalite"
)

type Node struct {
    Id             NodeId       `json:"id"           binding:"required,gte=1"`
    Type           NodeType     `json:"type"         binding:"required,oneof=feature"`
    OperatorType   OperatorType `json:"operatorType" binding:"omitempty,oneof=or xor cardinalite"`
    CardinalityMin int          `json:"cardinaliteMin" binding:"omitempty,gte=0"`
    CardinalityMax int          `json:"cardinaliteMax" binding:"omitempty"`
}

type ArcId int

type Arc struct {
	Id       ArcId  `json:"id"     binding:"required,gte=1"`
	SourceId int    `json:"source" binding:"required,gte=1"`
	TargetId int    `json:"target" binding:"required,gte=1"`
	Type     string `json:"type"   binding:"required,oneof=mandatory optional"`
}

type Link struct {
    Id       ArcId  `json:"id"     binding:"required,gte=1"`
    SourceId int    `json:"source" binding:"required,gte=1"`
    TargetId int    `json:"target" binding:"required,gte=1"`
    Type     string `json:"type"   binding:"required,oneof=dependancy exclusion"`
}

type FeatureModel struct {
	Nodes []Node `json:"nodes" binding:"required,unique=Id,dive"`
	Arcs  []Arc  `json:"arcs" binding:"required,unique=Id,unique=TargetId,dive"`
	Links []Link `json:"links" binding:"omitempty,unique=Id,dive"`
}

type NodeConfig struct {
	Id     NodeId `json:"id"`
	Status string `json:"status"`
}

type Configuration struct {
	Nodes []NodeConfig
}

const minizincTemplate = `
include "FM.mzn";
{{ range .Nodes }}
{{ if ne .Status "" }}
constraint x[{{ .Id }}] == true;
constraint y[{{ .Id }}] == {{ if eq .Status "included" }}true{{ else }}false{{ end }};
{{ end }}
{{ end }}
`

const (
	EndpointPing                  = "/ping"
	EndpointValidateCreation      = "/validate-creation"
	EndpointValidateConfiguration = "/validate-configuration"
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

		result := Convert(req)
		fmt.Println(result) // log terminal

		if err := os.WriteFile("projet-minizinc/feature-model.dzn", []byte(result), 0644); err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": "impossible d'écrire feature-model.dzn: " + err.Error()})
			return
		}

		// TODO: validate the feature model using the solver
		c.IndentedJSON(http.StatusOK, gin.H{
			"valid":     true,
			"nodeCount": len(req.Nodes),
			"arcCount":  len(req.Arcs),
		})
	})

	router.POST(EndpointValidateConfiguration, func(c *gin.Context) {
		var req Configuration
		err := c.ShouldBindJSON(&req)

		if err != nil {
			c.IndentedJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		tmpl, err := template.New("mzn").Parse(minizincTemplate)
		if err != nil {
			c.IndentedJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		file, err := os.Create("projet-minizinc/configuration.mzn")
		if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la création du fichier"})
			return
		}

		defer file.Close()

		err = tmpl.Execute(file, req)
		if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.IndentedJSON(http.StatusOK, gin.H{
			"valid": true,
			"nodes": req.Nodes,
		})
	})

	return router
}

// func main() {
// 	// For the library to find the solver a minizinc solver config file must
// 	// be created at ~/.minizinc/solvers/<your_solver_config>.msc
// 	// XDG standard is not supported :(
// 	solver, err := minizinc.FindSolver("Gecode")
// 	if err != nil {
// 		log.Fatal(err)
// 	}

// 	fmt.Printf("Solver loaded: %s\n", solver.Name)

// 	router := SetupRouter()
// 	// TODO: Read the url from the CLI
// 	router.Run("localhost:8080")
// }

func main() {

	router := SetupRouter()
	// TODO: Read the url from the CLI
	router.Run("localhost:8080")
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: graphparser <input.json> [output.txt]")
		os.Exit(1)
	}

	data, err := os.ReadFile(os.Args[1])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Lecture impossible : %v\n", err)
		os.Exit(1)
	}

	var fm FeatureModel
	if err := json.Unmarshal(data, &fm); err != nil {
		fmt.Fprintf(os.Stderr, "JSON invalide : %v\n", err)
		os.Exit(1)
	}

	result := Convert(fm)

	if len(os.Args) >= 3 {
		if err := os.WriteFile(os.Args[2], []byte(result), 0644); err != nil {
			fmt.Fprintf(os.Stderr, "Écriture impossible : %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("Fichier généré : %s\n", os.Args[2])
	} else {
		fmt.Print(result)
	}
}
