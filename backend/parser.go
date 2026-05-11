package main

import (
	"fmt"
	"sort"
	"strings"
)

// ── Conversion FeatureModel → format cible ───────────────────────────────────
func isOperator(t NodeType) bool {
	return t == NodeTypeOr || t == NodeTypeXor || t == NodeTypeCardinality
}

func Convert(fm FeatureModel) string {
	// 1. Plage des IDs (tous les noeuds)
	minID, maxID := int(fm.Nodes[0].Id), int(fm.Nodes[0].Id)
	for _, n := range fm.Nodes {
		id := int(n.Id)
		if id < minID {
			minID = id
		}
		if id > maxID {
			maxID = id
		}
	}

	// 2. Map id → Node pour accès rapide
	nodeById := make(map[int]Node, len(fm.Nodes))
	for _, n := range fm.Nodes {
		nodeById[int(n.Id)] = n
	}

	// 3. Construction des maps depuis les arcs
	children      := make(map[int][]int)
	mandatorySet  := make(map[int]bool)
	incompatibles := make(map[int][]int)
	dependents    := make(map[int][]int)
	parentOf      := make(map[int]int)   // enfant → parent (pour trouver la racine)
	mandatoryChildCount := make(map[int]int) // parent → nb d'enfants obligatoires

	for _, n := range fm.Nodes {
		children[int(n.Id)]      = []int{}
		incompatibles[int(n.Id)] = []int{}
		dependents[int(n.Id)]    = []int{}
	}

	// Arcs hiérarchiques (mandatory / optional)
	for _, a := range fm.Arcs {
		children[a.SourceId] = append(children[a.SourceId], a.TargetId)
		parentOf[a.TargetId] = a.SourceId
		if a.Type == "mandatory" {
			mandatorySet[a.TargetId] = true
			mandatoryChildCount[a.SourceId]++
		}
	}

	// Trouver la racine : le nœud qui n'est l'enfant d'aucun autre
	for _, n := range fm.Nodes {
		id := int(n.Id)
		if _, hasParent := parentOf[id]; !hasParent {
			mandatorySet[id] = true // FIX 1 : la racine est mandatory
		}
	}

	// Arcs transversaux (dependancy / exclusion)
	for _, l := range fm.Links {
		if l.Type == "exclusion" {
			incompatibles[l.SourceId] = append(incompatibles[l.SourceId], l.TargetId)
			incompatibles[l.TargetId] = append(incompatibles[l.TargetId], l.SourceId) // FIX 3 : symétrie
		}
		if l.Type == "dependancy" {
			dependents[l.SourceId] = append(dependents[l.SourceId], l.TargetId)
		}
	}

	for id := range children {
		sort.Ints(children[id])
		sort.Ints(incompatibles[id])
		sort.Ints(dependents[id])
	}

	// 4. IDs triés
	ids := make([]int, 0, len(fm.Nodes))
	for _, n := range fm.Nodes {
		ids = append(ids, int(n.Id))
	}
	sort.Ints(ids)

	// Helper : formate une map[int][]int en liste de {x,y} ou {}
	formatList := func(m map[int][]int) string {
		parts := make([]string, 0, len(ids))
		for _, id := range ids {
			vals := m[id]
			if len(vals) == 0 {
				parts = append(parts, "{}")
			} else {
				strs := make([]string, len(vals))
				for i, v := range vals {
					strs[i] = fmt.Sprintf("%d", v)
				}
				parts = append(parts, "{"+strings.Join(strs, ",")+"}")
			}
		}
		return strings.Join(parts, ",")
	}

	// 5. mandatory
	mandatoryParts := make([]string, 0, len(ids))
	for _, id := range ids {
		if mandatorySet[id] {
			mandatoryParts = append(mandatoryParts, "1")
		} else {
			mandatoryParts = append(mandatoryParts, "0")
		}
	}

	// 6. min_children / max_children
	minChildrenParts := make([]string, 0, len(ids))
	maxChildrenParts := make([]string, 0, len(ids))
	for _, id := range ids {
		n := nodeById[id]
		kids := children[id]
		var minC, maxC int

		switch n.OperatorType {
		case OperatorTypeXor:
			minC = 1
			maxC = 1
		case OperatorTypeOr:
			minC = 0
			maxC = len(kids)
		case OperatorTypeCardinality:
			minC = n.CardinalityMin
			maxC = n.CardinalityMax
		default: // feature sans opérateur
			minC = mandatoryChildCount[id]
			maxC = len(kids)
		}

		minChildrenParts = append(minChildrenParts, fmt.Sprintf("%d", minC))
		maxChildrenParts = append(maxChildrenParts, fmt.Sprintf("%d", maxC))
	}

	return fmt.Sprintf("FEATURE= %d..%d;\n", minID, maxID) +
		fmt.Sprintf("children= [%s];\n", formatList(children)) +
		fmt.Sprintf("mandatory= [%s];\n", strings.Join(mandatoryParts, ",")) +
		fmt.Sprintf("dependents= [%s];\n", formatList(dependents)) +
		fmt.Sprintf("incompatibles= [%s];\n", formatList(incompatibles)) +
		fmt.Sprintf("min_children= [%s];\n", strings.Join(minChildrenParts, ",")) +
		fmt.Sprintf("max_children= [%s];\n", strings.Join(maxChildrenParts, ","))
}