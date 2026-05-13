package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"os/exec"

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
constraint isActivated[{{ .Id }}] == true;
constraint isIncluded[{{ .Id }}] == {{ if eq .Status "included" }}true{{ else }}false{{ end }};
{{ end }}
{{ end }}
`

const (
	EndpointPing                  = "/ping"
	EndpointValidateCreation      = "/validate-creation"
	EndpointValidateConfiguration = "/validate-configuration"
)

func extractOptimalSolution(output []byte) ([]byte, error) {
	end := bytes.LastIndex(output, []byte("}"))
	if end == -1 {
		return nil, fmt.Errorf("aucun objet JSON trouvé")
	}
	start := bytes.LastIndex(output[:end], []byte("{"))
	if start == -1 {
		return nil, fmt.Errorf("JSON malformé")
	}
	return output[start : end+1], nil
}

func SetupRouter() *gin.Engine {
	router := gin.Default()
	router.Use(cors.Default())

	router.GET(EndpointPing, func(c *gin.Context) {
		c.Data(http.StatusOK, "text/plain", nil)
	})

	router.POST(EndpointValidateCreation, func(c *gin.Context) {
		var req FeatureModel
		if err := c.ShouldBindJSON(&req); err != nil {
			c.IndentedJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		resultDzn := Convert(req)
		if err := os.WriteFile("projet-minizinc/feature-model.dzn", []byte(resultDzn), 0644); err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": "impossible d'écrire feature-model.dzn"})
			return
		}

		cmd := exec.Command("minizinc", "--solver", "Gecode", "--output-mode", "json", "projet-minizinc/FM.mzn", "projet-minizinc/feature-model.dzn")
		var outBuf, errBuf bytes.Buffer
		cmd.Stdout = &outBuf
		cmd.Stderr = &errBuf
		_ = cmd.Run()

		if bytes.Contains(outBuf.Bytes(), []byte("UNSATISFIABLE")) {
			c.IndentedJSON(http.StatusOK, gin.H{
				"valid":     false,
				"nodeCount": len(req.Nodes),
				"arcCount":  len(req.Arcs),
			})
			return
		}

		jsonBytes, err := extractOptimalSolution(outBuf.Bytes())
		if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{
				"error":  "Erreur MiniZinc ou modèle non compilable",
				"stderr": errBuf.String(),
			})
			return
		}

		var solution map[string]interface{}
		json.Unmarshal(jsonBytes, &solution)

		c.IndentedJSON(http.StatusOK, gin.H{
			"valid":     true,
			"nodeCount": len(req.Nodes),
			"arcCount":  len(req.Arcs),
			"solution":  solution,
		})
	})

	router.POST(EndpointValidateConfiguration, func(c *gin.Context) {
		var req Configuration
		if err := c.ShouldBindJSON(&req); err != nil {
			c.IndentedJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		tmpl, err := template.New("mzn").Parse(minizincTemplate)
		if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		file, err := os.Create("projet-minizinc/configuration.mzn")
		if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": "Erreur création fichier"})
			return
		}
		err = tmpl.Execute(file, req)
		file.Close()
		if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		cmd := exec.Command("minizinc", "--solver", "Gecode", "--output-mode", "json", "projet-minizinc/configuration.mzn", "projet-minizinc/feature-model.dzn")
		var outBuf, errBuf bytes.Buffer
		cmd.Stdout = &outBuf
		cmd.Stderr = &errBuf
		_ = cmd.Run()

		cmd1 := exec.Command("minizinc", "--solver", "Gecode", "projet-minizinc/configuration.mzn", "projet-minizinc/feature-model.dzn")
		var outBuf1, errBuf1 bytes.Buffer
		cmd1.Stdout = &outBuf1
		cmd1.Stderr = &errBuf1
		_ = cmd1.Run()

		if bytes.Contains(outBuf.Bytes(), []byte("UNSATISFIABLE")) {
			c.IndentedJSON(http.StatusOK, gin.H{
				"valid": false,
				"nodes": req.Nodes,
			})
			fmt.Println("UNSAT")
			return
		}
		fmt.Println(outBuf1.String())

		jsonBytes, err := extractOptimalSolution(outBuf.Bytes())
		if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{
				"error":  "Impossible de lire la solution",
				"stderr": errBuf.String(),
			})
			return
		}

		var solution map[string]interface{}
		json.Unmarshal(jsonBytes, &solution)

		c.IndentedJSON(http.StatusOK, gin.H{
			"valid":    true,
			"nodes":    req.Nodes,
			"solution": solution,
		})
	})

	return router
}

func main() {
	router := SetupRouter()
	router.Run("localhost:8080")
}
