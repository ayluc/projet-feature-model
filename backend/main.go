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
	Id             NodeId       `json:"id"             binding:"required,gte=1"`
	Type           NodeType     `json:"type"           binding:"required,oneof=feature"`
	OperatorType   OperatorType `json:"operatorType"   binding:"omitempty,oneof=or xor cardinalite"`
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
	Type     string `json:"type"   binding:"required,oneof=inclusion exclusion compatibility equivalence difference"`
}

type FeatureModel struct {
	Nodes []Node `json:"nodes" binding:"required,unique=Id,dive"`
	Arcs  []Arc  `json:"arcs"  binding:"required,unique=Id,unique=TargetId,dive"`
	Links []Link `json:"links" binding:"omitempty,unique=Id,dive"`
}

type NodeConfig struct {
	Id     NodeId `json:"id"`
	Status string `json:"status"`
}

type Configuration struct {
	Nodes []NodeConfig
}

// Template pour créer le fichier de configuration MiniZinc
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
	EndpointAssemblage            = "/assemblage"
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

	// Validate-creation
	router.POST(EndpointValidateCreation, func(c *gin.Context) {
		var req FeatureModel
		// Vérification du respect par le JSON fourni des struct définies plus haut
		if err := c.ShouldBindJSON(&req); err != nil {
			c.IndentedJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Création du fichier de données MiniZinc (.dzn) à partir du JSON fourni
		resultDzn := Convert(req)
		if err := os.WriteFile("projet-minizinc/feature-model.dzn", []byte(resultDzn), 0644); err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": "impossible d'écrire feature-model.dzn"})
			return
		}

		// Exécution de la commande MiniZinc pour appeler le solver avec tous les fichiers nécessaires (modèle MiniZinc + données du modèle)
		cmd := exec.Command("minizinc", "--solver", "Gecode", "--output-mode", "json", "projet-minizinc/FM.mzn", "projet-minizinc/feature-model.dzn")
		var outBuf, errBuf bytes.Buffer
		cmd.Stdout = &outBuf
		cmd.Stderr = &errBuf
		_ = cmd.Run()

		// ============================
		// La commande est exécutée une deuxième fois pour pouvoir afficher toutes les erreurs
		// du solver sans le format JSON et ainsi pouvoir débugger plus facilement pendant le développement.
		cmd1 := exec.Command("minizinc", "--solver", "Gecode", "projet-minizinc/FM.mzn", "projet-minizinc/feature-model.dzn")
		var outBuf1, errBuf1 bytes.Buffer
		cmd1.Stdout = &outBuf1
		cmd1.Stderr = &errBuf1
		_ = cmd1.Run()

		fmt.Println(outBuf1.String())
		fmt.Println(errBuf1.String())
		// ============================

		// Cas où c'est UNSAT alors on renvoie que le modèle n'est pas valide au front
		if bytes.Contains(outBuf.Bytes(), []byte("UNSATISFIABLE")) {
			c.IndentedJSON(http.StatusOK, gin.H{
				"valid":     false,
				"nodeCount": len(req.Nodes),
				"arcCount":  len(req.Arcs),
			})
			return
		}

		// Cas où la lecture du JSON de retour du MiniZinc ne fonctionne pas
		jsonBytes, err := extractOptimalSolution(outBuf.Bytes())
		if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{
				"error":  "Erreur MiniZinc ou modèle non compilable",
				"stderr": errBuf.String(),
			})
			return
		}

		// Cas où c'est SAT alors on renvoie que le modèle est valide et la solution trouvée par le solver
		var solution map[string]interface{}
		json.Unmarshal(jsonBytes, &solution)

		c.IndentedJSON(http.StatusOK, gin.H{
			"valid":     true,
			"nodeCount": len(req.Nodes),
			"arcCount":  len(req.Arcs),
			"solution":  solution,
		})
	})

	// Validate-configuration
	router.POST(EndpointValidateConfiguration, func(c *gin.Context) {
		var req Configuration
		// Vérification du respect par le JSON fourni des struct définies plus haut
		if err := c.ShouldBindJSON(&req); err != nil {
			c.IndentedJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Génération de la configuration MiniZinc (via le template), puis écriture dans le fichier configuration.mzn
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

		// Exécution de la commande MiniZinc pour appeler le solver avec tous les fichiers nécessaires (configuration + données du modèle)
		cmd := exec.Command("minizinc", "--solver", "Gecode", "--output-mode", "json", "projet-minizinc/configuration.mzn", "projet-minizinc/feature-model.dzn")
		var outBuf, errBuf bytes.Buffer
		cmd.Stdout = &outBuf
		cmd.Stderr = &errBuf
		_ = cmd.Run()

		// ============================
		// La commande est exécutée une deuxième fois pour pouvoir afficher toutes les erreurs
		// du solver sans le format JSON et ainsi pouvoir débugger plus facilement pendant le développement.
		cmd1 := exec.Command("minizinc", "--solver", "Gecode", "projet-minizinc/configuration.mzn", "projet-minizinc/feature-model.dzn")
		var outBuf1, errBuf1 bytes.Buffer
		cmd1.Stdout = &outBuf1
		cmd1.Stderr = &errBuf1
		_ = cmd1.Run()

		fmt.Println(outBuf1.String())
		fmt.Println(errBuf1.String())
		// ============================

		// Cas où c'est UNSAT alors on renvoie que le modèle n'est pas valide au front
		if bytes.Contains(outBuf.Bytes(), []byte("UNSATISFIABLE")) {
			c.IndentedJSON(http.StatusOK, gin.H{
				"valid": false,
				"nodes": req.Nodes,
			})
			return
		}

		// Cas où la lecture du JSON de retour du MiniZinc ne fonctionne pas
		jsonBytes, err := extractOptimalSolution(outBuf.Bytes())
		if err != nil {
			c.IndentedJSON(http.StatusInternalServerError, gin.H{
				"error":  "Impossible de lire la solution",
				"stderr": errBuf.String(),
			})
			return
		}

		// Cas où c'est SAT alors on renvoie que le modèle est valide et la solution trouvée par le solver
		var solution map[string]interface{}
		json.Unmarshal(jsonBytes, &solution)

		c.IndentedJSON(http.StatusOK, gin.H{
			"valid":    true,
			"nodes":    req.Nodes,
			"solution": solution,
		})
	})

	// Assemblage
	router.POST(EndpointAssemblage, func(c *gin.Context) {
		// TODO
	})

	return router
}

func main() {
	router := SetupRouter()
	router.Run(":8080")
}
